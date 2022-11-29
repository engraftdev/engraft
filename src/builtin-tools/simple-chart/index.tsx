import { memo, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { slotSetTo } from "../slot";
import Select from 'react-select'
import { updateF } from "src/util/updateF";
import { VegaLite, VisualizationSpec } from "react-vega";

export type Program = {
  toolName: 'simple-chart',
  dataProgram: ToolProgram,
  xField: string | undefined,
  xExtraProgram: ToolProgram,
  yField: string | undefined,
  yExtraProgram: ToolProgram,
}

export const programFactory: ProgramFactory<Program> = (defaultInputCode?: string) => {
  return {
    toolName: 'simple-chart',
    dataProgram: slotSetTo(defaultInputCode || ''),
    xField: undefined,
    xExtraProgram: slotSetTo(''),
    yField: undefined,
    yExtraProgram: slotSetTo(''),
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [dataComponent, dataView, dataOutput] = useSubTool({program, updateProgram, subKey: 'dataProgram', varBindings});
  const [xExtraComponent, xExtraView, xExtraOutput] = useSubTool({program, updateProgram, subKey: 'xExtraProgram', varBindings});
  const [yExtraComponent, yExtraView, yExtraOutput] = useSubTool({program, updateProgram, subKey: 'yExtraProgram', varBindings});

  const fieldNames = useMemo(() => {
    try {
      if (hasValue(dataOutput)) {
        return getFieldNames(dataOutput.value as any);
      }
    } catch {}

    return [];
  }, [dataOutput]);

  const options = useMemo(() => {
    return fieldNames.map(name => ({value: name, label: name}));
  }, [fieldNames]);

  const xOption = useMemo(() => {
    return options.find(option => option.value === program.xField);
  }, [options, program.xField]);

  const yOption = useMemo(() => {
    return options.find(option => option.value === program.yField);
  }, [options, program.yField]);

  const spec = useMemo(() => {
    if (xOption !== undefined && yOption !== undefined) {
      const xExtra = valueOrUndefined(xExtraOutput);
      const yExtra = valueOrUndefined(yExtraOutput);

      const spec: VisualizationSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        mark: 'point',
        encoding: {
          x: {field: xOption.value, type: 'quantitative', ...(xExtra as any)},
          y: {field: yOption.value, type: 'quantitative', ...(yExtra as any)},
        },
        data: { name: 'values' },
      };

      return spec;
    }
  }, [xExtraOutput, xOption, yExtraOutput, yOption]);

  useOutput(reportOutput, useMemo(() => {
    if (hasValue(dataOutput) && spec !== undefined) {
      return {
        value:
          <VegaLite
            data={{values: dataOutput.value}}
            spec={spec}
          />
      }
    }
  }, [dataOutput, spec]));

  useView(reportView, useMemo(() => ({
    render: () =>
      <div className="xPad10 xGap10" style={{display: 'grid', gridTemplateColumns: 'repeat(2, auto)'}}>
        <b style={{justifySelf: 'end'}}>data</b>
        <ShowView view={dataView} />
        <b style={{justifySelf: 'end'}}>mark</b>
        <Select
          options={[{value: 'point', label: 'point'}]}
          value={{value: 'point', label: 'point'}}
        />
        <b style={{justifySelf: 'end'}}>x</b>
        <div className="xRow xGap10">
          <Select
            options={fieldNames.map(name => ({value: name, label: name}))}
            value={xOption}
            onChange={(xField) => updateProgram(updateF({xField: {$set: xField?.value}}))}
          />
          <ShowView view={xExtraView} />
        </div>
        <b style={{justifySelf: 'end'}}>y</b>
        <div className="xRow xGap10">
          <Select
            options={fieldNames.map(name => ({value: name, label: name}))}
            value={yOption}
            onChange={(yField) => updateProgram(updateF({yField: {$set: yField?.value}}))}
          />
          <ShowView view={yExtraView} />
        </div>
      </div>
  }), [dataView, fieldNames, updateProgram, xExtraView, xOption, yExtraView, yOption]));

  return <>
    {dataComponent}
    {xExtraComponent}
    {yExtraComponent}
  </>
});

type TabularData = {[key: string]: any}[];

function getFieldNames(data: TabularData) {
  const fieldNames = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) {
      fieldNames.add(key);
    }
  }
  return [...fieldNames];
}
