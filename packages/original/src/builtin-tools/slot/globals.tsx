import update from 'immutability-helper';
import React from "react";
import * as slider from '../../builtin-tools/slider';
import { EngraftPromise } from '../../engraft/EngraftPromise';
import { IncrMemory } from '../../incr';
import { hookMemo } from '../../incr/hookMemo';
import { hookFork, hookIncr, hookRef, hooks } from '../../incr/hooks';
import { toolFromModule } from '../../engraft/toolFromModule';
import { createElementFromReact } from "../../util/createElementFrom";
import Diagram from '../../util/Diagram';
import { DOM } from "../../util/DOM";
import { GoogleMap } from '../../view/GoogleMap';

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
    hookMemo,
    hookIncr,
  },
  IncrMemory,
  Meta: {
    sliderTool,
  },
  EngraftPromise,
};

// For quick debugging-Engraft-inside-Engraft applications...
export function addToSlotGlobals(obj: object) {
  Object.assign(globals, obj);
}
