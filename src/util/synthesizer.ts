import _ from 'lodash';

// the ingredients
// TODO: customize / abstract over these

interface Constant {
  code: string,
  value: unknown,
}

function constantFromCode(code: string): Constant {
  return {
    code,
    // eslint-disable-next-line no-eval
    value: eval(code),
  }
}

const constants = ["undefined", "null", "0", "1", "''", "' '", "'.'"].map(constantFromCode);


interface Operation {
  arity: number,
  func: (...args: unknown[]) => unknown,
  codeFunc: (...args: string[]) => string,
  precond?: (...args: unknown[]) => boolean,
}

function operationFromCodeFunc(
  codeFunc: (...args: string[]) => string,
  precond?: (...args: unknown[]) => boolean
): Operation {
  const arity = codeFunc.length;
  const args = [...Array(arity).keys()].map((_, i) => 'a' + i);
  return {
    arity: codeFunc.length,
    // eslint-disable-next-line no-new-func
    func: new Function(...args, 'return ' + codeFunc(...args)) as any,
    codeFunc,
    precond
  }
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isArray(x: unknown, itemCond?: (item: unknown) => boolean): x is Array<unknown> {
  return x instanceof Array && (!itemCond || x.length === 0 || itemCond(x[0]));
}

function isNumber(x: unknown): x is number {
  return typeof x === 'number';
}

// function hasProp(x: unknown, prop: string): x is {prop: any} {
//   return typeof x === 'object' && x !== null && prop in x;
// }

let operations: Operation[] = [
  operationFromCodeFunc(
    (s1: string, s2: string) => `${s1}.split(${s2})`,
    (s1: any, s2: any) => isString(s1) && isString(s2),
  ),
  operationFromCodeFunc(
    (s1: string, s2: string) => `${s1}.join(${s2})`,
    (s1: any, s2: any) => isArray(s1) && isString(s2),
  ),
  operationFromCodeFunc(
    (s1: string, n1: string, n2: string) => `${s1}.slice(${n1}, ${n2})`,
    (s1: any, n1: any, n2: any) => (isArray(s1) || isString(s1)) && isNumber(n1) && isNumber(n2),
  ),
  operationFromCodeFunc(
    (s1: string, n1: string) => `${s1}.slice(${n1})`,
    (s1: any, n1: any) => (isArray(s1) || isString(s1)) && isNumber(n1),
  ),
  operationFromCodeFunc(
    (s1: string, n1: string) => `${s1}[${n1}]`,
    (s1: any, n1: any) => (isArray(s1) || isString(s1)) && isNumber(n1),
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.length`,
    (s1: any) => isArray(s1) || isString(s1),
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.flatten()`,
    (s1: any) => isArray(s1, (item) => isArray(item)),
  ),
  // TODO STRETCH: symmetry
  operationFromCodeFunc(
    (n1: string, n2: string) => `(${n1} + ${n2})`,
    (n1: any, n2: any) => (isNumber(n1) || isString(n1)) && (isNumber(n2) || isString(n2)),
  ),
  operationFromCodeFunc(
    (n1: string, n2: string) => `(${n1} - ${n2})`,
    (n1: any, n2: any) => isNumber(n1) && isNumber(n2),
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.slice().reverse()`,
    (s1: any) => isArray(s1),
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.toUpperCase()`,
    (s1: any) => isString(s1),
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.toLowerCase()`,
    (s1: any) => isString(s1),
  ),
]

function replaceWith<T>(arr: T[], idx: number, val: T): T[] {
  const copy = arr.slice();
  copy[idx] = val;
  return copy;
}

operations = [
  ...operations,
  ...operations.flatMap(({arity, func, codeFunc, precond}) => {
    return _.range(arity).map((i) => ({
      arity: arity,
      func: (...args: any[]) => args[i].map((x: any) => func(...replaceWith(args, i, x))),
      codeFunc: (...args: string[]) => `${args[i]}.map((x) => ${codeFunc(...replaceWith(args, i, 'x'))})`,
      precond: (...args: any[]) => {
        const arr = args[i]
        if (arr instanceof Array) {
          if (arr.length > 0 && precond) {
            return precond(...replaceWith(args, i, arr[0]));
          } else {
            return true;
          }
        }
        return false;
      }
    }))
  })
]

// console.log(operations.map(({codeFunc}) => codeFunc("A", "B", "C", "D")))
// process.exit();

interface Value {
  values: any[],
  code: string,
  frontier: boolean,
}

interface ValueMap {
  [valuesStr: string]: Value
}

export interface SynthesisState {
  inputs: any[],
  outputs: any[],
  outputsKey: any,
  valueMap: ValueMap,
  result: string | undefined;
  progress: {
    testsCount: number,
    levelCount: number,
    valueCount: number,
    catchCount: number,
    skipsCount: number,
    opInLevelCount: number,
    opInLevelTotal: number,
    tupleInOpCount: number,
    tupleInOpTotal: number,
  }
}

function objectToKey(obj: any) {
  return JSON.stringify(obj);
  // return hash.MD5(obj);
}

function addValueToState (state: SynthesisState, value: Value): void {
  const valueKey = objectToKey(value.values);

  // check if we've obtained the objective
  if (valueKey === state.outputsKey) {
    state.result = value.code;
    return;
  }

  // check if it's in the map already
  if (state.valueMap[valueKey]) {
    if (value.code.length < state.valueMap[valueKey].code.length) {
      state.valueMap[valueKey].code = value.code;
    }
  } else {
    state.valueMap[valueKey] = value;
    state.progress.valueCount++;
  }
}

function initializeState (inOutPairs: [any, any][]): SynthesisState {
  const inputs = inOutPairs.map(([input, output]) => input)
  const outputs = inOutPairs.map(([input, output]) => output)
  const state = {
    valueMap: {}, inputs, outputs, outputsKey: objectToKey(outputs), result: undefined,
    progress: {testsCount: 0, levelCount: 0, valueCount: 0, catchCount: 0, skipsCount: 0, opInLevelCount: 0, opInLevelTotal: 0, tupleInOpCount: 0, tupleInOpTotal: 0}
  }

  addValueToState(state, {values: inputs, code: 'input', frontier: true});

  for (const {value, code} of constants) {
    // eslint-disable-next-line no-eval
    const values = inOutPairs.map(() => value);
    addValueToState(state, {values, code, frontier: true})
  }

  return state;
}

function* tupleGen <T>(arr: T[], n: number): Generator<T[]> {
  const count = Math.pow(arr.length, n);
  for (var i = 0 ; i <  count; i++) {
    const tuple = [];
    var i2 = i;
    for (var j = 0; j < n; j++) {
      tuple[n-j-1] = arr[i2 % arr.length];
      i2 = Math.floor(i2 / arr.length);
    }
    yield tuple;
  }
}

// function nextLevel (state: SynthesisState): void {
//   const sortedValues = _.sortBy(Object.values(state.valueMap), (value) => value.code.length);

//   for (const value of Object.values(state.valueMap)) {
//     value.frontier = false;
//   }

//   for (const op of operations) {
//     const t = tupleGen(sortedValues, op.arity);
//     for (const args of t) {
//       const precond = op.precond;
//       if (precond && state.outputs.some((_, i) => !precond(...args.map(arg => arg.values[i])))) {
//         continue;
//       }

//       try {
//         const opOutputs = state.outputs.map((_, i) => {
//           const opInputs = args.map(arg => arg.values[i]);
//           return op.func(...opInputs);
//         });

//         const opExpr = op.codeFunc(...args.map(arg => arg.code));

//         addValueToState(state, {
//           values: opOutputs,
//           code: opExpr,
//           frontier: true,
//         });
//         if (state.result) { return; }
//       } catch {
//         state.progress.catchCount++;
//       }
//     }
//   }
// }

// export function synthesize(task: [any, any][], maxLevels = 3) {
//   const state = initializeState(task);
//   if (state.result) {
//     return state.result;
//   }

//   for (let levelIdx = 0; levelIdx < maxLevels; levelIdx++) {
//     nextLevel(state);
//     if (state.result) {
//       return state.result;
//     }
//   }
// }

function* nextLevelGen (state: SynthesisState): Generator<SynthesisState> {
  const sortedValues = _.sortBy(Object.values(state.valueMap), (value) => value.code.length);

  for (const value of Object.values(state.valueMap)) {
    value.frontier = false;
  }

  state.progress.opInLevelTotal = operations.length;
  state.progress.opInLevelCount = 0;
  for (const op of operations) {
    state.progress.opInLevelCount++;
    const t = tupleGen(sortedValues, op.arity);
    state.progress.tupleInOpTotal = Math.pow(sortedValues.length, op.arity);
    state.progress.tupleInOpCount = 0;
    for (const args of t) {
      state.progress.tupleInOpCount++;
      state.progress.testsCount++;

      if (state.progress.testsCount % 20000 === 0) {
        yield state;
      }

      const precond = op.precond;
      if (precond && state.outputs.some((_, i) => !precond(...args.map(arg => arg.values[i])))) {
        state.progress.skipsCount++;
        continue;
      }

      try {
        const opOutputs = state.outputs.map((_, i) => {
          const opInputs = args.map(arg => arg.values[i]);
          return op.func(...opInputs);
        });

        const opExpr = op.codeFunc(...args.map(arg => arg.code));

        addValueToState(state, {
          values: opOutputs,
          code: opExpr,
          frontier: true,
        });
        if (state.result) { return; }
      } catch {
        state.progress.catchCount++;
      }
    }
  }
}

export function* synthesizeGen(task: [any, any][], maxLevels = 3): Generator<SynthesisState, string | undefined> {
  const state = initializeState(task);
  if (state.result) {
    return state.result;
  }

  for (let levelIdx = 1; levelIdx <= maxLevels; levelIdx++) {
    state.progress.levelCount = levelIdx;
    yield* nextLevelGen(state);
    if (state.result) {
      return state.result;
    }
  }
}





// const tasks: [any, any][][] = [
//   [
//     ["George Washington Carver", "GWC"],
//     ["Josh Horowitz", "JH"],
//     ["Paula Te", "PT"]
//   ],
//   [
//     ["George Washington Carver", "George"],
//     ["Josh Horowitz", "Josh"],
//     ["Paula Te", "Paula"]
//   ],
//   [
//     ["George Washington Carver", 3],
//     ["Josh Horowitz", 2],
//     ["Paula Te", 2]
//   ],
//   [
//     [[1, 2], 3],
//     [[2, 0], 2],
//     [[3, -1], 2]
//   ],
//   // [
//   //   [["George Washington Carver", 1], "Washington"],
//   //   [["Josh Horowitz", 0], "Josh"],
//   //   [["Paula Te", 1], "Te"]
//   // ],
//   // [
//   //   [["George Washington Carver", 2], "Washington"],
//   //   [["Josh Horowitz", 1], "Josh"],
//   //   [["Paula Te", 2], "Te"]
//   // ],
// ]

// let totalTime = 0;
// for (const task of tasks) {
//   let s = initializeState(task);
//   for (let i = 0; i < 4; i++) {
//     const start = process.hrtime()
//     s = step(s);
//     const end = process.hrtime(start);
//     const time = end[0] * 1000 + end[1] / 1000000;
//     console.info(`step ${i + 1}: ${time.toFixed(3)}`)
//     totalTime += time;
//     if (s.result) {
//       console.log(`found it: ${s.result} (${s.catchCount} catches)`);
//       break;
//     }
//   }
// }
// console.info(`total time: ${totalTime.toFixed(3)}`)

// // picking keys from objects
// // better handling of higher-level ops (map, reduce)

// // ways to make this faster:
// // "smells"
// //   reduce priority on values that are much bigger than the value you're looking for
// //   increase priority on values that /contain/ the value you're looking for
