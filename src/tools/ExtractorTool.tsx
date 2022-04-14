import { InternMap } from "internmap";
import React, { createContext, memo, ReactNode, useCallback, useContext, useEffect, useMemo, useState, MouseEvent } from "react";
import { registerTool, ToolConfig, ToolProps, ToolViewRender } from "../tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "../tools-framework/useSubTool";
import { newId } from "../util/id";
import { mapUpdate } from "../util/mapUpdate";
import { useAt } from "../util/state";
import { Use } from "../util/Use";
import { useWindowEventListener } from "../util/useEventListener";
import useHover from "../util/useHover";
import { useKeyHeld } from "../util/useKeyHeld";
import { flexCol, flexRow } from "../view/styles";
import { pathString, ValueCustomizations, ValueOfTool } from "../view/Value";
import { codeConfigSetTo } from "./CodeTool";

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

interface PatternWithId {
  id: string;
  pattern: Pattern;
};

export interface ExtractorConfig extends ToolConfig {
  toolName: 'extractor';
  inputConfig: ToolConfig;
  patternsWithIds: PatternWithId[];
  minimized: boolean;
}

interface ExtractorContextValue {
  activePattern: Pattern | undefined;
  setActivePattern: (pattern: Pattern) => void;
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

  const onClick = useCallback((ev: MouseEvent) => {
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

interface PatternProps {
  pattern: Pattern;
  onStepToWildcard: (stepIdx: number) => void;
  onRemove: () => void;
}

const PatternView = memo(function Pattern({pattern, onStepToWildcard, onRemove}: PatternProps) {
  const [patternRef, isPatternHovered] = useHover();
  const [isEditing, setIsEditing] = useState(false);

  // TODO: ideally this wouldn't be a permanent event listener?
  useWindowEventListener('click', (ev) => {
    if (isEditing) {
      setIsEditing(false);
    }
  })

  return <div ref={patternRef} style={{...flexRow()}}>
    <div style={{fontFamily: 'monospace',  ...flexRow()}}>
      $
      {pattern.map((step, stepIdx) =>
        <React.Fragment key={stepIdx}>
          .
          { isWildcard(step) ?
            '★' :
            <Use hook={useHover} children={([stepRef, isStepHovered]) =>
              <div ref={stepRef} onClick={(ev) => {
                if (!isEditing) { return; }
                ev.stopPropagation();
                onStepToWildcard(stepIdx);
              }}>
                { isEditing && isStepHovered ? <s>{step}</s> : step}
              </div>
            }/>
          }
        </React.Fragment>
      )}
    </div>
    <div style={{flexGrow: 1}}/>
    <div
      style={{fontSize: '50%', marginLeft: 30, visibility: isPatternHovered || isEditing ? 'visible' : 'hidden'}}
      onClick={() => {
        setIsEditing(!isEditing);
      }}
    >
      ✏️
    </div>
    <div
      style={{fontSize: '50%', marginLeft: 7}}
      onClick={(ev) => {
        ev.stopPropagation();
        onRemove();
      }}
    >
      ❌
    </div>
  </div>
})

export const ExtractorTool = memo(function ExtractorTool({ config, updateConfig, reportOutput, reportView }: ToolProps<ExtractorConfig>) {
  const [inputComponent, inputView, inputOutput] = useSubTool({config, updateConfig, subKey: 'inputConfig'})

  const [patternsWithIds, updatePatternsWithIds] = useAt(config, updateConfig, 'patternsWithIds');
  const [minimized, updateMinimized] = useAt(config, updateConfig, 'minimized');

  const mergedPatterns = useMemo(() => {
    return patternsWithIds.length > 0 && mergePatterns(patternsWithIds.map(patternWithId => patternWithId.pattern))
  }, [patternsWithIds])

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
    const [activePatternIndex, setActivePatternIndex] = useState(patternsWithIds.length);

    useEffect(() => {
      if (activePatternIndex > patternsWithIds.length) {  // can be an element of patterns, or a blank afterwards
        setActivePatternIndex(patternsWithIds.length);
      }
    // TODO: this is really bad – exhaustive-deps thinks patternsWithIds.length doesn't trigger re-render cuz it's an
    //       "outer scope value". this is a flaw in my changing-render-func approach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePatternIndex, patternsWithIds.length])


    const setActivePattern = useCallback((pattern: Pattern) => {
      updatePatternsWithIds((oldPatternsWithIds) => {
        let newPatternsWithIds = oldPatternsWithIds.slice();
        let activePatternWithId = newPatternsWithIds[activePatternIndex];
        if (!activePatternWithId) {
          newPatternsWithIds[activePatternIndex] = {id: newId(), pattern};
        } else {
          newPatternsWithIds[activePatternIndex] = {id: activePatternWithId.id, pattern};
        }
        return newPatternsWithIds;
      })
    }, [activePatternIndex])

    const [hoverRef, isTopLevelHovered] = useHover();
    const isShiftHeld = useKeyHeld("Shift");

    const multiSelectMode = isTopLevelHovered && isShiftHeld;

    const activePattern: Pattern | undefined = patternsWithIds[activePatternIndex]?.pattern;
    const otherPatterns = patternsWithIds.map(patternWithId => patternWithId.pattern).filter((_, i) => i !== activePatternIndex);

    // todo: very hacky
    if (minimized) {
      return <div style={{padding: 2, ...flexRow('center')}}>
        <ShowView view={inputView} autoFocus={autoFocus} />
        <div style={{...flexCol()}}>
          {patternsWithIds.map(({pattern, id}) =>
            <div key={id} style={{fontFamily: 'monospace', whiteSpace: 'nowrap'}}>
              {['', ...pattern.map(step => isWildcard(step) ? '★' : step)].join('.')}
            </div>
          )}
        </div>
        <span
          style={{marginLeft: 8, cursor: 'pointer'}}
          onClick={(ev) => {
            ev.preventDefault();
            updateMinimized(() => false);
          }}
        >
          ⊕
        </span>
      </div>;
    }

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
          <div
            style={{position: 'absolute', cursor: 'pointer', flexGrow: 1, right: 0, top: 0}}
            onClick={(ev) => {
              ev.preventDefault();
              updateMinimized(() => true);
            }}
          >
            ⊖
          </div>
          <div className="ExtractorTool-input-row" style={{marginBottom: 10, ...flexRow(), gap: 10}}>
            <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
          </div>

          <div style={{...flexRow(), gap: 10}}>
            <span style={{fontWeight: 'bold'}}>patterns</span>
            <div style={{...flexCol()}}>
              {[...patternsWithIds, undefined].map((patternWithId, patternIdx) =>
                <div
                  key={patternWithId?.id || 'new'}
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
                  {patternWithId ?
                    <PatternView
                      key={patternWithId.id}
                      pattern={patternWithId.pattern}
                      onStepToWildcard={(stepIdx) => {
                        updatePatternsWithIds((oldPatternsWithIds) => {
                          let newPatternsWithIds = [...oldPatternsWithIds];
                          // TODO agggrh this isn't enve correnct arrrrgh
                          newPatternsWithIds[patternIdx].pattern[stepIdx] = {wildcard: true};
                          return newPatternsWithIds;
                        })
                      }}
                      onRemove={() => {
                        updatePatternsWithIds((oldPatternsWithIds) => {
                          let newPatternsWithIds = [...oldPatternsWithIds];
                          newPatternsWithIds.splice(patternIdx, 1);
                          return newPatternsWithIds;
                        })
                        if (activePatternIndex === patternIdx) {
                          setActivePatternIndex(patternsWithIds.length - 1);
                        }
                      }}
                    />:
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
  }, [patternsWithIds, minimized, inputView, inputOutput, updatePatternsWithIds, updateMinimized]);
  useView(reportView, render, config);

  return <>
    {inputComponent}
  </>
});
registerTool<ExtractorConfig>(ExtractorTool, 'extractor', () => {
  return {
    toolName: 'extractor',
    inputConfig: codeConfigSetTo(''),
    patternsWithIds: [],
    minimized: false,
  };
});
