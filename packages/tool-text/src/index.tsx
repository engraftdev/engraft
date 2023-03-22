import { defineSimpleTool } from "@engraft/toolkit";
import { CodeMirror } from "@engraft/original/lib/util/CodeMirror.js";
import { setup } from "@engraft/original/lib/util/codeMirrorStuff.js";


export default defineSimpleTool({
  name: 'text',
  fields: {
    text: "",
  },
  subTools: [],
  compute: ({ fields, subToolOutputs }) => {
    return fields.text;
  },
  render: ({ renderSlot, autoFocus, fields, fieldsUP }) => {
    return (
      <CodeMirror
        extensions={setup()}
        autoFocus={autoFocus}
        text={fields.text}
        onChange={fieldsUP.text.$set}
      />
    );
  },
})
