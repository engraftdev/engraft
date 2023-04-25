import { defineSimpleTool } from "@engraft/toolkit";
import { RgbColor, RgbColorPicker } from "react-colorful";

export default defineSimpleTool({
  name: 'color',
  fields: {
    r: 250,
    g: 200,
    b: 100,
  },
  subTools: [],
  compute: ({ fields }) => {
    return `rgb(${fields.r}, ${fields.g}, ${fields.b})`;
  },
  render: ({ fields, fieldsUP }) => {
    const onChange = (color: RgbColor) => {
      fieldsUP.$helper({$merge: color});
    };
    return <RgbColorPicker
      color={fields}
      onChange={onChange}
      style={{width: 150, height: 150}}
    />;
  },
});
