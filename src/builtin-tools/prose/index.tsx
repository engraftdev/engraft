import { exampleSetup } from "prosemirror-example-setup";
import { keymap } from "prosemirror-keymap";
import prosemirrorMenuCSS from "prosemirror-menu/style/menu.css";
import { Node, Schema } from "prosemirror-model";
import { schema as schemaBasic } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { EditorState, NodeSelection, Plugin, Transaction } from "prosemirror-state";
import { EditorView, NodeView } from "prosemirror-view";
import prosemirrorViewCSS from "prosemirror-view/style/prosemirror.css";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { newVar, ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, Var, VarBinding, VarBindingsContext } from "src/tools-framework/tools";
import { ShowView, ToolInSet, ToolSet, useOutput, useToolSet, useView } from "src/tools-framework/useSubTool";
import { AddObjToContext } from "src/util/context";
import PortalSet, { usePortalSet } from "src/util/PortalSet";
import { at, Updater, useAt } from "src/util/state";
import { alphaLabels, unusedLabel } from "src/util/unusedLabel";
import { updateF } from "src/util/updateF";
import { objEqWith, refEq, useDedupe } from "src/util/useDedupe";
import { useRefForCallback } from "src/util/useRefForCallback";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "../slot";
import prosemirrorCSS from "./Editor.css";
import { addMathNodes, mathCSS, mathSetup } from "./math";

export type Program = {
  toolName: 'prose',
  docJSON: unknown,
  cells: { [varId: string]: Cell },
};

interface Cell {
  var_: Var,
  program: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'prose',
  docJSON: {type: 'doc', content: []},
  cells: {},
});

export const Component = memo((props: ToolProps<Program>) => {
  const { program, reportOutput, reportView, updateProgram } = props;
  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const [toolSet, outputs, views] = useToolSet();

  useOutput(reportOutput, useMemo(() => {
    // TODO
    return null;
  }, []));

  useView(reportView, useMemo(() => ({
    render: () => <View {...props} outputs={outputs} views={views}/>
  }), [props, outputs, views]));

  return <>
    {Object.entries(cells).map(([varId, cell]) =>
      <CellModel
        key={varId}
        id={varId}
        cells={cells}
        updateCells={updateCells}
        outputs={outputs}
        toolSet={toolSet}
      />
    )}
  </>;
});


interface CellModelProps {
  id: string;

  cells: { [varId: string]: Cell };
  updateCells: Updater<{ [varId: string]: Cell }>;

  outputs: {[id: string]: ToolOutput | null};

  toolSet: ToolSet;
}

const CellModel = memo(function CellModel(props: CellModelProps) {
  const { id, cells, updateCells, outputs, toolSet } = props;

  const [cell, updateCell] = useAt(cells, updateCells, id);
  const [cellProgram, updateCellProgram] = useAt(cell, updateCell, 'program');

  const newVarBindings = useDedupe(useMemo(() => {
    let result: {[label: string]: VarBinding} = {};
    for (let otherCellId in cells) {
      if (otherCellId !== cell.var_.id) {
        result[otherCellId] = {
          var_: cells[otherCellId].var_,
          output: outputs[otherCellId] || undefined
        };
      }
    };
    return result;
  }, [cell.var_.id, cells, outputs]), objEqWith(objEqWith(refEq)))

  // TODO: exclude things that are already present? or does this happen elsewhere

  return <AddObjToContext context={VarBindingsContext} obj={newVarBindings}>
    <ToolInSet toolSet={toolSet} keyInSet={id} program={cellProgram} updateProgram={updateCellProgram} />
  </AddObjToContext>;
});



const schema = new Schema({
  nodes: addMathNodes(addListNodes(schemaBasic.spec.nodes, "paragraph block*", "block")).append({
    tool: {
      group: "inline",
      inline: true,
      attrs: {
        id: {}
      },
      toDOM(node) {
        return ["tool", { id: node.attrs.id }];
      },
      parseDOM: [
        {
          tag: "tool",
          getAttrs(dom: HTMLElement | string) {
            return {
              id: (dom as HTMLElement).getAttribute("id"),
            }
          }
        }
      ],
    }
  }),
  marks: schemaBasic.spec.marks,
})
const toolNodeType = schema.nodes.tool;

type ViewProps = {
  program: Program,
  updateProgram: Updater<Program>,

  outputs: {[id: string]: ToolOutput | null},
  views: {[id: string]: ToolView | null},
}

