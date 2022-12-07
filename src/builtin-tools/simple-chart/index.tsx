import { memo, ReactNode, useMemo, useState } from "react";
import Select, { Props as SelectProps } from 'react-select';
import { VegaLite, VisualizationSpec } from "react-vega";
import { hasValue, ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { updateF } from "src/util/updateF";
import { slotSetTo } from "../slot";
import { gearIcon, markIcons, typeIcons } from "./icons";

export type Program = {
  toolName: 'simple-chart',
  dataProgram: ToolProgram,
  mark: Mark | undefined,
  xField: string | undefined,
  xExtraProgram: ToolProgram,
  yField: string | undefined,
  yExtraProgram: ToolProgram,
}

export type Mark = 'bar' | 'line' | 'area' | 'point';
const marks: Mark[] = ['bar', 'line', 'area', 'point'];

export const programFactory: ProgramFactory<Program> = (defaultInputCode?: string) => {
  return {
    toolName: 'simple-chart',
    dataProgram: slotSetTo(defaultInputCode || ''),
    mark: 'bar',
    xField: undefined,
    xExtraProgram: slotSetTo(''),
    yField: undefined,
    yExtraProgram: slotSetTo(''),
  }
};

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;

  const { mark = 'bar', xField, yField } = program;

  const [dataComponent, dataView, dataOutput] = useSubTool({program, updateProgram, subKey: 'dataProgram', varBindings});
  const [xExtraComponent, xExtraView, xExtraOutput] = useSubTool({program, updateProgram, subKey: 'xExtraProgram', varBindings});
  const [yExtraComponent, yExtraView, yExtraOutput] = useSubTool({program, updateProgram, subKey: 'yExtraProgram', varBindings});

  const spec = useMemo(() => {
    if (xField !== undefined && yField !== undefined) {
      const xExtra = valueOrUndefined(xExtraOutput);
      const yExtra = valueOrUndefined(yExtraOutput);

      const spec: VisualizationSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        mark: mark || 'bar',
        encoding: {
          x: {field: xField, type: 'quantitative', ...(xExtra as any)},
          y: {field: yField, type: 'quantitative', ...(yExtra as any)},
        },
        data: { name: 'values' },
      };

      return spec;
    }
  }, [mark, xExtraOutput, xField, yExtraOutput, yField]);

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
    render: () => <View
      {...props}
      dataView={dataView} dataOutput={dataOutput}
      xExtraView={xExtraView}
      yExtraView={yExtraView}
    />,
  }), [dataOutput, dataView, props, xExtraView, yExtraView]));

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



type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  dataView: ToolView | null,
  dataOutput: ToolOutput | null,
  xExtraView: ToolView | null,
  yExtraView: ToolView | null,
}

const View = memo(function View(props: ViewProps) {
  const { program, updateProgram, dataView, dataOutput, xExtraView, yExtraView } = props;

  const { mark = 'bar', xField, yField } = program;

  const markOptions = useMemo(() => {
    return marks.map(mark => ({value: mark, label: mark, icon: markIcons[mark]}));
  }, []);

  const markOption = useMemo(() => {
    return markOptions.find(option => option.value === mark)!;
  }, [mark, markOptions]);

  const fieldNames = useMemo(() => {
    try {
      if (hasValue(dataOutput)) {
        return getFieldNames(dataOutput.value as any);
      }
    } catch {}

    return [];
  }, [dataOutput]);

  const fieldOptions = useMemo(() => {
    return fieldNames.map(name => ({value: name, label: name, icon: typeIcons['quantitative']}));
  }, [fieldNames]);

  const xOption = useMemo(() => {
    return fieldOptions.find(option => option.value === xField);
  }, [fieldOptions, xField]);

  const yOption = useMemo(() => {
    return fieldOptions.find(option => option.value === yField);
  }, [fieldOptions, yField]);


  const [ showSettingsX, setShowSettingsX ] = useState(false);
  const [ showSettingsY, setShowSettingsY ] = useState(false);

  return <div className="xPad10 xGap10" style={{display: 'grid', gridTemplateColumns: 'repeat(2, auto)'}}>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', alignSelf: 'center'}}>data</div>
    <div style={{width: 200}}>
      <ShowView view={dataView} expand={true}/>
    </div>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>mark</div>
    <div className="xRow xGap10" style={{width: 200}}>
      <Select
        options={markOptions}
        value={markOption}
        onChange={(markOption) => updateProgram(updateF({mark: {$set: markOption?.value}}))}
        formatOptionLabel={formatOptionLabel}
        {...selectProps}
      />
      <SettingsToggle active={false} setActive={() => {}} />
    </div>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>x-axis</div>
    <div className="xCol xGap10">
      <div className="xRow xGap10" style={{width: 200}}>
        <Select
          options={fieldOptions}
          value={xOption}
          onChange={(xField) => updateProgram(updateF({xField: {$set: xField?.value}}))}
          formatOptionLabel={formatOptionLabel}
          {...selectProps}
        />
        <SettingsToggle active={showSettingsX} setActive={setShowSettingsX} />
      </div>
      { showSettingsX &&
        <div className="xRow xGap10" style={{width: 200}}>
          <ShowView view={xExtraView} />
        </div>
      }
    </div>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>y-axis</div>
    <div className="xCol xGap10">
      <div className="xRow xGap10" style={{width: 200}}>
        <Select
          options={fieldOptions}
          value={yOption}
          onChange={(yField) => updateProgram(updateF({yField: {$set: yField?.value}}))}
          formatOptionLabel={formatOptionLabel}
          {...selectProps}
        />
        <SettingsToggle active={showSettingsY} setActive={setShowSettingsY} />
      </div>
      { showSettingsY &&
        <div className="xRow xGap10" style={{width: 200}}>
          <ShowView view={yExtraView} />
        </div>
      }
    </div>
  </div>;
});

const SettingsToggle = memo(function SettingsToggle(props: {active: boolean, setActive: (active: boolean) => void}) {
  return <div
    className="xRow xAlignHCenter xAlignVCenter"
    style={{
      cursor: 'pointer',
      ...props.active && {
        color: 'rgb(37, 70, 133)',
        backgroundColor: 'rgba(72, 113, 194, 0.25)',
      },
      borderRadius: 4,
      height: '100%',
      aspectRatio: '1 / 1',
    }}
    onClick={() => props.setActive(!props.active)}
  >
    {gearIcon}
  </div>;
});

export type OptionWithIcon<Value> = {
  value: Value,
  label: string,
  icon: ReactNode,
}

export const formatOptionLabel = ({icon, label}: OptionWithIcon<Mark>) => (
  <div className="xRow">
    <span style={{color: '#717a94', marginRight: 7}}>
      {icon}
    </span>
    {label}
  </div>
);

const selectProps: SelectProps<any, false> = {
  theme: (theme) => ({
    ...theme,
    colors: {
      ...theme.colors,
      primary: "#ccc",
      neutral0: "#fff",
    },
  }),
  styles: {
    container: (baseStyles) => ({
      ...baseStyles,
      flexGrow: 1,
    }),
    control: (base) => ({
      ...base,
      minHeight: 32,
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '0 2px',
    }),
    clearIndicator: (base) => ({
      ...base,
      paddingTop: 0,
      paddingBottom: 0,
    }),
  },
};
