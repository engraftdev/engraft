import { insertMathCmd, makeBlockMathInputRule, makeInlineMathInputRule, mathBackspaceCmd, mathPlugin, mathSerializer, REGEX_BLOCK_MATH_DOLLARS, REGEX_INLINE_MATH_DOLLARS } from "@benrbray/prosemirror-math";
import OrderedMap from 'orderedmap';
import { chainCommands, deleteSelection, joinBackward, selectNodeBackward } from "prosemirror-commands";
import { inputRules } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { NodeSpec, Schema } from 'prosemirror-model';
import { Plugin } from "prosemirror-state";

import prosemirrorMathCSS from "@benrbray/prosemirror-math/style/math.css";
import katexCSS from "katex/dist/katex.min.css";


export function addMathNodes(nodes: OrderedMap<NodeSpec>) {
  return nodes.append({
    math_inline: {               // important!
      group: "inline math",
      content: "text*",        // important!
      inline: true,            // important!
      atom: true,              // important!
      toDOM: () => ["math-inline", { class: "math-node" }, 0],
      parseDOM: [{
          tag: "math-inline"   // important!
      }]
    },
    math_display: {              // important!
      group: "block math",
      content: "text*",        // important!
      atom: true,              // important!
      code: true,              // important!
      toDOM: () => ["math-display", { class: "math-node" }, 0],
      parseDOM: [{
          tag: "math-display"  // important!
      }]
    },
  });
}

export function mathSetup(schema: Schema) {
  return [
    mathPlugin,
    keymap({
        "Mod-Space" : insertMathCmd(schema.nodes.math_inline),
        // modify the default keymap chain for backspace
        "Backspace": chainCommands(deleteSelection, mathBackspaceCmd, joinBackward, selectNodeBackward),
    }),
    inputRules({ rules: [
      makeInlineMathInputRule(REGEX_INLINE_MATH_DOLLARS, schema.nodes.math_inline),
      makeBlockMathInputRule(REGEX_BLOCK_MATH_DOLLARS, schema.nodes.math_display),
    ] }),
    new Plugin({
      props: {
        clipboardTextSerializer: (slice) => { return mathSerializer.serializeSlice(slice) },
      }
    }),
  ];
}

export const mathCSS = [katexCSS, prosemirrorMathCSS].join(" ");
