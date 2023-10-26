import { useDedupe } from "@engraft/shared/lib/useDedupe.js";
import { useRefForCallback } from "@engraft/shared/lib/useRefForCallback.js";
import { CollectReferences, EngraftPromise, InputHeading, MakeProgram, ShowView, ToolProgram, ToolProps, ToolResult, ToolRun, ToolView, ToolViewRenderProps, defineTool, hookMemo, hookRunTool, hooks, inputFrameBarBackdrop, memoizeProps, usePromiseState, useUpdateProxy } from "@engraft/toolkit";
import { Action, buildSchema, configureStore, renderVoyager, selectMainSpec } from "@engraft/vendor-voyager";
import voyagerStyle from "./voyager-style.css.js";
import _ from "lodash";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Spec = ReturnType<typeof selectMainSpec>;
type Schema = ReturnType<typeof buildSchema>;

type Program = {
  toolName: 'voyager',
  inputProgram: ToolProgram,
  spec: Spec | undefined,
}

const makeProgram: MakeProgram<Program> = (context, defaultCode) => ({
  toolName: 'voyager',
  inputProgram: context.makeSlotWithCode(defaultCode),
  spec: undefined,
});

const collectReferences: CollectReferences<Program> = (program) => program.inputProgram;

const run: ToolRun<Program> = memoizeProps(hooks((props) => {
  const { program, varBindings, context } = props;

  const inputResult = hookRunTool({ program: program.inputProgram, varBindings, context })

  const outputP = hookMemo(() => {
    return EngraftPromise.resolve({ value: undefined });
  }, []);

  const view: ToolView<Program> = hookMemo(() => ({
    render: (viewProps) =>
      <View
        {...props} {...viewProps}
        inputResult={inputResult}
      />,
    showsOwnOutput: true,
  }), [inputResult, props]);

  return {outputP, view};
}));

export default defineTool({ name: 'voyager', makeProgram, collectReferences, run })

const View = memo((props: ToolProps<Program> & ToolViewRenderProps<Program> & {
  inputResult: ToolResult,
}) => {
  const { program, updateProgram, autoFocus, frameBarBackdropElem, inputResult } = props;
  const programUP = useUpdateProxy(updateProgram);

  const inputOutputState = usePromiseState(inputResult.outputP);

  const specRef = useRefForCallback(program.spec);

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
  }, [store])

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
    programUP.spec.$set(selectMainSpec(store.getState()));
  }, [programUP.spec, specFromVoyager, specRef, store])

  useEffect(() => {
    if (!store) { return; }
    console.log("inputOutputState", inputOutputState);
    if (inputOutputState.status !== 'fulfilled') { return; }

    const data = inputOutputState.value.value;

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
  }, [inputOutputState, store]);

  useEffect(() => {
    if (!store) { return; }
    const spec = program.spec;

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
  }, [store, program.spec]);

  if (!store) { return <div>loading</div>; }

  return (
    <div className="xCol" style={{minWidth: 1000}}>
      {frameBarBackdropElem && createPortal(inputFrameBarBackdrop, frameBarBackdropElem)}
      <InputHeading
        slot={<ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$} autoFocus={autoFocus} />}
      />
      <div>
        <style>{voyagerStyle}</style>
        <Voyager store={store}/>
      </div>
    </div>
  );
});


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

  return <div ref={setRoot}/>;
})
