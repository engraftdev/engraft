import { EngraftPromise, hookRunTool, Tool, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps } from "@engraft/core";
import { renderWithReact, ShowView } from '@engraft/react';
import { hookDedupe, hookMemo, hooks, memoizeProps } from "@engraft/refunc-react";
import { arrEqWithRefEq, objEqWithRefEq, recordEqWith, refEq } from "@engraft/shared/lib/eq.js";
import { UpdateProxy, useUpdateProxy } from "@engraft/update-proxy-react";
import { useCallback } from "react";

// "defineSimpleTool" provides a simple way to define a tool that has a fixed
// number of sub-tools and that works in a simple way. See tool-toy-adder-simple
// for an example use.

export type SimpleToolProgram<Name extends string, Fields extends object, SubToolKey extends string> = {
  toolName: Name,
  fields: Fields,
  subTools: {
    [K in SubToolKey]: ToolProgram
  }
}

export type RenderProps = Omit<
  ToolViewRenderProps<any>,
  'updateProgram' | 'scopeVarBindings'
>

export type SimpleToolSpec<Name extends string, Fields extends object, SubToolKey extends string> = {
  name: Name,
  fields: Fields,
  subTools: readonly SubToolKey[],
  compute: (props: {
    fields: Fields,
    subToolOutputs: {
      [K in SubToolKey]: unknown
    }
  }) => unknown,
  render: (props: RenderProps & {
    fields: Fields,
    fieldsUP: UpdateProxy<Fields>,
    renderSlot: (
      slotName: SubToolKey, renderProps?: RenderProps
    ) => React.ReactElement,
  }) => React.ReactElement,
}

export function defineSimpleTool<Name extends string, Fields extends object, SubToolKey extends string>(
  simpleToolSpec: SimpleToolSpec<Name, Fields, SubToolKey>
): Tool<SimpleToolProgram<Name, Fields, SubToolKey>> {
  return {
    name: simpleToolSpec.name,
    makeProgram: (context, defaultInputCode) => (
      {
        toolName: simpleToolSpec.name,
        fields: simpleToolSpec.fields,
        subTools: Object.fromEntries(
          simpleToolSpec.subTools.map((key, i) =>
            [key, context.makeSlotWithCode(i === 0 ? defaultInputCode : undefined)]
          )
        ) as Record<SubToolKey, ToolProgram>,
      }
    ),
    collectReferences: (program) => Object.values(program.subTools),
    run: memoizeProps(hooks((props) => {
      const { program, varBindings, context } = props;

      const subToolResults: ToolResult[] = hookDedupe(
        // This loop doesn't need a fork because simpleToolSpec.subTools is constant.
        simpleToolSpec.subTools.map((key) => {
          const subToolProgram = program.subTools[key];
          return hookRunTool({program: subToolProgram, varBindings, context});
        }),
        arrEqWithRefEq
      );

      const subToolOutputPs = hookDedupe(
        subToolResults.map((result) => result.outputP),
        arrEqWithRefEq
      );

      const outputP = hookMemo(() =>
        EngraftPromise.all(subToolOutputPs)
          .then((subToolOutputs) => {
            return {
              value: simpleToolSpec.compute({
                fields: program.fields,
                subToolOutputs: Object.fromEntries(
                  simpleToolSpec.subTools.map((key, i) => [key, subToolOutputs[i].value])
                ) as Record<SubToolKey, any>,
              })
            };
          }),
        [program.fields, subToolOutputPs],
        recordEqWith([objEqWithRefEq, refEq] as const)
      );

      // object keyed by subToolKeys
      const subToolViews = Object.fromEntries(
        simpleToolSpec.subTools.map((key, i) => {
          const subToolResult = subToolResults[i];
          return [key, subToolResult.view];
        })
      ) as Record<SubToolKey, ToolView<ToolProgram>>;

      const view: ToolView<SimpleToolProgram<Name, Fields, SubToolKey>> = {
        render: renderWithReact((renderProps) => <SimpleToolView
          {...props}
          {...renderProps}
          simpleToolSpec={simpleToolSpec}
          subToolViews={subToolViews}
        />),
      };

      return {outputP, view};
    })),
  };
}

export function SimpleToolView<Name extends string, Fields extends object, SubToolKey extends string>(
  props: ToolProps<SimpleToolProgram<Name, Fields, SubToolKey>>
    & ToolViewRenderProps<SimpleToolProgram<Name, Fields, SubToolKey>> & {
      simpleToolSpec: SimpleToolSpec<Name, Fields, SubToolKey>,
      subToolViews: Record<SubToolKey, ToolView<ToolProgram>>,
    }
) {
  const {program, updateProgram, simpleToolSpec, subToolViews, ...renderProps} = props;
  const programUP = useUpdateProxy(updateProgram);

  const renderSlot = useCallback((slotName: SubToolKey, slotRenderProps?: RenderProps) => {
    return <ShowView
      view={subToolViews[slotName]}
      updateProgram={programUP.subTools[slotName].$}
      {...slotRenderProps}
    />
  }, [programUP, subToolViews]);

  return <simpleToolSpec.render
    fields={program.fields}
    fieldsUP={programUP.fields}
    renderSlot={renderSlot}
    {...renderProps}
  />;
}
