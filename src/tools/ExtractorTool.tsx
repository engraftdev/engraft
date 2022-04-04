import { createContext, memo, ReactNode, useCallback, useContext, useMemo } from "react";
import { registerTool, ToolConfig, ToolProps, ToolViewRender } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { useAt } from "../util/state";
import { Use } from "../util/Use";
import useHover from "../util/useHover";
import { flexRow } from "../view/styles";
import { pathString, ValueCustomizations, ValueOfTool } from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";



export interface ExtractorConfig extends ToolConfig {
  toolName: 'extractor';
  inputConfig: ToolConfig;
  selectedPath: string[] | undefined;
}

interface ExtractorContextValue {
  selectedPath: string[] | undefined;
  setSelectedPath: (path: string[]) => void;
}
const ExtractorContext = createContext<ExtractorContextValue>({
  selectedPath: undefined,
  setSelectedPath: () => {},
});

interface SubValueHandleProps {
  path: string[],
  children: ReactNode,
}

export const SubValueHandle = memo(function SubValueHandle({path, children}: SubValueHandleProps) {
  const { selectedPath, setSelectedPath } = useContext(ExtractorContext);

  const isSelected = selectedPath && pathString(selectedPath) === pathString(path);

  const onClick = useCallback(() => {
    setSelectedPath(path);
  }, [path, setSelectedPath])

  return <Use hook={useHover} children={([hoverRef, isHovered]) =>
    <div
      ref={hoverRef}
      title={pathString(path)}
      style={{
        minWidth: 0,
        marginLeft: "-0.125rem",
        marginRight: "-0.125rem",
        paddingLeft: "0.125rem",
        paddingRight: "0.125rem",
        borderRadius: "0.125rem",
        ...isHovered && {
          backgroundColor: "rgba(0,0,220,0.1)",
          cursor: "pointer",
        },
        ...isSelected && {
          backgroundColor: "rgba(0,0,220,0.1)",
        }
      }}
      onClick={onClick}
    >
      {children}
    </div>
  }/>
})

const customizations: ValueCustomizations = {
  SubValueHandle
}

export const ExtractorTool = memo(function ExtractorTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ExtractorConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const [selectedPath, updateSelectedPath] = useAt(config, updateConfig, 'selectedPath');

  const output = useMemo(() => {
    if (!inputOutput || !selectedPath) {
      return null;
    }
    try {
      let value = inputOutput.toolValue as any;
      selectedPath.forEach((key) => {
        value = value[key];
      })
      return { toolValue: value };
    } catch {
      return null;
    }
  }, [inputOutput, selectedPath])
  useOutput(reportOutput, output)

  // const metaHeld = useKeyHeld('Meta');

  const render: ToolViewRender = useCallback(function R({autoFocus}) {
    const setSelectedPath = useCallback((path) => {
      return updateSelectedPath(() => path);
    }, [])

    return (
      <div style={{padding: 10}}>
        <div
          className="ExtractorTool-top"
          style={{
            position: 'sticky',
            top: 0,
            background: 'white',
            paddingTop: 10,
            marginTop: -10,
            paddingBottom: 10,
            marginBottom: 10,
          }}
        >
          <div className="ExtractorTool-input-row" style={{marginBottom: 10, ...flexRow(), gap: 10}}>
            <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
          </div>

          <div style={{...flexRow(), gap: 10}}>
            { selectedPath ?
              <>
                <span style={{fontWeight: 'bold'}}>path</span>
                <div style={{fontFamily: 'monospace'}}>{JSON.stringify(selectedPath)}</div>
                {!output && <div>(not found)</div>}
              </> :
              "No path selected"
            }
          </div>
        </div>

        <ExtractorContext.Provider value={{selectedPath, setSelectedPath}}>
          <ValueOfTool toolValue={inputOutput} customizations={customizations} />
        </ExtractorContext.Provider>
      </div>
    );
  }, [inputOutput, inputView, output, selectedPath, updateSelectedPath]);
  useView(reportView, render, config);

  return <>
    {inputComponent}
  </>
});
registerTool<ExtractorConfig>(ExtractorTool, () => {
  return {
    toolName: 'extractor',
    inputConfig: codeConfigSetTo(''),
    selectedPath: undefined,
  };
});

