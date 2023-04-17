import { ReactNode, memo, useContext, useMemo } from 'react';
import { Tool, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewContext, ToolViewRenderProps, VarBindings } from './core.js';
import { hookMemo } from '@engraft/refunc';
import { hookRunTool } from './runTool.js';

export type ProgramOf<T> = T extends Tool<infer P> ? P : never;
// alt: Parameters<T['run']>[1]['program'];

export const AddScopeVarBindings = memo((props: {
  newScopeVarBindings: VarBindings,
  children: ReactNode,
}) => {
  const { newScopeVarBindings, children } = props;

  const { scopeVarBindings } = useContext(ToolViewContext);
  const allScopeVarBindings = useMemo(() => ({
    ...scopeVarBindings,
    ...newScopeVarBindings,
  }), [scopeVarBindings, newScopeVarBindings]);

  return <ToolViewContext.Provider value={{
    scopeVarBindings: allScopeVarBindings,
  }}>
    {children}
  </ToolViewContext.Provider>
})

export type ViewWithNewScopeVarBindings<P extends ToolProgram> = {
  view: ToolView<P>,
  newScopeVarBindings: VarBindings
};

export type ToolResultWithNewScopeVarBindings<P extends ToolProgram = ToolProgram> =
  Omit<ToolResult<P>, 'view'> & { viewWithNewScopeVarBinding: ViewWithNewScopeVarBindings<P> };

export function hookAttachNewScopeVarBindings<P extends ToolProgram>(
  result: ToolResult<P>,
  newScopeVarBindings: VarBindings,
): ToolResultWithNewScopeVarBindings<P> {
  return hookMemo(() => ({
    ...result,
    view: undefined,
    viewWithNewScopeVarBinding: {
      view: result.view,
      newScopeVarBindings,
    }
  }), [result, newScopeVarBindings]);
}

export function hookRunToolWithNewScopeVarBindings<P extends ToolProgram>(
  props: ToolProps<P>,
  newScopeVarBindings: VarBindings,
): ToolResultWithNewScopeVarBindings<P> {
  const result = hookRunTool(props);
  return hookAttachNewScopeVarBindings(result, newScopeVarBindings);
}

export type ShowViewWithNewScopeVarBindingsProps<P extends ToolProgram> = ToolViewRenderProps<P> & ViewWithNewScopeVarBindings<P>;

const ShowViewWithNewScopeVarBindingsNoMemo = function ShowView<P extends ToolProgram>(props: ShowViewWithNewScopeVarBindingsProps<P>) {
  const {view, newScopeVarBindings, ...rest} = props;
  return <AddScopeVarBindings newScopeVarBindings={newScopeVarBindings}>
    {view.render(rest)}
  </AddScopeVarBindings>;
};

export const ShowViewWithNewScopeVarBindings = memo(ShowViewWithNewScopeVarBindingsNoMemo) as typeof ShowViewWithNewScopeVarBindingsNoMemo;
