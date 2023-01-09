import _ from "lodash";
import { memo, useCallback, useEffect, useMemo } from "react";
import { references, lookUpTool, newVar, ProgramFactory, ComputeReferences, ToolOutput, ToolProgram, ToolProps, ToolView, ToolViewRenderProps, Var, VarBindings } from "src/tools-framework/tools";
import { PerTool, ShowView, ToolInSet, ToolSet, useOutput, useToolSet, useView } from "src/tools-framework/useSubTool";
import { newId } from "src/util/id";
import { noOp } from "src/util/noOp";
import { difference } from "src/util/sets";
import { atAllIndices, atIndexZip, removers, Updater, useAt } from "src/util/state";
import { updateF } from "src/util/updateF";
import { useContextMenu } from "src/util/useContextMenu";
import { MyContextMenu, MyContextMenuHeading } from "src/view/MyContextMenu";
import { SettableValue } from "src/view/SettableValue";
import { ToolOutputView } from "src/view/Value";
import { VarDefinition } from "src/view/Vars";
import { slotSetTo } from "./slot";

export type Program = {
  toolName: 'function',
  vars: Var[],
  settings: Setting[],
  activeSettingId: string,
  bodyProgram: ToolProgram,
}

type Setting = {
  id: string,
  values: unknown[],  // parallel with vars
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  const var1 = newVar('input 1')
  const settingId = newId();
  return {
    toolName: 'function',
    vars: [var1],
    settings: [{id: settingId, values: [undefined]}],
    activeSettingId: settingId,
    bodyProgram: slotSetTo(var1.id),
  }
};

export const computeReferences: ComputeReferences<Program> = (program) =>
  difference(references(program.bodyProgram), program.vars.map((v) => v.id));

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, varBindings, reportOutput, reportView } = props;
  const { settings } = program;
  const [bodyToolSet, bodyOutputs, bodyViews] = useToolSet();

  useOutput(reportOutput, useMemo(() => {
    const functionThing: FunctionThing = {
      program,
      updateProgram,
      closureVarBindings: varBindings,
    };
    return {value: functionThing};
  }, [program, updateProgram, varBindings]));

  useView(reportView, useMemo(() => ({
    render: (renderProps) =>
      <View
        {...props} {...renderProps}
        bodyView={bodyViews[program.activeSettingId]}
        bodyOutputs={bodyOutputs}
      />
  }), [program.activeSettingId, bodyOutputs, bodyViews, props]));

  return <>
    {settings.map((setting) => <SettingModel
      {...props}
      key={setting.id}
      setting={setting}
      bodyToolSet={bodyToolSet}
    />)}
  </>;
});

type SettingModelProps = ToolProps<Program> & {
  setting: Setting,
  bodyToolSet: ToolSet,
}

export const SettingModel = memo((props: SettingModelProps) => {
  const { program, updateProgram, varBindings, setting, bodyToolSet } = props;
  const [ bodyProgram, updateBodyProgram ] = useAt(program, updateProgram, 'bodyProgram');

  const newVarBindings: VarBindings = useMemo(() =>
    ({
      ...varBindings,
      ...Object.fromEntries(
        _.zipWith(program.vars, setting.values, (var_, value) => [var_.id, {var_, output: {value}}])
      )
    })
  , [varBindings, program.vars, setting.values]);

  return <ToolInSet toolSet={bodyToolSet} keyInSet={setting.id} program={bodyProgram} updateProgram={updateBodyProgram} varBindings={newVarBindings}/>;
});


type ViewProps = ToolProps<Program> & ToolViewRenderProps & {
  bodyView: ToolView | null,
  bodyOutputs: PerTool<ToolOutput | null>,
};

const View = memo((props: ViewProps) => {
  const { bodyView, bodyOutputs, program, updateProgram } = props;

  const [ vars, updateVars ] = useAt(program, updateProgram, 'vars');
  const varsZipped = useMemo(() => atIndexZip(vars, updateVars), [vars, updateVars]);

  const [ settings, updateSettings ] = useAt(program, updateProgram, 'settings');
  const settingsZipped = useMemo(() => atIndexZip(settings, updateSettings), [settings, updateSettings]);

  const [ activeSettingId, updateActiveSettingId ] = useAt(program, updateProgram, 'activeSettingId');

  const varRemovers = useMemo(() => Array.from({length: vars.length}, (_, i) =>
    () => {
      updateVars(updateF({$splice: [[i, 1]]}));
      // omg this updater situation is anarchy
      atAllIndices(updateSettings)(updateF({values: {$splice: [[i, 1]]}}));
    }
  ), [updateSettings, updateVars, vars.length]);

  const varInserters = useMemo(() => Array.from({length: vars.length}, (_, i) =>
    () => {
      updateVars(updateF({$splice: [[i + 1, 0, newVar(`input ${i + 2}`)]]}));
      // omg this updater situation is anarchy
      atAllIndices(updateSettings)(updateF({values: {$splice: [[i + 1, 0, '']]}}));
    }
  ), [updateSettings, updateVars, vars.length]);

  const settingRemovers = useMemo(() => removers(updateSettings, settings.length), [settings.length, updateSettings]);
  useEffect(() => {
    if (!_.find(settings, {id: activeSettingId})) {
      updateActiveSettingId(() => settings[0].id);
    }
  }, [activeSettingId, settings, updateActiveSettingId])

  const settingInserters = useMemo(() => Array.from({length: settings.length}, (_, i) =>
    () => {
      const newSetting: Setting = {
        id: newId(),
        values: Array.from({length: vars.length}, () => undefined),
      };
      updateSettings(updateF({$splice: [[i + 1, 0, newSetting]]}));
      updateActiveSettingId(() => newSetting.id);
    }
  ), [settings.length, updateActiveSettingId, updateSettings, vars.length]);

  return <div className="xCol xGap10 xPad10">
    <div className="xRow xGap10">
      <table>
        <thead>
          <tr>
            <td>{/* for option buttons */}</td>
            {varsZipped.map(([var_, updateVar], i) =>
              <VarHeading key={var_.id}
                var_={var_} updateVar={updateVar}
                removeVar={vars.length > 1 ? varRemovers[i] : undefined}
                insertVar={varInserters[i]}
              />
            )}
            <td style={{fontSize: '80%'}}>
              output
            </td>
          </tr>
        </thead>
        <tbody>
          {settingsZipped.map(([setting, updateSetting], i) =>
            <SettingRow key={setting.id}
              setting={setting} updateSetting={updateSetting}
              activeSettingId={activeSettingId} updateActiveSettingId={updateActiveSettingId}
              removeSetting={settings.length > 1 ? settingRemovers[i] : undefined}
              insertSetting={settingInserters[i]}
              output={bodyOutputs[setting.id]}
            />)}
        </tbody>
      </table>
    </div>

    <div className="xRow xGap10">
      <ShowView view={bodyView}/>
    </div>

  </div>;
});

