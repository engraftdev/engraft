import { Action, buildSchema, configureStore, renderVoyager, selectMainSpec } from "datavoyager";
import type { Schema } from "datavoyager/build/models";
import _ from "lodash";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProgramFactory, ToolProgram, ToolProps, ToolView, ToolViewProps } from "src/tools-framework/tools";
import { ShowView, useOutput, useSubTool, useView } from "src/tools-framework/useSubTool";
import { codeProgramSetTo } from "src/tools/CodeTool";
import { useAt } from "src/util/state";
import { useDedupe } from "src/util/useDedupe";
import { useRefForCallback } from "src/util/useRefForCallback";
import style from './style.css';


type Spec = ReturnType<typeof selectMainSpec>;

export type Program = {
  toolName: 'voyager';
  inputProgram: ToolProgram;
  spec: Spec | undefined;
}

export const programFactory: ProgramFactory<Program> = (defaultCode?: string) => {
  return {
    toolName: 'voyager',
    inputProgram: codeProgramSetTo(defaultCode || ''),
    spec: undefined,
  };
}

export const Component = memo((props: ToolProps<Program>) => {
  const { program, updateProgram, reportOutput, reportView } = props;

  const [inputComponent, inputView, inputOutput] = useSubTool({program, updateProgram, subKey: 'inputProgram'})

  const data = useMemo(() => {
    if (inputOutput) {
      const value = inputOutput.toolValue;
      if (value instanceof Array) {
        if (value.length === 0 || value[0] instanceof Object) {
          return inputOutput.toolValue
        }
      }
    }
  }, [inputOutput])

  useOutput(reportOutput, {toolValue: undefined, alreadyDisplayed: true})

  const view: ToolView = useCallback((viewProps) => (
    <VoyagerToolView
      {...props} {...viewProps}
      data={data}
      inputView={inputView}
    />
  ), [data, inputView, props]);
  useView(reportView, view);

  return <>
    {inputComponent}
  </>
});


interface VoyagerToolViewProps extends ToolProps<Program>, ToolViewProps {
  data: unknown;
  inputView: ToolView | null;
}

const VoyagerToolView = memo(function VoyagerToolView (props: VoyagerToolViewProps) {
  const { program, updateProgram, autoFocus, data, inputView } = props;

  const [ spec, updateSpec ] = useAt(program, updateProgram, 'spec');
  const specRef = useRefForCallback(spec);

  const [ store, setStore ] = useState<ReturnType<typeof configureStore> | null>();
  useEffect(() => {
    if (!store) {
      setStore(configureStore());
    }
  }, [store]);

  const toolToVoyagerState = useRef<'uninitialized' | 'pending' | 'done'>('uninitialized');

  const [ rawSpecFromVoyager, setRawSpecFromVoyager ] = useState<Spec | undefined>();

  useEffect(() => {
    if (!store) { return; }

    console.log("setting config");
    const action: Action = {
      type: 'SET_CONFIG',
      payload: {
        config: {
          hideFooter: true,
          hideHeader: true,
          showDataSourceSelector: false,
        }
      }
    };
    store.dispatch(action);

    const unsubscribe = store.subscribe(() => {
      setRawSpecFromVoyager(selectMainSpec(store.getState()));
    });
    return unsubscribe;
  }, [store, updateSpec])

  const specFromVoyager = useDedupe(rawSpecFromVoyager, _.isEqual);

  useEffect(() => {
    if (!store) { return; }

    const latestSpec = specFromVoyager;

    console.log('spec in voyager changed!', latestSpec);

    // Should we load this spec into our tool state?

    // Not if we haven't done an initial load
    if (toolToVoyagerState.current === 'uninitialized') {
      console.log("  ignoring (haven't done initial load)")
      return;
    }

    // Not if we have a pending change
    if (toolToVoyagerState.current === 'pending') {
      console.log("  ignoring (pending change)")

      // Check if this is us catching up though
      if (_.isEqual(latestSpec, specRef.current)) {
        console.log("  just caught up to tool state!!!")
        toolToVoyagerState.current = 'done';
        return;
      } else {
        console.log("  hasn't caught up yet", latestSpec, "vs", specRef.current);
      }

      return;
    }

    // Otherwise, yeah, let's do it!
    console.log("  not ignoring (real change from)", specRef.current)
    updateSpec(() => selectMainSpec(store.getState()));
  }, [specFromVoyager, specRef, store, updateSpec])

  useEffect(() => {
    if (!store) { return; }

    console.log("data outside voyager changed!", data);
    console.log("DISPATCH data load stuff");

    let valuesToLoad: any;
    let schema: Schema;
    try {
      schema = buildSchema(data);
      // if that succeeds...
      valuesToLoad = data;
    } catch {
      // otherwise
      valuesToLoad = [];
      schema = buildSchema(valuesToLoad);
    }

    const action: Action = {
      type: 'DATASET_RECEIVE',
      payload: {
        name: undefined as any,
        schema,
        data: { values: valuesToLoad }
      }
    }
    store.dispatch(action);
  }, [data, store]);

  useEffect(() => {
    if (!store) { return; }

    if (spec) {
      console.log("spec outside voyager changed!", spec);

      // Should we load this spec into our Voyager instance?

      const shouldLoad = (() => {
        // If this is our first load, then sure!
        if (toolToVoyagerState.current === 'uninitialized') {
          console.log("  not ignoring (first load)")
          return true;
        }

        // Otherwise, see if we're just catching up to our Voyager instance
        if (_.isEqual(spec, selectMainSpec(store.getState()))) {
          console.log("  ignoring (catching up to Voyager instance)")
          return false;
        } else {
          console.log("  not ignoring (real change)")
          return true;
        }
      })();

      if (shouldLoad) {
        toolToVoyagerState.current = 'pending';
        const action: Action = {
          type: 'SPEC_LOAD',
          payload: {
            spec: spec as any,
            keepWildcardMark: false
          }
        };
        console.log("DISPATCH SPEC_LOAD");
        store.dispatch(action);
      }
    } else {
      // We don't have a spec to offer.
      toolToVoyagerState.current = 'done';
    }
  }, [store, spec]);

  if (!store) { return <div>loading</div>; }

  return (
    <div className="xCol" style={{padding: 10, minWidth: 1000}}>
      <div className="VoyagerTool-input-row xRow xGap10">
        <span style={{fontWeight: 'bold'}}>input</span> <ShowView view={inputView} autoFocus={autoFocus} />
      </div>
      <div>
        <style>{style}</style>
        <Voyager store={store}/>
      </div>
    </div>
  );
})


// Wrapped version of renderVoyager from datavoyager

type VoyagerProps = {
  store: ReturnType<typeof configureStore>;
}

const Voyager = memo(function Voyager (props: VoyagerProps) {
  const { store } = props;

  const [ root, setRoot ] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (root) {
      renderVoyager(root, store);
    }
  });

  return <div ref={setRoot}/>
})
