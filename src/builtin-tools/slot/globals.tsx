import update from 'immutability-helper';
import React from "react";
import { createElementFromReact } from "src/util/createElementFrom";
import Diagram from 'src/util/Diagram';
import { DOM } from "src/util/DOM";
import { GoogleMap } from 'src/view/GoogleMap';


// Here's where I'll throw ad-hoc things I want to have available in every code editor

function html(s: string) {
  return <div dangerouslySetInnerHTML={{__html: s}}/>
}


// These are available in every code editor

export const globals = {
  React,
  createElementFromReact,
  DOM,
  update,
  GoogleMap,
  html,
  Diagram,
};
