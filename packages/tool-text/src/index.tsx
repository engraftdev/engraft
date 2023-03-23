import { defineSimpleTool } from "@engraft/toolkit";
import { CodeMirror } from "@engraft/original/lib/util/CodeMirror.js";
import { setup } from "@engraft/original/lib/util/codeMirrorStuff.js";


export default defineSimpleTool({
  name: 'text',
  fields: {
    text: "",
  },
  subTools: [],
  compute: ({ fields: { text } }) => {
    return text;
  },
  render: ({ fields: { text }, fieldsUP, autoFocus }) => {
    return (
      <CodeMirror
        extensions={setup()}
        autoFocus={autoFocus}
        text={text}
        onChange={fieldsUP.text.$set}
      />
    );
  },
})
