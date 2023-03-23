import { EngraftPromise, hookRunTool, references, ToolOutput, ToolProgram, ToolResult, Var, VarBindings } from "@engraft/core";
import { hookDedupe, hookFork, hookMemo, hooks, hookSharedIncr, memoizeForever } from "@engraft/incr";
import { arrEqWithRefEq, objEqWith, objEqWithRefEq, recordEqWith, setEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { difference, intersection, union } from "@engraft/shared/lib/sets.js";
import _ from "lodash";
import { toposort } from "./toposort.js";

// This is a helper which runs a network of interdependent cells, such as you
// might find in a notebook.

export type CellNetworkProps = {
  cells: Cell[],
  varBindings: VarBindings,
  prevVarId?: string,
}

export type Cell = {
  var_: Var,
  program: ToolProgram,
}

export const cellNetwork = hooks((props: CellNetworkProps) => {
  const { cells, varBindings, prevVarId } = props;

  const cellIds = hookMemo(() =>
    new Set(cells.map(cell => cell.var_.id)
  ), [cells]);
  const interCellReferencesByCell = hookDedupe(hookMemo(() =>
    hookFork((branch) =>
      Object.fromEntries(cells.map((cell) => branch(cell.var_.id, () => {
        return hookMemo(() => {
          return [cell.var_.id, intersection(references(cell.program), cellIds)] as const;
        }, [cell.program, cell.var_.id, cellIds]);
      })))
    )
  , [cellIds, cells]), objEqWith(setEqWithRefEq));
  const { sorted, cyclic } = hookDedupe(hookMemo(() => {
    return toposort([...cellIds], interCellReferencesByCell);
  }, [interCellReferencesByCell, cellIds]), recordEqWith({sorted: arrEqWithRefEq, cyclic: setEqWithRefEq<string>}));

  // Make a little placeholder for every cell which will be used when a cell doesn't refer to it yet
  // TODO: this is kinda a "possibleVarBindings" thing; idk how it should really work.

  const makePlaceholder = hookSharedIncr(memoizeForever((var_: Var) => {
    return {var_, outputP: EngraftPromise.reject<ToolOutput>(new Error("just a placeholder"))};
  }));

  const cellOutputPlaceholderVarBindings: VarBindings = hookMemo(() =>
    Object.fromEntries(cells.map(cell => [cell.var_.id, makePlaceholder(cell.var_)])
  ), [cells, makePlaceholder]);

  // hookLogChanges({cellIds, interCellReferencesByCell, sorted, cyclic, cellOutputPlaceholderVarBindings}, 'notebook');

  const cellResults = hookMemo(() => {
    // The plan: Loop through cells in sorted order. Build up a set of output promises.
    let cellResults: {[cellId: string]: ToolResult} = {};

    hookFork((branch) => {
      sorted.forEach((cellId) => branch(cellId, () => {
        // The bindings for this cell will consist of:
        //  * varBindings (into the notebook from above)
        //  * actual output var bindings (for references)
        //  * placeholder output var bindings (for other cells)
        //  * `prev`

        // TODO: oh, one reason for a "possibleVarBindings" thing is to prevent churn when
        // irrelevant vars change... or should that be a tool's responsibility, hookRelevantVars
        // style? except tools still need to pass down possibleVarBindings to their children, right?
        // idk man.

        const i = cells.findIndex(cell => cell.var_.id === cellId);
        const cell = cells[i];
        const interCellReferences = interCellReferencesByCell[cellId];

        const actualVarBindings: VarBindings = hookDedupe(
          _.mapValues(_.pick(cellResults, [...interCellReferences]), ({outputP}, cellId) => ({var_: cells.find((cell) => cell.var_.id === cellId)!.var_, outputP}))
        , objEqWith(objEqWithRefEq));

        const placeholderVarBindings: VarBindings = hookDedupe(hookMemo(() =>
          _.omit(cellOutputPlaceholderVarBindings, [...interCellReferences, cell.var_.id])
        , [cell.var_.id, cellOutputPlaceholderVarBindings, interCellReferences]), objEqWithRefEq);

        const prevVarBindings = hookFork((branch) => {
          if (prevVarId !== undefined && i > 0) {
            return branch('yes', () => {
              const prevCell = cells[i - 1];

              const prevVar = hookMemo(() => (
                {
                  id: prevVarId,
                  label: `<span style="font-style: normal">↑</span> ${prevCell.var_.label || "[no label]"}`,
                  autoCompleteLabel: '↑ prev'
                }
              ), [prevCell.var_.label, prevVarId]);

              const outputP = hookMemo(() => (
                references(cell.program).has(prevVarId)
                ? cellResults[prevCell.var_.id].outputP
                : cellOutputPlaceholderVarBindings[prevCell.var_.id].outputP
              ), [cell.program, cellOutputPlaceholderVarBindings, cellResults, prevCell.var_.id, prevVarId]);

              return hookMemo(() => (
                {
                  [prevVarId]: {
                    var_: prevVar,
                    outputP
                  }
                }
              ), [outputP, prevVar, prevVarId]);
            });
          } else {
            return branch('no', () => {
              return hookMemo(() => ({}), []);
            });
          }
        });

        const cellVarBindings = hookMemo(() => ({
          ...varBindings,
          ...actualVarBindings,
          ...placeholderVarBindings,
          ...prevVarBindings,
        }), [varBindings, actualVarBindings, placeholderVarBindings, prevVarBindings]);

        const { outputP, view } = hookRunTool({
          program: cell.program,
          varBindings: cellVarBindings,
        });

        cellResults[cellId] = {
          outputP: cyclic.has(cell.var_.id)
            ? EngraftPromise.reject(new Error("cyclic"))
            : outputP,
          view,
        }
      }));
    });

    return cellResults;
  }, [sorted, cells, interCellReferencesByCell, cellOutputPlaceholderVarBindings, varBindings, cyclic, prevVarId]);

  return cellResults;
});

export const cellNetworkReferences = (cells: Cell[], prevVarId?: string) =>
  difference(
    union(...Object.values(cells).map(cell => references(cell.program))),
    union(Object.keys(cells), prevVarId ? [prevVarId] : [])
  );
