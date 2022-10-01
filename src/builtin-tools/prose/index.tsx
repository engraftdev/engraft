import { exampleSetup } from "prosemirror-example-setup";
import { keymap } from "prosemirror-keymap";
import prosemirrorMenuCSS from "prosemirror-menu/style/menu.css";
import { Node, Schema } from "prosemirror-model";
import { schema as schemaBasic } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { EditorState, NodeSelection, Plugin, Transaction } from "prosemirror-state";
import { EditorView, NodeView } from "prosemirror-view";
import prosemirrorViewCSS from "prosemirror-view/style/prosemirror.css";
import { memo, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { lookUpTool, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { Updater, useAt } from "src/util/state";
import prosemirrorCSS from "./Editor.css";
import { addMathNodes, mathCSS, mathSetup } from "./math";
import { ToolWithView } from "src/tools-framework/ToolWithView";
import { slotSetTo } from "../slot";
import { newId } from "src/util/id";

export type Program = {
  toolName: 'prose',
  docJSON: unknown,
};

export const programFactory: ProgramFactory<Program> = () => ({
  toolName: 'prose',
  docJSON: {type: 'doc', content: []},
});

export const Component = memo((props: ToolProps<Program>) => {
  const { reportOutput, reportView, updateProgram } = props;

  useEffect(() => {
    reportOutput({
      value: "Output: Hello world!"
    });
    reportView({
      render: () => <View {...props} />
    });
  }, [reportOutput, reportView])

  return <></>;
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

type ViewProps = {
  program: Program,
  updateProgram: Updater<Program>,
}

export const View = memo((props: ViewProps) => {
  const { program, updateProgram } = props;

  const [div, setDiv] = useState<HTMLDivElement | null>();

  const [docJSON, updateDocJSON] = useAt(program, updateProgram, 'docJSON');

  useEffect(() => {
    if (!div) { return; }

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
              tool(node) { return new ToolNodeView(node); }
            }
          }
        }),
        ...mathSetup(schema),
      ],
      schema: schema,
      doc: Node.fromJSON(schema, docJSON),  // TODO: load live changes from docJSON
    });
    const view = new EditorView(div, {
      state,
    });

    return () => {
      view.destroy();
    }
  }, [div]);

  return <>
    {/* TODO: figure out how to actually handle stylesheets */}
    <style>
      {prosemirrorCSS}
      {prosemirrorViewCSS}
      {prosemirrorMenuCSS}
      {mathCSS}
    </style>
    <div ref={setDiv}/>
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

const toolNodeType = schema.nodes.tool;

function insertToolCmd(state: EditorState, dispatch: ((tr:Transaction) => void) | undefined){
  let { $from } = state.selection, index = $from.index();
  if (!$from.parent.canReplaceWith(index, index, toolNodeType)) {
    return false;
  }
  if (dispatch){
    let mathNode = toolNodeType.create({id: newId()});
    let tr = state.tr.replaceSelectionWith(mathNode);
    tr = tr.setSelection(NodeSelection.create(tr.doc, $from.pos));
    dispatch(tr);
  }
  return true;
}

class ToolNodeView implements NodeView {
  dom = document.createElement("span");

  constructor(node: Node) {
    this.dom.id = node.attrs.id;

    // TODO: switch to portals when it is time
    const root = createRoot(this.dom);
    // root.render(<span>HI</span>);
    root.render(<SillyTool initialProgram={slotSetTo(lookUpTool('slider').programFactory())} />);
  }

  stopEvent() { return true }
}

function SillyTool(props: {initialProgram: ToolProgram}) {
  const [program, updateProgram] = useState(props.initialProgram);
  return <ToolWithView
    program={program}
    updateProgram={updateProgram}
    reportOutput={() => {}}
  />;
}