export const View = memo((props: ViewProps) => {
  const { program, updateProgram, views } = props;
  const [docJSON, updateDocJSON] = useAt(program, updateProgram, 'docJSON');
  const [cells, updateCells] = useAt(program, updateProgram, 'cells');

  const [div, setDiv] = useState<HTMLDivElement | null>();
  const [toolPortalSet, toolPortals] = usePortalSet<{id: string}>();

  const insertToolCmdRef = useRefForCallback(useCallback(
    function insertToolCmd(state: EditorState, dispatch: ((tr:Transaction) => void) | undefined){
      let { $from } = state.selection, index = $from.index();
      if (!$from.parent.canReplaceWith(index, index, toolNodeType)) {
        return false;
      }
      if (dispatch) {
        const usedLabels = Object.values(cells).map((cell) => cell.var_.label);
        console.log('used', usedLabels, cells);
        const var_ = newVar(unusedLabel(alphaLabels, usedLabels));
        updateCells(updateF({[var_.id]: {$set: {
          var_,
          program: slotSetTo(''),
        }}}));

        let mathNode = toolNodeType.create({id: var_.id});
        let tr = state.tr.replaceSelectionWith(mathNode);
        tr = tr.setSelection(NodeSelection.create(tr.doc, $from.pos));
        dispatch(tr);
      }
      return true;
    },
    [cells, updateCells]
  ));

  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (viewRef.current) { return; }
    if (!div) { return; }

    function insertToolCmd(...args: Parameters<typeof insertToolCmdRef.current>) {
      return insertToolCmdRef.current(...args);
    }

    const state = EditorState.create({
      plugins: [
        ...exampleSetup({schema: schema}),
        onDocChangePlugin((doc) => {
          updateDocJSON(() => doc.toJSON());
        }),
        keymap({
          "Control-t" : insertToolCmd,
        }),
        new Plugin({
          props: {
            nodeViews: {
              tool(node) { return new ToolNodeView(node, toolPortalSet); }
            }
          }
        }),
        ...mathSetup(schema),
      ],
      schema: schema,
      doc: Node.fromJSON(schema, docJSON),  // TODO: load live changes from docJSON
    });

    viewRef.current = new EditorView(div, {
      state,
    });
  });
  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    }
  }, []);

  return <>
    {/* TODO: figure out how to actually handle stylesheets */}
    <style>
      {prosemirrorCSS}
      {prosemirrorViewCSS}
      {prosemirrorMenuCSS}
      {mathCSS}
    </style>
    <div ref={setDiv}/>
    {toolPortals.map(([elem, {id}]) => {
      // TODO: not memoized; is that a problem?
      const updateCell = at(updateCells, id);
      const updateVar = at(updateCell, 'var_');
      return ReactDOM.createPortal(
        views[id] ?
          // <div style={{display: 'inline-block', position: 'relative'}}>
          //   <ShowView view={views[id]} autoFocus={true} />
          //   <div style={{display: 'inline-block', position: 'absolute', right: 3, top: 3}}>
          //     <VarDefinition var_={cells[id].var_} updateVar={updateVar} />
          //   </div>
          // </div> :
          <div style={{display: 'inline-flex', position: 'relative', gap: 5}} className="xRow xAlignTop">
            <VarDefinition var_={cells[id].var_} updateVar={updateVar} />
            <ShowView view={views[id]} autoFocus={true} />
          </div> :
          <span style={{backgroundColor: 'red'}}>tool not found</span>,
        elem
      )
    })}
  </>;
});


// TODO: this can't be the right way to do this
function onDocChangePlugin(onDocChange: (doc: Node) => void) {
  return new Plugin({
    state: {
      init(_config, _instance) {
        return;
      },
      apply(tr, _value) {
        if (tr.docChanged) {
          onDocChange(tr.doc);
        }
      }
    }
  });
}

class ToolNodeView implements NodeView {
  dom = document.createElement("span");

  constructor(node: Node, private portalSet: PortalSet<{id: string}>) {
    this.dom.id = node.attrs.id;

    this.portalSet.register(this.dom, {id: node.attrs.id});
    // // TODO: switch to portals when it is time
    // const root = createRoot(this.dom);
    // // root.render(<span>HI</span>);
    // root.render(<SillyTool initialProgram={slotSetTo(lookUpTool('slider').programFactory())} />);
  }

  destroy() {
    this.portalSet.unregister(this.dom);
  }

  stopEvent() { return true }
}
