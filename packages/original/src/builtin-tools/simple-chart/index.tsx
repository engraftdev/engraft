import { ComputeReferences, EngraftPromise, hookRunTool, ProgramFactory, references, ShowView, slotWithCode, ToolOutput, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, usePromiseState } from "@engraft/core";
import { hookMemo, hooks, memoizeProps } from "@engraft/incr";
import { memo, ReactNode, useEffect, useMemo, useState } from "react";
import * as SelectModule from "react-select";
import { Props as SelectProps } from "react-select";
import { VegaLite, VisualizationSpec } from "react-vega";
import { UpdateProxy } from "@engraft/update-proxy";
import { useUpdateProxy } from "@engraft/update-proxy-react";
import { gearIcon, markIcons, typeIcons } from "./icons.js";

// TODO: what hath ESM wrought?
const Select = SelectModule.default as unknown as typeof import("react-select").default;

export type Program = {
  toolName: 'simple-chart',
  dataProgram: ToolProgram,
  mark: Mark | undefined,
  xChannel: ChannelSpec | undefined,
  yChannel: ChannelSpec | undefined,
}

export type Mark = 'bar' | 'line' | 'area' | 'point';
const marks: Mark[] = ['bar', 'line', 'area', 'point'];

export const programFactory: ProgramFactory<Program> = (defaultInputCode?: string) => {
  return {
    toolName: 'simple-chart',
    dataProgram: slotWithCode(defaultInputCode || ''),
    mark: 'bar',
    xChannel: undefined,
    yChannel: undefined,
  }
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  references(program.dataProgram);

export const run = memoizeProps(hooks((props: ToolProps<Program>) => {
  const { program, varBindings } = props;
  const { mark = 'bar', xChannel, yChannel } = program;

  const dataResult = hookRunTool({program: program.dataProgram, varBindings});

  const spec = hookMemo(() => {
    const spec: VisualizationSpec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      mark: mark || 'bar',
      encoding: {
        ...xChannel && { x: xChannel },
        ...yChannel && { y: yChannel },
      },
      data: { name: 'values' },
    };

    return spec;
  }, [mark, xChannel, yChannel]);

  const outputP: EngraftPromise<ToolOutput> = hookMemo(() => dataResult.outputP.then((dataOutput) => {
    return {
      value:
        <VegaLite
          data={{values: dataOutput.value}}
          spec={spec}
        />
    }
  }), [dataResult, spec]);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (renderProps) => <View
      {...props} {...renderProps}
      dataResult={dataResult}
    />,
  }), [props, dataResult]);

  return { outputP, view };
}));

type TabularData = {[key: string]: any}[];

type ChannelType = 'quantitative' | 'nominal' | 'ordinal' | 'temporal';
const channelTypes: ChannelType[] = ['quantitative', 'nominal', 'ordinal', 'temporal'];

type ChannelAggregate = 'count' | 'sum' | 'mean' | 'median' | 'min' | 'max';
const channelAggregates: ChannelAggregate[] = ['count', 'sum', 'mean', 'median', 'min', 'max'];

type ChannelSpec = ChannelSpecFromField;
type ChannelSpecFromField = {
  field: string,
  type: ChannelType,
  aggregate?: ChannelAggregate,
  bin?: boolean,
  // TODO: cool idea; not implemented
  // extraProgram: ToolProgram,
};

// TODO: only looks at first row; assumes no missing data
function getChannelTemplatesFromData(data: TabularData): ChannelSpec[] {
  const fields: ChannelSpec[] = [];
  const row = data[0];
  for (const [key, value] of Object.entries(row)) {
    let type: ChannelType;
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
      field: key,
      type
    });
  }
  return fields;
}



type ViewProps = ToolProps<Program> & ToolViewRenderProps<Program> & {
  dataResult: ToolResult,
}

