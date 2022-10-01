import { exampleSetup } from "prosemirror-example-setup";
import prosemirrorMenuCSS from "prosemirror-menu/style/menu.css";
import { Node, Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import prosemirrorViewCSS from "prosemirror-view/style/prosemirror.css";
import { memo, useEffect, useState } from "react";
import { ProgramFactory, ToolProps } from "src/tools-framework/tools";
import { Updater, useAt } from "src/util/state";
import prosemirrorCSS from "./Editor.css";
import { addMathNodes, mathCSS, mathSetup } from "./math";


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

const mySchema = new Schema({
  nodes: addMathNodes(addListNodes(schema.spec.nodes, "paragraph block*", "block")),
  marks: schema.spec.marks,
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
        ...exampleSetup({schema: mySchema}),
        onDocChangePlugin((doc) => {
          updateDocJSON(() => doc.toJSON());
        }),
        ...mathSetup(mySchema),
      ],
      schema: mySchema,
      doc: Node.fromJSON(mySchema, docJSON),  // TODO: load live changes from docJSON
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
