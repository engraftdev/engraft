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
import * as d3dsv from "d3-dsv";
import { alphaLabels } from "../../util/unusedLabel.js";

const sliderTool = toolFromModule(slider);


// Here's where I'll throw ad-hoc things I want to have available in every code editor.
// TODO: Someday maybe there will be a principled approach to this...

function html(s: string) {
  return <div dangerouslySetInnerHTML={{__html: s}}/>
}

// from d3-dsv
function objectConverter(columns: string[]) {
  // eslint-disable-next-line no-new-func
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + "] || \"\"";
  }).join(",") + "}") as (d: unknown[]) => object;
}

type CSVParseOptions = {
  header: boolean,
  autoType: boolean,
}

const defaultCSVParseOptions: CSVParseOptions = {
  header: true,
  autoType: true,
}

function csvParse(text: string | string[], options: CSVParseOptions = defaultCSVParseOptions) {
  if (Array.isArray(text)) {
    text = text.join("\n");
  }

  if (options.header) {
    return options.autoType ? d3dsv.csvParse(text, d3dsv.autoType) : d3dsv.csvParse(text);
  } else {
    const rows = d3dsv.csvParseRows(text, d3dsv.autoType) as unknown[][];
    const maxLength = _.max(rows.map(row => row.length)) || 0;
    const columns = alphaLabels.slice(0, maxLength);
    const convert = objectConverter(columns);
    return rows.map(convert);
  }
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
  csvParse,
};

// For quick debugging-Engraft-inside-Engraft applications...
export function addToSlotGlobals(obj: object) {
  Object.assign(globals, obj);
}
