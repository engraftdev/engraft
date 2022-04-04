import { createContext, memo, ReactNode, useCallback, useContext, useMemo } from "react";
import { registerTool, ToolConfig, ToolProps, ToolViewRender } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { useAt } from "../util/state";
import { Use } from "../util/Use";
import useHover from "../util/useHover";
import { useKeyHeld } from "../util/useKeyHeld";
import { flexRow } from "../view/styles";
import { pathString, ValueCustomizations, ValueOfTool } from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";

const wildcard = {wildcard: true};

type PathStep = string | typeof wildcard;
type Path = PathStep[]

function isWildcard(step: PathStep): step is typeof wildcard {
  return typeof step === 'object';
}

function followPath(value: any, path: Path): any {
  if (path.length === 0) {
    return value;
  }

  const [firstStep, ...restPath] = path;
  if (isWildcard(firstStep)) {
    return Object.values(value).flatMap(subvalue => followPath(subvalue, restPath));
  } else {
    return followPath(value[firstStep], restPath);
  }
}

export interface ExtractorConfig extends ToolConfig {
  toolName: 'extractor';
  inputConfig: ToolConfig;
  selectedPath: Path | undefined;
}

interface ExtractorContextValue {
  selectedPath: Path | undefined;
  setSelectedPath: (path: Path | undefined) => void;
  multiSelectMode: boolean;
}
const ExtractorContext = createContext<ExtractorContextValue>({
  selectedPath: undefined,
  setSelectedPath: () => {},
  multiSelectMode: false,
});

interface SubValueHandleProps {
  path: string[],
  children: ReactNode,
}

function pathMatchesPattern(path: Path, pattern: Path): boolean {
  if (path.length !== pattern.length) {
    return false;
  }
  for (let i = 0; i < path.length; i++) {
    if (!(path[i] === pattern[i] || isWildcard(pattern[i]))) {
      return false;
    }
  }
  return true;
}

function singleVariation(path: Path, pattern: Path): Path | undefined {
  if (path.length !== pattern.length) {
    return undefined;
  }
  let differences = 0;
  let generalization: Path = [];
  for (let i = 0; i < path.length; i++) {
    if (isWildcard(pattern[i])) {
      // return false;
      generalization.push(wildcard);
    } else if (path[i] !== pattern[i]) {
      differences++;
      if (differences > 1) {
        return undefined;
      }
      generalization.push(wildcard);
    } else {
      generalization.push(path[i]);
    }
  }
  return generalization;
}

export const SubValueHandle = memo(function SubValueHandle({path, children}: SubValueHandleProps) {
  const { selectedPath, setSelectedPath, multiSelectMode } = useContext(ExtractorContext);

  const isSelected = selectedPath && pathMatchesPattern(path, selectedPath);

  const generalization = multiSelectMode && selectedPath && singleVariation(path, selectedPath);

  console.log(path, selectedPath, multiSelectMode, generalization)

  const isClickable = multiSelectMode && selectedPath ? generalization : true;

  const isMultiSelectable = multiSelectMode && selectedPath ? generalization : false;

  const onClick = useCallback((ev) => {
    ev.preventDefault();
    if (generalization) {
      console.log('setting generalization', path, selectedPath, generalization);
      setSelectedPath(generalization);
    } else {
      console.log('setting single', path, selectedPath, generalization);
      setSelectedPath(path);
    }
    return false;
  }, [generalization, path, selectedPath, setSelectedPath])

  return <Use hook={useHover} children={([hoverRef, isHovered]) =>
    <div
      ref={hoverRef}
      title={pathString(path)}
      style={{
        userSelect: 'none',  // todo
        minWidth: 0,
        marginLeft: "-0.125rem",
        marginRight: "-0.125rem",
        paddingLeft: "0.125rem",
        paddingRight: "0.125rem",
        borderRadius: "0.125rem",
        ...isHovered && isClickable && {
          backgroundColor: "rgba(0,0,220,0.1)",
        },
        ...isClickable && {
          cursor: "pointer",
        },
        ...isMultiSelectable && {
          // border: "1px solid rgba(0,0,0)",
          backgroundColor: "rgba(0,0,220,0.05)",
        },
        ...isSelected && {
          backgroundColor: "rgba(0,0,220,0.3)",
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
      return { toolValue: followPath(inputOutput.toolValue, selectedPath) };
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

    const [hoverRef, isTopLevelHovered] = useHover();
    const isShiftHeld = useKeyHeld("Shift");

    const multiSelectMode = isTopLevelHovered && isShiftHeld;
    console.log(selectedPath)

    return (
      <div ref={hoverRef} style={{padding: 10}}>
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
                <div style={{fontFamily: 'monospace'}}>
                  {['$', ...selectedPath.map((step) => isWildcard(step) ? '★' : step)].join('.')}
                </div>
                {!output && <div>(not found)</div>}
              </> :
              "No path selected"
            }
          </div>
        </div>

        <ExtractorContext.Provider value={{selectedPath, setSelectedPath, multiSelectMode}}>
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
