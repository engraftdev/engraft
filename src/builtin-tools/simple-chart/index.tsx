import { memo, useMemo } from "react";
import { hasValue, ProgramFactory, ToolProgram, ToolProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { slotSetTo } from "../slot";
import Select from 'react-select'
import { updateF } from "src/util/updateF";
import { VegaLite } from "react-vega";

export type Program = {
  toolName: 'simple-chart',
  dataProgram: ToolProgram,
  xField: string | undefined,
  yField: string | undefined,
}

export const programFactory: ProgramFactory<Program> = (defaultInputCode?: string) => {
  return {
    toolName: 'simple-chart',
    dataProgram: slotSetTo(defaultInputCode || ''),
    xField: undefined,
    yField: undefined,
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const [dataComponent, dataView, dataOutput] = useSubTool({program, updateProgram, subKey: 'dataProgram', varBindings});

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

  useOutput(reportOutput, useMemo(() => {
    if (hasValue(dataOutput) && xOption !== undefined && yOption !== undefined) {
      return {
        value:
          <VegaLite
            data={{values: dataOutput.value}}
            spec={{
              $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
              mark: 'point',
              encoding: {
                x: {field: xOption.value, type: 'quantitative'},
                y: {field: yOption.value, type: 'quantitative'}
              },
              data: { name: 'values' },
            }}
          />
      }
    }
  }, [dataOutput, xOption, yOption]));

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
        <Select
          options={fieldNames.map(name => ({value: name, label: name}))}
          value={xOption}
          onChange={(xField) => updateProgram(updateF({xField: {$set: xField?.value}}))}
        />
        <b style={{justifySelf: 'end'}}>y</b>
        <Select
          options={fieldNames.map(name => ({value: name, label: name}))}
          value={yOption}
          onChange={(yField) => updateProgram(updateF({yField: {$set: yField?.value}}))}
        />
      </div>
  }), [dataView, fieldNames, updateProgram, xOption, yOption]));

  return <>
    {dataComponent}
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
