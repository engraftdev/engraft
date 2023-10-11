import { EngraftPromise, ReferenceCollection, ToolOutput, ToolProgram, ToolResult, ToolResultWithScope, Var, VarBindings, hookRunTool, references } from "@engraft/core";
import { hookCache, hookDedupe, hookFork, hookMemo, hooks } from "@engraft/refunc-react";
import { arrEqWithRefEq, objEqWith, objEqWithRefEq, recordEqWith, setEqWithRefEq } from "@engraft/shared/lib/eq.js";
import { intersection, union } from "@engraft/shared/lib/sets.js";
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

export const cellNetwork = hooks((props: CellNetworkProps): Record<string, ToolResultWithScope> => {
  const { cells, varBindings, prevVarId } = props;

  // TODO: Now that we have hookCache, we might want to get rid of the explicit
  // topological sorting. Just evaluate references as needed!

  const cellById = hookMemo(() => Object.fromEntries(cells.map(cell => [cell.var_.id, cell])), [cells]);
  const cellIds = hookMemo(() => new Set(Object.keys(cellById)), [cellById]);
  const cellToPrev = hookMemo(() =>
    prevVarId && cells.length > 1  // length check cuz _.range(1, 0) is not empty
    ? Object.fromEntries(_.range(1, cells.length).map((i) => [cells[i].var_.id, cells[i - 1].var_.id]))
    : {}
  , [cells, prevVarId]);
  const interCellReferencesByCell = hookDedupe(hookMemo(() =>
    Object.fromEntries(cells.map((cell) =>
      [
        cell.var_.id,
        union(
          // direct references
          intersection(references(cell.program), cellIds),
          // `prev` references
          prevVarId && references(cell.program).has(prevVarId) ? [cellToPrev[cell.var_.id]] : [],
        )
      ] as const
    ))
  , [cellIds, cellToPrev, cells, prevVarId]), objEqWith(setEqWithRefEq));
  const { sorted, cyclic } = hookDedupe(hookMemo(() => {
    return toposort([...cellIds], interCellReferencesByCell);
  }, [interCellReferencesByCell, cellIds]), recordEqWith({sorted: arrEqWithRefEq<string>, cyclic: setEqWithRefEq<string>}));

  return hookMemo(() => {
    // The plan: Loop through cells in sorted order. Build up a set of output promises.
    let cellResults: {[cellId: string]: ToolResult} = {};

    // TODO: legitimately weird new pattern; idk
    const cellVarBindingCache = hookCache((cellId: string) => {
      const cell = cellById[cellId];
      if (!cell) {
        throw new Error("internal error: cell not found");
      }
      const results: ToolResult | undefined = cellResults[cellId];
      return hookMemo(() => ({
        var_: cell.var_,
        outputP: results?.outputP ?? EngraftPromise.reject<ToolOutput>(new Error("cycle")),
      }), [cell.var_, results?.outputP]);
    });
    const prevVarBindingCache = hookCache((prevCellId: string) => {
      if (!prevVarId) {
        throw new Error("internal error: no prevVarId");
      }
      const prevCell = cellById[prevCellId];
      if (!prevCell) {
        throw new Error("internal error: prevCell not found");
      }
      const prevResults: ToolResult | undefined = cellResults[prevCellId];
      return hookMemo(() => ({
        var_: {
          id: prevVarId,
          label: `<span style="font-style: normal">↑</span> ${prevCell.var_.label || "[no label]"}`,
          autoCompleteLabel: '↑ prev'
        },
        outputP: prevResults ? prevResults.outputP : EngraftPromise.reject<ToolOutput>(new Error("cycle")),
      }), [prevCell.var_.label, prevResults, prevVarId]);
    });

    hookFork((branch) => {
      [...sorted, ...cyclic].forEach((cellId) => branch(cellId, () => {
        const cell = cellById[cellId];

        let cellVarBindings = {...varBindings};
        for (const varId of references(cell.program)) {
          if (cellIds.has(varId)) {
            cellVarBindings[varId] = cellVarBindingCache.get(varId);
          } else if (varId === prevVarId) {
            cellVarBindings[varId] = prevVarBindingCache.get(cellToPrev[cellId]);
          }
        }
        cellVarBindings = hookDedupe(cellVarBindings, objEqWithRefEq);

        cellResults[cellId] = hookRunTool({
          program: cell.program,
          varBindings: cellVarBindings,
        });
      }));
    });

    // Now we have results for all the cells, so we can attach newScopeVarBindings.
    // (Order doesn't matter here)

    // TODO: all the memoization below may be pointless

    const allVarBindings = hookMemo(() =>
      Object.fromEntries(cells.map((cell) => [cell.var_.id, {
        var_: cell.var_,
        outputP: cellResults[cell.var_.id].outputP,
      }]))
    , [cells, cellResults]);

    const cellResultsWithScope = hookFork((branch) =>
      _.mapValues(cellResults, (result, cellId) => branch(cellId, () =>
        hookMemo(() => {
          let newScopeVarBindings: VarBindings = _.omit(allVarBindings, cellId);
          if (prevVarId && cellToPrev[cellId]) {
            newScopeVarBindings[prevVarId] = prevVarBindingCache.get(cellToPrev[cellId]);
          }
          newScopeVarBindings = hookDedupe(newScopeVarBindings, objEqWithRefEq);
          return { result, newScopeVarBindings };
        }, [allVarBindings, cellId, cellToPrev, prevVarBindingCache, prevVarId, result])
      ))
    );

    cellVarBindingCache.done();
    prevVarBindingCache.done();

    return cellResultsWithScope;
  }, [cellById, cellIds, cellToPrev, cells, cyclic, prevVarId, sorted, varBindings]);
});

export const collectReferencesForCellNetwork = (cells: Cell[], prevVarId?: string): ReferenceCollection => [
  Object.values(cells).map(cell => cell.program),
  { '-': Object.values(cells).map(cell => cell.var_) },
  { '-': prevVarId ? [ {id: prevVarId} ] : [] },
];
