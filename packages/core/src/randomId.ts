/// <reference path="./randomId.d.ts" />

import { objects } from "friendly-words";

export function randomId(random: () => number = Math.random): string {
  return `ID${objects[Math.floor(random() * objects.length)]}${random().toFixed(6).slice(2)}`;
}
