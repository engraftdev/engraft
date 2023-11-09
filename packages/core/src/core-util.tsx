import { ReactNode, memo, useContext, useMemo } from 'react';
import { ShowView } from './ShowView.js';
import { Tool, ToolProgram, ToolProps, ToolResult, ToolViewContext, ToolViewRenderProps, VarBindings } from './core.js';
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

export type ToolResultWithScope<P extends ToolProgram = ToolProgram> = {
  result: ToolResult<P>,
  newScopeVarBindings: VarBindings,
}

export type ShowViewWithScopeProps<P extends ToolProgram> = Omit<ToolViewRenderProps<P>, 'view'> & {
  resultWithScope: ToolResultWithScope<P>,
};

const ShowViewWithScopeNoMemo = function <P extends ToolProgram>(props: ShowViewWithScopeProps<P>) {
  const {resultWithScope, ...rest} = props;
  return <AddScopeVarBindings newScopeVarBindings={resultWithScope.newScopeVarBindings}>
    <ShowView {...rest} view={resultWithScope.result.view} />
  </AddScopeVarBindings>;
};

export const ShowViewWithScope = memo(ShowViewWithScopeNoMemo) as typeof ShowViewWithScopeNoMemo;

export function hookRunToolWithNewVarBindings<P extends ToolProgram>(
  props: ToolProps<P> & { newVarBindings: VarBindings }
): ToolResultWithScope<P> {
  const allVarBindings = hookMemo(() => ({
    ...props.varBindings,
    ...props.newVarBindings,
  }), [props.varBindings, props.newVarBindings]);

  const result = hookRunTool({...props, varBindings: allVarBindings});

  return { result, newScopeVarBindings: props.newVarBindings };
}
