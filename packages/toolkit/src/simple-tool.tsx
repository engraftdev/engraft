import { EngraftPromise, hookRunTool, references, ShowView, slotWithCode, Tool, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps } from "@engraft/core";
import { hookDedupe, hookMemo, hooks, memoizeProps } from "@engraft/refunc";
import { arrEqWithRefEq, objEqWithRefEq, recordEqWith, refEq } from "@engraft/shared/lib/eq.js";
import { union } from "@engraft/shared/lib/sets.js";
import { UpdateProxy } from "@engraft/update-proxy";
import { useUpdateProxy } from "@engraft/update-proxy-react";

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
  'updateProgram'
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
    programFactory: (defaultInputCode) => (
      {
        toolName: simpleToolSpec.name,
        fields: simpleToolSpec.fields,
        subTools: Object.fromEntries(
          simpleToolSpec.subTools.map((key, i) =>
            [key, slotWithCode(i === 0 ? defaultInputCode : undefined)]
          )
        ) as Record<SubToolKey, ToolProgram>,
      }
    ),
    computeReferences: (program) => {
      const subToolPrograms = Object.values(program.subTools) as ToolProgram[];
      const subToolReferences = subToolPrograms.map(references);
      return union(...subToolReferences);
    },
    run: memoizeProps(hooks((props) => {
      const { program, varBindings } = props;

      const subToolResults: ToolResult[] = hookDedupe(
        // This loop doesn't need a fork because simpleToolSpec.subTools is constant.
        simpleToolSpec.subTools.map((key) => {
          const subToolProgram = program.subTools[key];
          return hookRunTool({program: subToolProgram, varBindings});
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
        render: (renderProps) => <SimpleToolView
          {...props}
          {...renderProps}
          simpleToolSpec={simpleToolSpec}
          subToolViews={subToolViews}
        />,
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

  return simpleToolSpec.render({
    ...props,
    fields: program.fields,
    fieldsUP: programUP.fields,
    renderSlot: (slotName, slotRenderProps) => {
      return <ShowView
        view={subToolViews[slotName]}
        updateProgram={programUP.subTools[slotName].$}
        {...slotRenderProps}
      />
    },
    ...renderProps,
  });
}
