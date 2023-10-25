import { DOM } from "@engraft/shared/lib/DOM.js";
import Diagram from "@engraft/shared/lib/Diagram.js";
import { alphaLabels } from "@engraft/shared/lib/unusedLabel.js";
import { EngraftPromise, RefuncMemory, hookFork, hookMemo, hookRef, hookRefunction, hooks, usePromiseState } from "@engraft/toolkit";
import * as d3dsv from "d3-dsv";
import update from "immutability-helper";
import _ from "lodash";
import React, { ReactNode, memo, useEffect, useState } from "react";
import { GoogleMap } from "./GoogleMap.js";
import { createElementFromReact } from "./createElementFrom.js";


// Here's where I'll throw ad-hoc things I want to have available in every code editor.
// TODO: Someday maybe there will be a principled approach to this...

function html(s: string) {
  return <div dangerouslySetInnerHTML={{__html: s}}/>
}

// from d3-dsv
function objectConverter(columns: string[]) {
  // eslint-disable-next-line no-new-func
  return new Function("d", "return {" + columns.map(function(name, i) {
    return JSON.stringify(name) + ": d[" + i + "] ?? \"\"";
  }).join(",") + "}") as (d: unknown[]) => object;
}

type CSVParseOptions = {
  header?: boolean,
  autoType?: boolean,
}

const defaultCSVParseOptions: CSVParseOptions = {
  header: true,
  autoType: true,
}

function csvParse(text: string | string[], options: CSVParseOptions = {}) {
  options = {...defaultCSVParseOptions, ...options};

  if (Array.isArray(text)) {
    text = text.join("\n");
  }

  if (options.header) {
    return options.autoType ? d3dsv.csvParse(text, d3dsv.autoType) : d3dsv.csvParse(text);
  } else {
    const rows = options.autoType ? d3dsv.csvParseRows(text, d3dsv.autoType) as unknown[][] : d3dsv.csvParseRows(text) as string[][];
    const maxLength = _.max(rows.map(row => row.length)) || 0;
    const columns = alphaLabels.slice(0, maxLength);
    const convert = objectConverter(columns);
    return rows.map(convert);
  }
}

const Then = memo(function Then(props: {
  promise: EngraftPromise<ReactNode>,
  pending?: (latest: ReactNode | undefined) => ReactNode,
}) {
  const { promise, pending } = props;

  const [latest, setLatest] = useState<ReactNode | undefined>(undefined);
  const promiseState = usePromiseState(promise);

  useEffect(() => {
    if (promiseState.status === "fulfilled") {
      setLatest(promiseState.value);
    }
  }, [promiseState]);

  if (pending && promiseState.status === "pending") {
    return <>{pending(latest)}</>;
  }

  return <>{latest}</>;
});

export const globals = {
  _,
  React,  // JSX in slots is transformed by Babel into code that refers to `React`
  createElementFromReact,
  DOM,
  update,
  GoogleMap,
  html,
  Diagram,
  Refunc: {
    hooks,
    hookRef,
    hookFork,
    hookMemo,
    hookRefunction,
  },
  RefuncMemory,
  Meta: {
    // TODO – provide access to meta stuff somehow, probably by passing the context from the slot
  },
  EngraftPromise,
  csvParse,
  Then,
};

// For quick debugging-Engraft-inside-Engraft applications...
export function addToSlotGlobals(obj: object) {
  Object.assign(globals, obj);
}
