import { defineSimpleTool } from "@engraft/toolkit";

export default defineSimpleTool({
  name: 'toy-adder-simple',
  fields: {
    extra: 0,
  },
  subTools: ['x', 'y'] as const,
  compute: ({ fields, subToolOutputs }) => {
    if (typeof subToolOutputs.x.value !== 'number') { throw new Error('x must be a number'); }
    if (typeof subToolOutputs.y.value !== 'number') { throw new Error('y must be a number'); }
    return { value: subToolOutputs.x.value + subToolOutputs.y.value + fields.extra };
  },
  render: ({ renderSlot, autoFocus, fields, fieldsUP }) => (
    <div className="xCol xGap10 xPad10">
      <div className="xRow xGap10">
        <b>x</b>
        {renderSlot('x', {autoFocus})}
      </div>

      <div className="xRow xGap10">
        <b>y</b>
        {renderSlot('y')}
      </div>

      <div className="xRow xGap10">
        <b>extra</b>
        <input
          type="range"
          value={fields.extra}
          onChange={(e) => fieldsUP.extra.$set(+e.target.value)}
        />
      </div>
    </div>
  ),
})