type VarHeadingProps = {
  var_: Var,
  updateVar: Updater<Var>,

  removeVar?: () => void,
  insertVar: () => void,
};

const VarHeading = memo((props: VarHeadingProps) => {
  const {var_, updateVar, removeVar, insertVar} = props;

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Var</MyContextMenuHeading>
      <div>
        <button
          onClick={() => {
            insertVar();
            closeMenu();
          }}
        >
          Insert after
        </button>
      </div>
      {removeVar && <div>
        <button
          onClick={() => {
            removeVar();
            closeMenu();
          }}
        >
          Delete
        </button>
      </div>}
    </MyContextMenu>
  , [insertVar, removeVar]));

  return <td onContextMenu={openMenu}>
    {menuNode}
    <VarDefinition key={var_.id} var_={var_} updateVar={updateVar}/>
  </td>
});



type SettingRowProps = {
  setting: Setting,
  updateSetting: Updater<Setting>,

  activeSettingId: string,
  updateActiveSettingId: Updater<string>,

  removeSetting?: () => void,
  insertSetting: () => void,

  output: ToolOutput | null,
};

const SettingRow = memo((props: SettingRowProps) => {
  const { setting, updateSetting, activeSettingId, updateActiveSettingId, removeSetting, insertSetting, output } = props;

  const [ values, updateValues ] = useAt(setting, updateSetting, 'values');
  const valuesZipped = useMemo(() => atIndexZip(values, updateValues), [values, updateValues]);

  const makeThisRowActive = useCallback(() => {
    updateActiveSettingId(() => setting.id);
  }, [setting.id, updateActiveSettingId]);

  const { openMenu, menuNode } = useContextMenu(useCallback((closeMenu) =>
    <MyContextMenu>
      <MyContextMenuHeading>Setting</MyContextMenuHeading>
      <div>
        <button
          onClick={() => {
            insertSetting();
            closeMenu();
          }}
        >
          Insert below
        </button>
      </div>
      {removeSetting && <div>
        <button
          onClick={() => {
            removeSetting();
            closeMenu();
          }}
        >
          Delete
        </button>
      </div>}
    </MyContextMenu>
  , [insertSetting, removeSetting]));

  return <tr onContextMenu={openMenu} style={{...setting.id === activeSettingId && {background: '#eee'}}}>
    {menuNode}
    <td>
      <input
        type="radio"
        checked={setting.id === activeSettingId}
        onChange={makeThisRowActive}
      />
    </td>
    {valuesZipped.map(([value, updateValue], i) =>
      <td key={i}>
        <SettableValue value={value} setValue={(v) => updateValue(() => v)}/>
      </td>
    )}
    <td>
      <ToolOutputView toolOutput={output}/>
    </td>
  </tr>
});


export type FunctionThing = {
  program: Program,
  updateProgram: Updater<Program>,
  closureVarBindings: VarBindings,
}

export function isProbablyFunctionThing(thing: unknown): thing is FunctionThing {
  return (thing !== null && typeof thing === 'object' && 'program' in thing && 'closureVarBindings' in thing) || false;
}

type FunctionThingComponentProps = {
  functionThing: FunctionThing,
  inputs: {[varId: string]: ToolOutput | null},
  reportOutput: (output: ToolOutput | null) => void,
  reportView?: (view: ToolView | null) => void,
}

export const FunctionThingComponent = memo((props: FunctionThingComponentProps) => {
  const { functionThing, inputs, reportOutput, reportView } = props;
  const { program, updateProgram, closureVarBindings } = functionThing;

  const inputVarBindings = useMemo(() =>
    Object.fromEntries(program.vars.map((var_) => [var_.id, {var_, output: inputs[var_.id]}]))
  , [inputs, program.vars]);

  const varBindings = useMemo(() =>
    ({...closureVarBindings, ...inputVarBindings})
  , [closureVarBindings, inputVarBindings]);

  const toolName = program.bodyProgram.toolName;
  const Tool = lookUpTool(toolName);

  return <Tool.Component
    program={program.bodyProgram}
    updateProgram={updateProgram}
    varBindings={varBindings}
    reportOutput={reportOutput}
    reportView={reportView || noOp}
  />;
});
