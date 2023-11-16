import { VarBindings, ToolProgram, ToolViewRender, ToolViewRenderProps, ToolView, ToolResultWithScope } from '@engraft/core';
import { hooks, hookMemo, RefuncMemory } from '@engraft/refunc';
import { ReactNode, createContext, memo, useContext, useMemo, useState, useRef, useLayoutEffect, ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

export * from "./EngraftPromise-react.js";


// Engraft has its own, framework-agnostic view system. This package provides
// adapters between this system and React. That means it provides...
// 1. A way to write Engraft views with React (renderWithReact), and
// 2. A way to render Engraft views within React (ShowView).

// These are mostly independent, except that, as a convenience, we use React
// context to automatically propagate scopeVarBindings. That means that, if
// ShowView is used under renderWithReact, it does not needed to be provided
// with scopeVarBindings by hand.


// First, the shared context system.

export const ScopeVarBindingsContext = createContext(undefined as VarBindings | undefined);

export const AddScopeVarBindings = memo((props: {
  newScopeVarBindings: VarBindings,
  children: ReactNode,
}) => {
  const { newScopeVarBindings, children } = props;

  const scopeVarBindings = useContext(ScopeVarBindingsContext);
  const allScopeVarBindings = useMemo(() => ({
    ...scopeVarBindings,
    ...newScopeVarBindings,
  }), [scopeVarBindings, newScopeVarBindings]);

  return <ScopeVarBindingsContext.Provider value={allScopeVarBindings}>
    {children}
  </ScopeVarBindingsContext.Provider>
})


// Next, #1 above: renderWithReact.

export function renderWithReact<P extends ToolProgram>(
  renderReact: (props: ToolViewRenderProps<P>) => ReactElement
): ToolViewRender<P> {
  return hooks((props, element) => {
    const root = hookMemo(() => createRoot(element), [element]);
    root.render(
      <ScopeVarBindingsContext.Provider value={props.scopeVarBindings}>
        {renderReact(props)}
      </ScopeVarBindingsContext.Provider>
    );
  });
}


// Next, #2 above: ShowView.

export type ShowViewProps<P extends ToolProgram> =
  & Omit<ToolViewRenderProps<P>, 'scopeVarBindings'>
  & {
      view: ToolView<P>,
      scopeVarBindings?: VarBindings,
    }

const ShowViewUnmemoed = function ShowView<P extends ToolProgram>({view, scopeVarBindings, ...restProps}: ShowViewProps<P>) {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const memoryRef = useRef(new RefuncMemory());

  const contextScopeVarBindings = useContext(ScopeVarBindingsContext);
  scopeVarBindings = scopeVarBindings ?? contextScopeVarBindings;
  if (scopeVarBindings === undefined) {
    throw new Error('scopeVarBindings must be provided to ShowView, either directly or via ScopeVarBindingsContext');
  }
  const actualScopeVarBindings = scopeVarBindings;

  const renderProps = useMemo(() => ({
    ...restProps,
    scopeVarBindings: actualScopeVarBindings,
  }), [restProps, actualScopeVarBindings]);

  useLayoutEffect(() => {
    if (div) {
      view.render(memoryRef.current, renderProps, div);
    }
  }, [div, renderProps, view]);

  return <div ref={setDiv} />;
};
export const ShowView = memo(ShowViewUnmemoed) as typeof ShowViewUnmemoed;


// Great. The only thing left is a utility function to help render ToolResultWithScope.

export type ShowViewWithScopeProps<P extends ToolProgram> =
  & Omit<ShowViewProps<P>, 'view'>
  & {
      resultWithScope: ToolResultWithScope<P>,
    }

const ShowViewWithScopeUnmemoed = function <P extends ToolProgram>(props: ShowViewWithScopeProps<P>) {
  const {resultWithScope, ...rest} = props;
  return <AddScopeVarBindings newScopeVarBindings={resultWithScope.newScopeVarBindings}>
    <ShowView {...rest} view={resultWithScope.result.view} />
  </AddScopeVarBindings>;
};
export const ShowViewWithScope = memo(ShowViewWithScopeUnmemoed) as typeof ShowViewWithScopeUnmemoed;
