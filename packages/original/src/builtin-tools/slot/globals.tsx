import { EngraftPromise, toolFromModule } from "@engraft/core";
import { hookFork, hookIncr, hookMemo, hookRef, hooks, IncrMemory } from "@engraft/incr";
import update from "immutability-helper";
import _ from "lodash";
import React from "react";
import * as slider from "../../builtin-tools/slider/index.js";
import { createElementFromReact } from "../../util/createElementFrom.js";
import Diagram from "../../util/Diagram.js";
import { DOM } from "../../util/DOM.js";
import { GoogleMap } from "../../view/GoogleMap.js";

const sliderTool = toolFromModule(slider);


// Here's where I'll throw ad-hoc things I want to have available in every code editor.
// TODO: Someday maybe there will be a principled approach to this...

function html(s: string) {
  return <div dangerouslySetInnerHTML={{__html: s}}/>
}

export const globals = {
  _,
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