import React, { memo, useEffect } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { Tool, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps } from "src/engraft";
import { EngraftPromise } from "src/engraft/EngraftPromise";
import { ShowView } from "src/engraft/ShowView";
import { hookMemo } from "src/incr/hookMemo";
import { hooks } from "src/incr/hooks";
import { memoizeProps } from "src/incr/memoize";
import { newId } from "src/util/id";
import { useAt } from "src/util/immutable-react";
import { noOp } from "src/util/noOp";
import { RowToCol } from "src/util/RowToCol";
import { Use } from "src/util/Use";
import { useWindowEventListener } from "src/util/useEventListener";
import useHover from "src/util/useHover";
import { useKeyHeld } from "src/util/useKeyHeld";
import { SubValueHandleProps, ToolOutputView, ValueCustomizations } from "src/view/Value";
import { slotSetTo } from "src/builtin-tools/slot";
import { isWildcard, mergePatterns, Path, Pattern, wildcard } from "./patterns";
import { hookRunSubTool } from "src/engraft/hooks";
import { usePromiseState } from "src/engraft/EngraftPromise.react";

interface PatternWithId {
  id: string;
  pattern: Pattern;
};

export type Program = {
  toolName: 'extractor';
  inputProgram: ToolProgram;
  patternsWithIds: PatternWithId[];
  minimized: boolean;
}

export const tool: Tool<Program> = {
  programFactory: (_defaultInputCode) => ({
    toolName: 'extractor',
    inputProgram: slotSetTo(_defaultInputCode || ''),
    patternsWithIds: [],
    minimized: false,
  }),

  computeReferences: (_program) => new Set(),

  run: memoizeProps(hooks((_props) => {
    const { program, updateProgram, varBindings } = _props;
    const { outputP: subOutputP, view: subView } = hookRunSubTool({ program, updateProgram, subKey: 'inputProgram', varBindings })
    const { patternsWithIds } = program;

    const mergedPatterns = hookMemo(() => {
      return patternsWithIds.length > 0 && mergePatterns(patternsWithIds.map(patternWithId => patternWithId.pattern))
    }, [patternsWithIds])
    
    const outputP = hookMemo(() => EngraftPromise.resolve({
      value: subOutputP.then((res)=>{
          if (!mergedPatterns) {
            return null;
          }
          try {
            let value = mergedPatterns(res);
            if (Array.isArray(value)) {
              // TODO: not sure what this behavior should be in general
              value = value.flat(Infinity);
            }
            return { value };
          } catch (e) {
            console.warn(e);
            return null;
          }
        }).then(res => res)
    }), [_props, subOutputP, mergedPatterns]);

    const view = hookMemo(() => ({
      render: (viewProps : any) => <ExtractorToolView {..._props} {...viewProps} inputView={subView} inputOutput={subOutputP}/>
    }), [_props, subOutputP, subView]);

    return { outputP, view };
  })),
};


interface ExtractorContextValue {
  activePattern: Pattern | undefined;
  setActivePattern: (pattern: Pattern) => void;
  otherPatterns: Pattern[];
  multiSelectMode: boolean;
}
const ExtractorContext = createContext<ExtractorContextValue>({
  activePattern: undefined,
  setActivePattern: noOp,
  otherPatterns: [],
  multiSelectMode: false,
});


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

// fix memo
export const SubValueHandle = memo(function SubValueHandle({path, children}: SubValueHandleProps) {
  const { activePattern, setActivePattern, otherPatterns, multiSelectMode } = useContext(ExtractorContext);

  const matchesActivePattern = activePattern && pathMatchesPattern(path, activePattern);
  const matchesOtherPattern = otherPatterns.some((pattern) => pathMatchesPattern(path, pattern));

  const generalization = multiSelectMode && activePattern && generalize(path, activePattern);

  const isClickable = multiSelectMode && activePattern ? generalization : true;

  const isMultiSelectable = multiSelectMode && activePattern ? generalization : false;

  const onClick = useCallback((ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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
      onClick={(e) => onClick(e)}
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

  return <div ref={patternRef} className="xRow">
    <div className="xRow xShrinkable xEllipsis" style={{fontFamily: 'monospace'}}>
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
      onClick={(ev) => {
        ev.stopPropagation();
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


interface ExtractorToolViewProps extends ToolProps<Program>, ToolViewRenderProps {
  inputView: ToolView;
  inputOutput: EngraftPromise<ToolOutput>;
}

const ExtractorToolView = memo(function ExtractorToolView(props: ExtractorToolViewProps) {
  const { program, updateProgram, autoFocus, inputView, inputOutput } = props;

  const [patternsWithIds, updatePatternsWithIds] = useAt(program, updateProgram, 'patternsWithIds');
  const [minimized, updateMinimized] = useAt(program, updateProgram, 'minimized');

  const [activePatternIndex, setActivePatternIndex] = useState(patternsWithIds.length);

  useEffect(() => {
    if (activePatternIndex > patternsWithIds.length) {  // can be an element of patterns, or a blank afterwards
      setActivePatternIndex(patternsWithIds.length);
    }
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
  }, [activePatternIndex, updatePatternsWithIds])

  const [hoverRef, isTopLevelHovered] = useHover();
  const isShiftHeld = useKeyHeld("Shift");

  const multiSelectMode = isTopLevelHovered && isShiftHeld;

  const activePattern: Pattern | undefined = patternsWithIds[activePatternIndex]?.pattern;
  const otherPatterns = patternsWithIds.map(patternWithId => patternWithId.pattern).filter((_, i) => i !== activePatternIndex);

  const inputOutputState = usePromiseState(inputOutput)

  // todo: very hacky
  if (minimized) {
    return <div className="xRow xAlignVCenter" style={{padding: 2}}>
      <ShowView view={inputView} autoFocus={autoFocus} />
      <div className="xCol">
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
    <div ref={hoverRef} className="xCol" style={{padding: 10, height: '100%', boxSizing: 'border-box'}}>
      <div
        className="ExtractorTool-top xCol xGap10"
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
        <RowToCol className="ExtractorTool-input xGap10" minRowWidth={200}>
          <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
        </RowToCol>
        <RowToCol className="ExtractorTool-patterns xGap10" minRowWidth={200}>
          <span style={{fontWeight: 'bold'}}>patterns</span>
          <div className="xCol">
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
        </RowToCol>
      </div>
      <div style={{minHeight: 0, overflow: 'scroll'}}>
        <ExtractorContext.Provider value={{activePattern, setActivePattern, otherPatterns, multiSelectMode}}>
          <ToolOutputView outputState={inputOutputState}  customizations={customizations} />
        </ExtractorContext.Provider>
      </div>
    </div>
  );
})