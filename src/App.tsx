import React from 'react';
import { toolIndex, ToolValue, ToolWithView } from './tools-framework/tools';
import { PickerConfig } from './tools/PickerTool';
import useInitOnce from './util/useInitOnce';
import useStrictState from './util/useStrictState';

import './tools/builtInTools';
import { CodeConfig } from './tools/CodeTool';

/*
TODO: fix remounting text-editor bug
*/

function App() {
  const [config, setConfig] = useStrictState<any>({
    toolName: 'code',
    type: 'text',
    text: ''
  } as CodeConfig)
  const [output, setOutput] = useStrictState<ToolValue | null>(null);
  const context = useInitOnce(() => ({array: {toolValue: [1, 2, 3]}}));

  return <>
    <div>
      <ToolWithView
          Tool={toolIndex.code}
          context={context}
          config={config}
          reportConfig={setConfig}
          reportOutput={setOutput}
      />
    </div>
    <br/>
    <br/>
    <pre>{JSON.stringify(output?.toolValue, null, 2)}</pre>
  </>
}

export default App;
