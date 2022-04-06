import { createContext, memo, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { registerTool, ToolConfig, ToolProps, ToolViewRender } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { useAt } from "../util/state";
import { Use } from "../util/Use";
import useHover from "../util/useHover";
import { useKeyHeld } from "../util/useKeyHeld";
import { flexCol, flexRow } from "../view/styles";
import { pathString, ValueCustomizations, ValueOfTool } from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";
import { InternMap } from "internmap";
import { mapUpdate } from "../util/mapUpdate";

const wildcard = {wildcard: true};

type PatternStep = string | typeof wildcard;
type Pattern = PatternStep[];
type Path = string[];

function isWildcard(step: PatternStep): step is typeof wildcard {
  return typeof step === 'object';
}

function followPattern(value: any, pattern: Pattern): any {
  if (pattern.length === 0 || value === undefined) {
    return value;
  }

  const [firstStep, ...restPath] = pattern;
  if (isWildcard(firstStep)) {
    return Object.values(value).flatMap(subvalue => followPattern(subvalue, restPath));
  } else {
    return followPattern(value[firstStep], restPath);
  }
}

function mergePatterns(patterns: Pattern[]): (value: unknown) => unknown {
  const headPaths = patterns.map(getHeadPath);
  // A pattern with a given head-path will be followed after that head by either:
  // * the end of the pattern, or
  // * a wildcard.
  // If all the patterns here have one or the other of these, life is easy.
  // Otherwise, we need to append _ROOT & _ALL (names TBD).

  const commonHead = getCommonHead(headPaths);

  const patternsByHead = new InternMap<Path, {atRoot: boolean, afterWildcard: Pattern[]}>([], JSON.stringify);

  patterns.forEach((pattern) => {
    const headPath = getHeadPath(pattern)
    const pathAfterCommon = headPath.slice(commonHead.length);
    mapUpdate(patternsByHead, pathAfterCommon, (prev) => {
      if (!prev) {
        prev = {atRoot: false, afterWildcard: []};
      }
      if (pattern[headPath.length] === undefined) {
        prev.atRoot = true;
      } else if (isWildcard(pattern[headPath.length])) {
        prev.afterWildcard.push(pattern.slice(headPath.length + 1));
      } else {
        throw new Error('waaaaat');
      }
      return prev;
    })
  })

  let subMergers: {key: string, pathAfterCommon: Path, func: (value: unknown) => unknown}[] = [];

  patternsByHead.forEach(({atRoot, afterWildcard}, pathAfterCommon) => {
    let conflict = atRoot && afterWildcard.length > 0;

    if (atRoot) {
      let pathAfterCommonForKey = pathAfterCommon;
      if (conflict) {
        pathAfterCommonForKey = [...pathAfterCommon, 'ROOT'];
      }
      subMergers.push({
        key: pathAfterCommonForKey.length === 0 ? 'ROOT' : pathAfterCommonForKey.join('_'),
        pathAfterCommon,
        func: (value) => value,
      });
    }

    if (afterWildcard.length > 0) {
      let pathAfterCommonForKey = pathAfterCommon;
      if (conflict) {
        pathAfterCommonForKey = [...pathAfterCommon, 'ALL'];
      }

      const itemFunc = mergePatterns(afterWildcard)

      subMergers.push({
        key: pathAfterCommonForKey.length === 0 ? 'ALL' : pathAfterCommonForKey.join('_'),
        pathAfterCommon,
        func: (value) => typeof value === 'object' && value !== null ? Object.values(value).map(itemFunc) : [],
      });
    }

  })

  if (subMergers.length === 1) {
    if (subMergers[0].pathAfterCommon.length > 0) {
      throw new Error('no way');
    }
    return (value) => {
      const valueToCommon = followPattern(value, commonHead);
      return subMergers[0].func(valueToCommon);
    }
  } else {
    return (value) => {
      const valueToCommon = followPattern(value, commonHead);
      return Object.fromEntries(subMergers.map(({key, pathAfterCommon, func}) => [
        key,
        func(followPattern(valueToCommon, pathAfterCommon))
      ]))
    }
  }
}

function getHeadPath(pattern: Pattern): Path {
  let path: Path = [];
  for (const step of pattern) {
    if (isWildcard(step)) {
      return path;
    }
    path.push(step);
  }
  return path;
}

function getCommonHead(paths: Path[]): Path {
  if (paths.length === 0) {
    throw new Error('idk man');
  }
  const [firstPath, ...otherPaths] = paths;

  let common: Path = [];
  for (let i = 0; i < firstPath.length; i++) {
    if (otherPaths.some(otherPath => otherPath[i] !== firstPath[i])) {
      break;
    }
    common.push(firstPath[i]);
  }
  return common;
}

// function mergePatterns2(patterns: Pattern[], labelSoFar: string | undefined): [(value: unknown) => unknown, string | undefined] {
//   if (patterns.length === 0) {
//     return [() => undefined, labelSoFar];
//   }

//   // strategy:
//   // * figure out which keys should be present at this level, imagining that each was present with many others
//   // * if only one is present, we can just use it

//   let children: {[head: string]: Pattern[]} = {}

//   patterns.map((pattern) => {
//     let head: PatternStep | undefined = pattern[0];
//     if (head === undefined) {
//       head = 'ROOT';
//     } else if (isWildcard(head)) {
//       head = 'ALL';
//     }
//     if (!children[head]) {
//       children[head] = [];
//     }
//     children[head].push(pattern);
//   })

//   const entries = Object.entries(children);

//   if (entries.length === 1) {
//     // hooray, we can just go in there!
//     const [head, patterns] = entries[0];
//     if (head === 'ROOT') {
//       // there can only be one pattern
//       return [(value) => value, labelSoFar];
//     } else if (head === 'ALL') {
//       const subPatterns = patterns.map((pattern) => pattern.slice(1));
//       const subMerger = mergePatterns2(subPatterns, undefined);
//       return [(value) => Object.values(value as object).map(subMerger[0]), joinWithUnderscore(labelSoFar, subMerger[1])];
//     } else {
//       const subPatterns = patterns.map((pattern) => pattern.slice(1));
//       const subMerger = mergePatterns2(subPatterns, undefined);
//       return [(value) => subMerger[0]((value as any)[head]), joinWithUnderscore(labelSoFar, head)]
//     }
//   }

//   if (patterns.some((pattern) => pattern.length === 0)) {
//     // we care about the root
//     if (patterns.length === 1) {
//       // and only the root
//       return (value) => value;
//     } else {
//       // and other stuff

//     }
//   }
//   if (patterns.) {

//   }
// }


export interface ExtractorConfig extends ToolConfig {
  toolName: 'extractor';
  inputConfig: ToolConfig;
  patterns: Pattern[];
}

interface ExtractorContextValue {
  activePattern: Pattern | undefined;
  setActivePattern: (pattern: Pattern | undefined) => void;
  otherPatterns: Pattern[];
  multiSelectMode: boolean;
}
const ExtractorContext = createContext<ExtractorContextValue>({
  activePattern: undefined,
  setActivePattern: () => {},
  otherPatterns: [],
  multiSelectMode: false,
});

interface SubValueHandleProps {
  path: string[],
  children: ReactNode,
}

function pathMatchesPattern(path: Path, pattern: Pattern): boolean {
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

// Does a path deviate from a pattern in a single spot?
// If so, this returns a pattern that replaces that spot with a wildcard.
// Otherwise, it returns false.
function generalize(path: Path, pattern: Pattern): Pattern | undefined {
  if (path.length !== pattern.length) {
    return undefined;
  }
  let differences = 0;
  let generalization: Pattern = [];
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
  const { activePattern, setActivePattern, otherPatterns, multiSelectMode } = useContext(ExtractorContext);

  const matchesActivePattern = activePattern && pathMatchesPattern(path, activePattern);
  const matchesOtherPattern = otherPatterns.some((pattern) => pathMatchesPattern(path, pattern));

  const generalization = multiSelectMode && activePattern && generalize(path, activePattern);

  const isClickable = multiSelectMode && activePattern ? generalization : true;

  const isMultiSelectable = multiSelectMode && activePattern ? generalization : false;

  const onClick = useCallback((ev) => {
    ev.preventDefault();
    if (generalization) {
      setActivePattern(generalization);
    } else {
      setActivePattern(path);
    }
    return false;
  }, [generalization, path, setActivePattern])

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
        ...isClickable && {
          cursor: "pointer",
        },
        ...isMultiSelectable && {
          // border: "1px solid rgba(0,0,0)",
          backgroundColor: "rgba(0,0,220,0.1)",
        },
        ...matchesOtherPattern && {
          backgroundColor: "rgba(0,0,0,0.1)",
        },
        ...matchesActivePattern && {
          backgroundColor: "rgba(0,0,220,0.2)",
        },
        ...isHovered && isClickable && {
          backgroundColor: "rgba(0,0,220,0.3)",
        },
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

  const [patterns, updatePatterns] = useAt(config, updateConfig, 'patterns');

  const mergedPatterns = useMemo(() => {
    return patterns.length > 0 && mergePatterns(patterns)
  }, [patterns])

  const output = useMemo(() => {
    // TODO: fix this; it should integrate results of patterns intelligently
    if (!inputOutput || !mergedPatterns) {
      return null;
    }
    try {
      return { toolValue: mergedPatterns(inputOutput.toolValue) };
    } catch (e) {
      console.warn(e);
      return null;
    }
  }, [inputOutput, mergedPatterns])
  useOutput(reportOutput, output)

  // const metaHeld = useKeyHeld('Meta');

  const render: ToolViewRender = useCallback(function R({autoFocus}) {
    const [activePatternIndex, setActivePatternIndex] = useState(0);

    useEffect(() => {
      if (activePatternIndex > patterns.length) {  // can be an element of patterns, or a blank afterwards
        setActivePatternIndex(patterns.length);
      }
    }, [activePatternIndex])


    const setActivePattern = useCallback((pattern) => {
      updatePatterns((oldPatterns) => {
        let newPatterns = oldPatterns.slice();
        newPatterns[activePatternIndex] = pattern;
        return newPatterns;
      })
    }, [activePatternIndex])

    const [hoverRef, isTopLevelHovered] = useHover();
    const isShiftHeld = useKeyHeld("Shift");

    const multiSelectMode = isTopLevelHovered && isShiftHeld;

    const activePattern: Pattern | undefined = patterns[activePatternIndex];
    const otherPatterns = patterns.filter((_, i) => i !== activePatternIndex);

    return (
      <div ref={hoverRef} style={{padding: 10}}>
        <div
          className="ExtractorTool-top"
          style={{
            position: 'sticky',
            zIndex: 1,  // otherwise, relatively positioned stuff goes on top?
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
            <span style={{fontWeight: 'bold'}}>patterns</span>
            <div style={{...flexCol()}}>
              {[...patterns, undefined].map((pattern, patternIdx) =>
                <div
                  key={patternIdx}
                  className='ExtractorTool-pattern'
                  style={{
                    border: '1px solid gray',
                    ...patternIdx > 0 && {
                      marginTop: -1,
                    },
                    padding: 3,
                    ...activePatternIndex === patternIdx && {
                      background: 'rgba(0,0,220,0.1)',
                    },
                    cursor: 'pointer',
                  }}
                  onClick={() => setActivePatternIndex(patternIdx)}
                >
                  {pattern ?
                    <div style={{...flexRow()}}>
                      <div style={{fontFamily: 'monospace',  ...flexRow()}}>
                        $
                        {pattern.map((step, stepIdx) =>
                          <>
                            .
                            { isWildcard(step) ?
                              '★' :
                              <Use hook={useHover} children={([hoverRef, isHovered]) =>
                                <div ref={hoverRef} onClick={(ev) => {
                                  updatePatterns((oldPatterns) => {
                                    let newPatterns = [...oldPatterns];
                                    newPatterns[patternIdx] = [...newPatterns[patternIdx]];
                                    newPatterns[patternIdx][stepIdx] = {wildcard: true};
                                    return newPatterns;
                                  })
                                  ev.stopPropagation();
                                }}>
                                  { isHovered ? <s>{step}</s> : step}
                                </div>
                              }/>
                            }
                          </>
                        )}
                      </div>
                      <div style={{flexGrow: 1}}/>
                      <div
                        style={{fontSize: '50%', marginLeft: 7}}
                        onClick={(ev) => {
                          updatePatterns((oldPatterns) => {
                            let newPatterns = [...oldPatterns];
                            newPatterns.splice(patternIdx, 1);
                            return newPatterns;
                          })
                          if (activePatternIndex === patternIdx) {
                            setActivePatternIndex(patterns.length - 1);
                          }
                          ev.stopPropagation();
                        }}
                      >
                        ❌
                      </div>
                    </div>:
                    <div style={{fontStyle: 'italic', fontSize: '80%'}}>
                      new pattern
                    </div>
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        <ExtractorContext.Provider value={{activePattern, setActivePattern, otherPatterns, multiSelectMode}}>
          <ValueOfTool toolValue={inputOutput} customizations={customizations} />
        </ExtractorContext.Provider>
      </div>
    );
  }, [patterns, inputView, inputOutput, updatePatterns]);
  useView(reportView, render, config);

  return <>
    {inputComponent}
  </>
});
registerTool<ExtractorConfig>(ExtractorTool, () => {
  return {
    toolName: 'extractor',
    inputConfig: codeConfigSetTo(''),
    patterns: [],
  };
});
