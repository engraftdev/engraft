import { aapl } from "./datasets/aapl.js";
import { alphabet } from "./datasets/alphabet.js";
import { cars } from "./datasets/cars.js";
import { citywages } from "./datasets/citywages.js";
import { diamonds } from "./datasets/diamonds.js";
import { flare } from "./datasets/flare.js";
import { industries } from "./datasets/industries.js";
import { miserables } from "./datasets/miserables.js";
import { olympians } from "./datasets/olympians.js";
import { penguins } from "./datasets/penguins.js";
import { weather } from "./datasets/weather.js";
import * as d3dsv from "d3-dsv";

function processDataset(dataset: { type: string, text: string }): any {
  if (dataset.type === "csv") {
    return d3dsv.csvParse(dataset.text, d3dsv.autoType);
  } else if (dataset.type === "json") {
    return JSON.parse(dataset.text);
  } else {
    throw new Error(`Unknown dataset type: ${dataset.type}`);
  }
};

export const datasets = {
  aapl: processDataset(aapl),
  alphabet: processDataset(alphabet),
  cars: processDataset(cars),
  citywages: processDataset(citywages),
  diamonds: processDataset(diamonds),
  flare: processDataset(flare),
  industries: processDataset(industries),
  miserables: processDataset(miserables),
  olympians: processDataset(olympians),
  penguins: processDataset(penguins),
  weather: processDataset(weather),
};
