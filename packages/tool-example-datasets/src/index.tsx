import { defineSimpleTool } from "@engraft/toolkit";
import { datasets } from "./datasets.js";

export default defineSimpleTool({
  name: 'example-datasets',
  fields: {
    datasetName: 'aapl' as keyof typeof datasets,
  },
  subTools: [],
  compute: ({ fields }) => {
    return datasets[fields.datasetName];
  },
  render: ({ fields: { datasetName }, fieldsUP }) => (
    <select
      value={datasetName}
      onChange={(ev) => fieldsUP.datasetName.$set(ev.target.value as keyof typeof datasets)}
      style={{ width: '100%' }}
    >
      {Object.keys(datasets).map((name) =>
        <option key={name} value={name}>{name}</option>
      )}
    </select>
  ),
})
