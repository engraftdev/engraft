import update from 'immutability-helper';
import React from "react";
import { MentoMemory } from 'src/mento';
import { hookMemo } from 'src/mento/hookMemo';
import { hookFork, hookMento, hookRef, hooks } from 'src/mento/hooks';
import { createElementFromReact } from "src/util/createElementFrom";
import Diagram from 'src/util/Diagram';
import { DOM } from "src/util/DOM";
import { GoogleMap } from 'src/view/GoogleMap';


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
  Mento: {
    hooks,
    hookRef,
    hookFork,
    createMemory: MentoMemory.create,
    hookMemo,
    hookMento,
  }
};

// For quick debugging-Engraft-inside-Engraft applications...
export function addToSlotGlobals(obj: object) {
  Object.assign(globals, obj);
}
