import React from 'react';
import { toolIndex, ToolWithView } from './tools-framework/tools';
import { PickerConfig } from './tools/PickerTool';
import useInitOnce from './util/useInitOnce';
import useStrictState from './util/useStrictState';

import './tools/builtInTools';

/*
TODO: fix remounting text-editor bug
*/

function App() {
  const [config, setConfig] = useStrictState<any>({
    toolName: 'picker',
  } as PickerConfig)
  const [output, setOutput] = useStrictState<any>(undefined);
  const context = useInitOnce(() => ({array: {toolValue: [1, 2, 3]}}));

  return <>
    <div>
      <ToolWithView
          Tool={toolIndex.picker}
          context={context}
          config={config}
          reportConfig={setConfig}
          reportOutput={setOutput}
      />
    </div>
    output: {JSON.stringify(output)}
  </>
}

export default App;
