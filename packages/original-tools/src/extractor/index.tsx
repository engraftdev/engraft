import { noOp } from "@engraft/shared/lib/noOp.js";
import { Use } from "@engraft/shared/lib/Use.js";
import { useWindowEventListener } from "@engraft/shared/lib/useEventListener.js";
import { useHover } from "@engraft/shared/lib/useHover.js";
import { useKeyHeld } from "@engraft/shared/lib/useKeyHeld.js";
import { EngraftPromise, hookMemo, hookRunTool, hooks, inputFrameBarBackdrop, InputHeading, memoizeProps, randomId, renderWithReact, ShowView, SubValueHandleProps, Tool, ToolOutputView, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, ValueCustomizations } from "@engraft/toolkit";
import { useUpdateProxy } from "@engraft/toolkit";
import React, { createContext, memo, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isWildcard, mergePatterns, Path, Pattern, wildcard } from "./patterns.js";

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
  name: 'extractor',

  makeProgram: (context, defaultInputCode) => ({
    toolName: 'extractor',
    inputProgram: context.makeSlotWithCode(defaultInputCode || ''),
    patternsWithIds: [],
    minimized: false,
  }),

  collectReferences: (program) => program.inputProgram,

  run: memoizeProps(hooks((props) => {
    const { program, varBindings, context } = props;
    const inputResult = hookRunTool({ program: program.inputProgram, varBindings, context })
    const { patternsWithIds } = program;

    const mergedPatterns = hookMemo(() => {
      return patternsWithIds.length > 0 && mergePatterns(patternsWithIds.map(patternWithId => patternWithId.pattern))
    }, [patternsWithIds])

    const outputP = hookMemo(() => EngraftPromise.resolve(inputResult.outputP.then((res)=>{
      if (!mergedPatterns) {
        return {value: null};
      }
      let value = mergedPatterns(res.value);
      if (Array.isArray(value)) {
        // TODO: not sure what this behavior should be in general
        value = value.flat(Infinity);
      }
      return {value};
    })), [inputResult.outputP, mergedPatterns]);

    const view: ToolView<Program> = hookMemo(() => ({
      render: renderWithReact((viewProps) =>
        <ExtractorToolView {...props} {...viewProps} inputResult={inputResult}/>
      ),
    }), [props, inputResult]);

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
      style={{fontSize: '50%', visibility: isPatternHovered || isEditing ? 'visible' : 'hidden'}}
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


type ExtractorToolViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult,
}

const ExtractorToolView = memo(function ExtractorToolView(props: ExtractorToolViewProps) {
  const { program, updateProgram, autoFocus, inputResult, frameBarBackdropElem } = props;
  const { patternsWithIds, minimized } = program;
  const programUP = useUpdateProxy(updateProgram);

  const [activePatternIndex, setActivePatternIndex] = useState(patternsWithIds.length);

  useEffect(() => {
    if (activePatternIndex > patternsWithIds.length) {  // can be an element of patterns, or a blank afterwards
      setActivePatternIndex(patternsWithIds.length);
    }
  }, [activePatternIndex, patternsWithIds.length])

  const setActivePattern = useCallback((pattern: Pattern) => {
    programUP.patternsWithIds.$apply((oldPatternsWithIds) => {
      let newPatternsWithIds = oldPatternsWithIds.slice();
      let activePatternWithId = newPatternsWithIds[activePatternIndex];
      if (!activePatternWithId) {
        newPatternsWithIds[activePatternIndex] = {id: randomId(), pattern};
      } else {
        newPatternsWithIds[activePatternIndex] = {id: activePatternWithId.id, pattern};
      }
      return newPatternsWithIds;
    })
  }, [activePatternIndex, programUP])

  const [hoverRef, isTopLevelHovered] = useHover();
  const isShiftHeld = useKeyHeld("Shift");

  const multiSelectMode = isTopLevelHovered && isShiftHeld;

  const activePattern: Pattern | undefined = patternsWithIds[activePatternIndex]?.pattern;
  const otherPatterns = patternsWithIds.map(patternWithId => patternWithId.pattern).filter((_, i) => i !== activePatternIndex);

  // todo: very hacky
  if (minimized) {
    return <div className="xRow xAlignVCenter" style={{padding: 2}}>
      <div
        style={{position: 'absolute', cursor: 'pointer', flexGrow: 1, right: 0, top: 0}}
        onClick={(ev) => {
          ev.preventDefault();
          programUP.minimized.$set(false);
        }}
      >
        ⊕
      </div>
      <ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$apply} autoFocus={autoFocus} />
      <div className="xCol">
        {patternsWithIds.map(({pattern, id}) =>
          <div key={id} style={{fontFamily: 'monospace', whiteSpace: 'nowrap'}}>
            {['', ...pattern.map(step => isWildcard(step) ? '★' : step)].join('.')}
          </div>
        )}
      </div>
    </div>;
  }

  return (
    <div ref={hoverRef} className="xCol" style={{height: '100%', boxSizing: 'border-box'}}>
      {frameBarBackdropElem && createPortal(inputFrameBarBackdrop, frameBarBackdropElem)}
      <div
        style={{position: 'absolute', cursor: 'pointer', flexGrow: 1, right: 0, top: 0}}
        onClick={(ev) => {
          ev.preventDefault();
          programUP.minimized.$set(true);
        }}
      >
        ⊖
      </div>
      <InputHeading
        slot={<ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$apply} autoFocus={autoFocus} />}
      />
      <div
        className="ExtractorTool-top xCol xGap10 xPad10"
        style={{
          position: 'sticky',
          zIndex: 1,  // otherwise, relatively positioned stuff goes on top?
          top: 0,
          background: 'white',
          boxShadow: '0 2px 2px 1px rgba(0,0,0,0.1)'
        }}
      >
        <div className="ExtractorTool-patterns xRow xGap10">
          <div style={{ fontWeight: 'bold' }}>
            patterns
          </div>
          <div className="xCol xShrinkable">
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
                      programUP.patternsWithIds.$apply((oldPatternsWithIds) => {
                        let newPatternsWithIds = [...oldPatternsWithIds];
                        // TODO agggrh this isn't enve correnct arrrrgh
                        newPatternsWithIds[patternIdx].pattern[stepIdx] = {wildcard: true};
                        return newPatternsWithIds;
                      })
                    }}
                    onRemove={() => {
                      programUP.patternsWithIds.$apply((oldPatternsWithIds) => {
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
      <div className="xPad10" style={{minHeight: 0, overflow: 'scroll', userSelect: 'none', WebkitUserSelect: 'none'}}>
        <ExtractorContext.Provider value={{activePattern, setActivePattern, otherPatterns, multiSelectMode}}>
          <ToolOutputView
            outputP={inputResult.outputP}
            customizations={customizations}
            expandedDepth={Infinity}
          />
        </ExtractorContext.Provider>
      </div>
    </div>
  );
})