const View = memo(function View(props: ViewProps) {
  const { program, updateProgram, dataResult } = props;
  const { mark = 'bar', xChannel, yChannel } = program;
  const programUP = useUpdateProxy(updateProgram);
  const dataOutputState = usePromiseState(dataResult.outputP);

  const markOptions: OptionWithIcon<Mark>[] = useMemo(() => {
    return marks.map(mark => ({value: mark, label: mark, icon: markIcons[mark]}));
  }, []);

  const markOption = useMemo(() => {
    return markOptions.find(option => option.value === mark)!;
  }, [mark, markOptions]);

  const channelTemplates: ChannelSpec[] = useMemo(() => {
    try {
      if (dataOutputState.status === 'fulfilled') {
        return [
          ...getChannelTemplatesFromData(dataOutputState.value.value as any),
          // TODO: add "COUNT" option
        ];
      }
    } catch {}

    return [];
  }, [dataOutputState]);

  const selectProps: SelectProps<any, false> = useMemo(() => ({
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
  }), []);

  return <div className="xPad10 xGap10" style={{display: 'grid', gridTemplateColumns: 'repeat(2, auto)'}}>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', alignSelf: 'center'}}>data</div>
    <div style={{width: 250}}>
      <ShowView view={dataResult.view} updateProgram={programUP.dataProgram.$} expand={true}/>
    </div>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>mark</div>
    <div className="xRow xGap10" style={{width: 250}}>
      <Select
        options={markOptions}
        value={markOption}
        onChange={(markOption) => programUP.mark.$set(markOption?.value)}
        formatOptionLabel={formatOptionLabel}
        {...selectProps}
      />
      <SettingsToggle active={false} setActive={() => {}} />
    </div>
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>x-axis</div>
    <FieldEditor
      channelTemplates={channelTemplates}
      channel={xChannel}
      channelUP={programUP.xChannel}
      selectProps={selectProps}
    />
    <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end', paddingTop: 5}}>y-axis</div>
    <FieldEditor
      channelTemplates={channelTemplates}
      channel={yChannel}
      channelUP={programUP.yChannel}
      selectProps={selectProps}
    />
  </div>;
});

type FieldEditorProps = {
  channelTemplates: ChannelSpec[],
  channel: ChannelSpec | undefined,
  channelUP: UpdateProxy<ChannelSpec | undefined>,
  selectProps?: SelectProps<any, false>,
}

const FieldEditor = memo(function FieldEditor(props: FieldEditorProps) {
  const {channelTemplates, channel, channelUP, selectProps} = props;

  const options: OptionWithIcon<string>[] = useMemo(() => {
    return channelTemplates.map((template) => {
      const {field, type} = template;
      let newType = type;
      if (channel && template.field === channel.field) {
        newType = channel.type;
      }
      return {
        value: field,
        label: field,
        icon: typeIcons[newType],
      }
    });
  }, [channelTemplates, channel]);

  const selectedOption = useMemo(() => {
    return options.find(option => option.value === channel?.field);
  }, [options, channel]);

  const [ showSettings, setShowSettings ] = useState(false);

  useEffect(() => {
    if (!channel) {
      setShowSettings(false);
    }
  }, [channel])

  return <div className="xCol xGap10">
    <div className="xRow xGap10" style={{width: 250}}>
      <Select
        isClearable={true}
        options={options}
        value={selectedOption}
        onChange={(option: OptionWithIcon<string> | null) => {
          if (option) {
            const template = channelTemplates.find(template => template.field === option.value);
            channelUP.$set(template);
          } else {
            channelUP.$set(undefined);
          }
        }}
        formatOptionLabel={formatOptionLabel}
        {...selectProps}
      />
      <SettingsToggle
        active={showSettings}
        setActive={setShowSettings}
        disabled={!channel}
      />
    </div>
    { showSettings && channel &&
      <div className="xGap10" style={{display: 'grid', gridTemplateColumns: 'repeat(2, auto)'}}>
        <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end'}}>type</div>
        <div className="xRow xGap10" style={{width: 150}}>
          <select
            value={channel.type}
            onChange={(e) => channelUP.type.$set(e.target.value as ChannelType)}
          >
            {channelTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end'}}>aggregate</div>
        <div className="xRow xGap10" style={{width: 150}}>
          <select
            value={channel.aggregate || ""}
            onChange={(e) => channelUP.aggregate.$set(e.target.value === "" ? undefined : e.target.value as ChannelAggregate)}
          >
            <option value="">none</option>
            {channelAggregates.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div style={{color: 'rgb(113, 122, 148)', justifySelf: 'end'}}>binning?</div>
        <div className="xRow xGap10" style={{width: 150}}>
          <select
            value={channel.bin ? "true" : "false"}
            onChange={(e) => channelUP.bin.$set(e.target.value === 'true')}
          >
            <option value="false">off</option>
            <option value="true">on</option>
          </select>
        </div>
      </div>
    }
  </div>
})

const SettingsToggle = memo(function SettingsToggle(props: {active: boolean, setActive: (active: boolean) => void, disabled?: boolean}) {
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
      ...props.disabled && {
        cursor: 'not-allowed',
        opacity: 0.35,
      }
    }}
    onClick={() => !props.disabled && props.setActive(!props.active)}
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
