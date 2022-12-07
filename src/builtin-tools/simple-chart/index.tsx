import { memo, ReactNode, useMemo, useState } from "react";
import Select, { Props as SelectProps } from 'react-select';
import { VegaLite, VisualizationSpec } from "react-vega";
import { hasValue, ProgramFactory, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, valueOrUndefined } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { Updater, useAt } from "src/util/state";
import { slotSetTo } from "../slot";
import { gearIcon, markIcons, typeIcons } from "./icons";

export type Program = {
  toolName: 'simple-chart',
  dataProgram: ToolProgram,
  mark: Mark | undefined,
  xField: Field | undefined,
  xExtraProgram: ToolProgram,
  yField: Field | undefined,
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
    const xExtra = valueOrUndefined(xExtraOutput);
    const yExtra = valueOrUndefined(yExtraOutput);

    const spec: VisualizationSpec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      mark: mark || 'bar',
      encoding: {
        ...xField && {
          x: {field: xField.name, type: xField.type, ...(xExtra as any)},
        },
        ...yField && {
          y: {field: yField.name, type: yField.type, ...(yExtra as any)},
        }
      },
      data: { name: 'values' },
    };

    return spec;
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

type FieldType = 'quantitative' | 'nominal' | 'ordinal' | 'temporal';

type Field = {
  name: string,
  type: FieldType,
}

// TODO: only looks at first row; assumes no missing data
function getFields(data: TabularData): Field[] {
  const fields: Field[] = [];
  const row = data[0];
  for (const [key, value] of Object.entries(row)) {
    let type: FieldType;
    if (typeof value === 'number') {
      type = 'quantitative';
    } else if (typeof value === 'string') {
      type = 'nominal';
    } else if (value instanceof Date) {
      type = 'temporal';
    } else {
      throw new Error(`Unknown type for value ${value}`);
    }
    fields.push({
      name: key,
      type
    });
  }
  return fields;
}



type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  dataView: ToolView | null,
  dataOutput: ToolOutput | null,
  xExtraView: ToolView | null,
  yExtraView: ToolView | null,
}

const View = memo(function View(props: ViewProps) {
  const { program, updateProgram, dataView, dataOutput, xExtraView, yExtraView } = props;

  const [ mark, updateMark ] = useAt(program, updateProgram, 'mark');
  const [ xField, updateXField ] = useAt(program, updateProgram, 'xField');
  const [ yField, updateYField ] = useAt(program, updateProgram, 'yField');

  const markOptions: OptionWithIcon<Mark>[] = useMemo(() => {
    return marks.map(mark => ({value: mark, label: mark, icon: markIcons[mark]}));
  }, []);

  const markOption = useMemo(() => {
    return markOptions.find(option => option.value === mark)!;
  }, [mark, markOptions]);

  const fields = useMemo(() => {
    try {
      if (hasValue(dataOutput)) {
        return getFields(dataOutput.value as any);
      }
    } catch {}

    return [];
  }, [dataOutput]);

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
    menuPortalTarget: document.body,
    // TODO: can't get this to work so I'm putting .live-compose-root onto individual items, shrug
    // classNames: {
    //   menuPortal: () => 'live-compose-root',
    // }
  };

  return <div className="xPad10 xGap10" style={{display: 'grid', gridTemplateColumns: 'repeat(2, auto)'}}>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', alignSelf: 'center'}}>data</div>
    <div style={{width: 250}}>
      <ShowView view={dataView} expand={true}/>
    </div>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>mark</div>
    <div className="xRow xGap10" style={{width: 250}}>
      <Select
        options={markOptions}
        value={markOption}
        onChange={(markOption) => updateMark(() => markOption?.value)}
        formatOptionLabel={formatOptionLabel}
        {...selectProps}
      />
      <SettingsToggle active={false} setActive={() => {}} />
    </div>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>x-axis</div>
    <FieldEditor
      allFields={fields}
      field={xField}
      updateField={updateXField}
      selectProps={selectProps}
      extraView={xExtraView}
    />
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>y-axis</div>
    <FieldEditor
      allFields={fields}
      field={yField}
      updateField={updateYField}
      selectProps={selectProps}
      extraView={yExtraView}
    />
  </div>;
});

type FieldEditorProps = {
  allFields: Field[],
  field: Field | undefined,
  updateField: Updater<Field | undefined>,
  selectProps?: SelectProps<any, false>,
  extraView: ToolView | null,
}

const FieldEditor = memo(function FieldEditor(props: FieldEditorProps) {
  const {allFields: fields, field: selectedField, updateField, selectProps, extraView} = props;

  const options: OptionWithIcon<string>[] = useMemo(() => {
    return fields.map(({name, type}) => ({
      value: name,
      label: name,
      icon: typeIcons[name === selectedField?.name ? selectedField.type : type],
    }));
  }, [fields, selectedField]);

  const selectedOption = useMemo(() => {
    return options.find(option => option.value === selectedField?.name);
  }, [options, selectedField]);

  const [ showSettings, setShowSettings ] = useState(false);

  return <div className="xCol xGap10">
    <div className="xRow xGap10" style={{width: 250}}>
      <Select
        isClearable={true}
        options={options}
        value={selectedOption}
        onChange={(option: OptionWithIcon<string> | null) => {
          if (option) {
            const field = fields.find(field => field.name === option.value);
            updateField(() => field);
          } else {
            updateField(() => undefined);
            return;
          }
        }}
        formatOptionLabel={formatOptionLabel}
        {...selectProps}
      />
      <SettingsToggle
        active={showSettings}
        setActive={setShowSettings}
      />
    </div>
    { showSettings &&
      <div className="xRow xGap10" style={{width: 250}}>
        <ShowView view={extraView} />
      </div>
    }
  </div>
})

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

export const formatOptionLabel = ({icon, label}: OptionWithIcon<any>) => (
  <div className="xRow live-compose-root">
    <span style={{color: '#717a94', marginRight: 7}}>
      {icon}
    </span>
    {label}
  </div>
);
