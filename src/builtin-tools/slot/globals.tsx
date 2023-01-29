import update from 'immutability-helper';
import React from "react";
import { Incr } from 'src/incr';
import { hookMemo } from 'src/incr/hookMemo';
import { hookFork, hookIncr, hookRef, hooks } from 'src/incr/hooks';
import { createElementFromReact } from "src/util/createElementFrom";
import Diagram from 'src/util/Diagram';
import { DOM } from "src/util/DOM";
import { GoogleMap } from 'src/view/GoogleMap';
import { toolFromModule } from 'src/toolFromModule';
import * as slider from 'src/builtin-tools/slider';
import { EngraftPromise } from 'src/engraft/EngraftPromise';

const sliderTool = toolFromModule(slider);


// Here's where I'll throw ad-hoc things I want to have available in every code editor.
// TODO: Someday maybe there will be a principled approach to this...

function html(s: string) {
  return <div dangerouslySetInnerHTML={{__html: s}}/>
}

export const globals = {
  React,  // JSX in slots is transformed by Babel into code that refers to `React`
  createElementFromReact,
  DOM,
  update,
  GoogleMap,
  html,
  Diagram,
  Incr: {
    hooks,
    hookRef,
    hookFork,
    createMemory: Incr.createMemory,
    hookMemo,
    hookIncr,
  },
  Meta: {
    sliderTool,
  },
  EngraftPromise,
};

// For quick debugging-Engraft-inside-Engraft applications...
export function addToSlotGlobals(obj: object) {
  Object.assign(globals, obj);
}
