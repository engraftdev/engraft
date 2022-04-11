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

function isString(x: unknown): boolean {
  return typeof x === 'string';
}

function isArray(x: unknown): x is Array<unknown> {
  return x instanceof Array;
}

function isNumber(x: unknown): boolean {
  return typeof x === 'number';
}

function isArrayOf(itemCond: (item: unknown) => boolean): (x: unknown) => boolean {
  return function (x: unknown): boolean {
    return isArray(x) && (x.length === 0 || itemCond(x));
  };
}

const valueTypes = {
  string: isString,
  array: isArray as (x: unknown) => boolean,
  number: isNumber,
  arrayOfString: isArrayOf(isString),
  arrayOfArray: isArrayOf(isArray),
  arrayOfNumber: isArrayOf(isNumber),
}

type Precond = keyof typeof valueTypes | ((value: unknown) => boolean);

interface Operation {
  arity: number,
  func: (...args: unknown[]) => unknown,
  codeFunc: (...args: string[]) => string,
  preconds: Precond[][]
}

function operationFromCodeFunc(
  codeFunc: (...args: string[]) => string,
  preconds: Precond[][]
): Operation {
  const arity = codeFunc.length;
  if (preconds.length !== arity) {
    throw new Error('mismatching preconds length');
  }
  const args = [...Array(arity).keys()].map((_, i) => 'a' + i);
  return {
    arity: codeFunc.length,
    // eslint-disable-next-line no-new-func
    func: new Function(...args, 'return ' + codeFunc(...args)) as any,
    codeFunc,
    preconds
  }
}

// function hasProp(x: unknown, prop: string): x is {prop: any} {
//   return typeof x === 'object' && x !== null && prop in x;
// }

let operations: Operation[] = [
  operationFromCodeFunc(
    (s1: string, s2: string) => `${s1}.split(${s2})`,
    [['string'], ['string']],
  ),
  operationFromCodeFunc(
    (s1: string, s2: string) => `${s1}.join(${s2})`,
    [['array'], ['string']],
  ),
  operationFromCodeFunc(
    (s1: string, n1: string, n2: string) => `${s1}.slice(${n1}, ${n2})`,
    [['array', 'string'], ['number'], ['number']],
  ),
  operationFromCodeFunc(
    (s1: string, n1: string) => `${s1}.slice(${n1})`,
    [['array', 'string'], ['number']],
  ),
  operationFromCodeFunc(
    (s1: string, n1: string) => `${s1}[${n1}]`,
    [['array', 'string'], ['number']],
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.length`,
    [['array', 'string']],
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.flatten()`,
    [['arrayOfArray']],
  ),
  // TODO STRETCH: symmetry
  operationFromCodeFunc(
    (n1: string, n2: string) => `(${n1} + ${n2})`,
    [['number', 'string'], ['number', 'string']],
  ),
  operationFromCodeFunc(
    (n1: string, n2: string) => `(${n1} - ${n2})`,
    [['number'], ['number']],
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.slice().reverse()`,
    [['array']],
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.toUpperCase()`,
    [['string']],
  ),
  operationFromCodeFunc(
    (s1: string) => `${s1}.toLowerCase()`,
    [['string']],
  ),
]

function replaceWith<T>(arr: T[], idx: number, val: T): T[] {
  const copy = arr.slice();
  copy[idx] = val;
  return copy;
}

operations = [
  ...operations,
  ...operations.flatMap(({arity, func, codeFunc, preconds}) => {
    return _.range(arity).map((i) => {
      let newPreconds = preconds.slice();
      newPreconds[i] = preconds[i].map((precond) => {
        if (precond === 'array') {
          return 'arrayOfArray';
        } else if (precond === 'number') {
          return 'arrayOfNumber';
        } else if (precond === 'string') {
          return 'arrayOfString';
        } else if (typeof precond === 'string') {
          const precondFunc = valueTypes[precond];
          return isArrayOf(precondFunc);
        } else {
          return isArrayOf(precond);
        }
      })

      return {
        arity: arity,
        func: (...args: any[]) => args[i].map((x: any) => func(...replaceWith(args, i, x))),
        codeFunc: (...args: string[]) => `${args[i]}.map((x) => ${codeFunc(...replaceWith(args, i, 'x'))})`,
        preconds: newPreconds
      }
    })
  })
]

// console.log(operations.map(({codeFunc}) => codeFunc("A", "B", "C", "D")))
// process.exit();

interface ValueInfo {
  values: any[],
  code: string,
  frontier: boolean,
}

interface ValueInfosByStr {
  [valuesStr: string]: ValueInfo
}

export interface SynthesisState {
  inputs: any[],
  outputs: any[],
  outputsKey: any,
  valueInfosByStr: ValueInfosByStr,
  valueInfosByType: {[name in keyof typeof valueTypes]: ValueInfo[]}
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

function addValueToState (state: SynthesisState, valueInfo: ValueInfo): void {
  const valueKey = objectToKey(valueInfo.values);

  // check if we've obtained the objective
  if (valueKey === state.outputsKey) {
    state.result = valueInfo.code;
    return;
  }

  // check if it's in the map already
  if (state.valueInfosByStr[valueKey]) {
    if (valueInfo.code.length < state.valueInfosByStr[valueKey].code.length) {
      state.valueInfosByStr[valueKey].code = valueInfo.code;
    }
  } else {
    state.valueInfosByStr[valueKey] = valueInfo;

    for (const valueTypeName in valueTypes) {
      if (valueInfo.values.every(valueTypes[valueTypeName as keyof typeof valueTypes])) {
        state.valueInfosByType[valueTypeName as keyof typeof valueTypes].push(valueInfo);
      }
    }

    state.progress.valueCount++;
  }
}

function initializeState (inOutPairs: [any, any][]): SynthesisState {
  const inputs = inOutPairs.map(([input, output]) => input)
  const outputs = inOutPairs.map(([input, output]) => output)
  const state = {
    valueInfosByStr: {}, valueInfosByType: _.mapValues(valueTypes, () => []), inputs, outputs, outputsKey: objectToKey(outputs), result: undefined,
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

function* valueInfosFromPrecondsGen (state: SynthesisState, preconds: Precond[][], tuple?: ValueInfo[]): Generator<ValueInfo[]> {
  if (!tuple) {
    tuple = [];
  }

  const depth = tuple.length;

  if (depth === preconds.length) {
    yield tuple;
    return;
  }

  const curPreconds = preconds[depth];

  for (const precond of curPreconds) {
    if (typeof precond === 'string') {
      for (const valueInfo of state.valueInfosByType[precond]) {
        tuple.push(valueInfo);
        yield* valueInfosFromPrecondsGen(state, preconds, tuple);
        tuple.pop();
      }
    } else {
      for (const valueInfo of Object.values(state.valueInfosByStr)) {
        if (valueInfo.values.every(precond)) {
          tuple.push(valueInfo);
          yield* valueInfosFromPrecondsGen(state, preconds, tuple);
          tuple.pop();
        }
      }
    }
  }
}

function* nextLevelGen (state: SynthesisState): Generator<SynthesisState> {
  // TODO: might be expensive
  const oldState = _.cloneDeep(state);

  for (const value of Object.values(state.valueInfosByStr)) {
    value.frontier = false;
  }

  state.progress.opInLevelTotal = operations.length;
  state.progress.opInLevelCount = 0;
  for (const op of operations) {
    state.progress.opInLevelCount++;
    // const t = tupleGen(sortedValues, op.arity);
    const t = valueInfosFromPrecondsGen(oldState, op.preconds);
    // state.progress.tupleInOpTotal = Math.pow(sortedValues.length, op.arity);
    // state.progress.tupleInOpCount = 0;
    for (const args of t) {
      state.progress.tupleInOpCount++;
      state.progress.testsCount++;

      if (state.progress.testsCount % 20000 === 0) {
        yield state;
      }

      try {
        // TODO: this is a hack that speeds us up by 1.5x, shrug
        let opOutputs: unknown[] = [];
        for (let i = 0; i < state.outputs.length; i++) {
          opOutputs[i] = op.func(args[0]?.values[i], args[1]?.values[i], args[2]?.values[i])
        }

        // // old version
        // const opOutputs = state.outputs.map((_, i) => {
        //   const opInputs = args.map(arg => arg.values[i]);
        //   return op.func(...opInputs);
        // });

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

// // picking keys from objects
// // better handling of higher-level ops (map, reduce)

// // ways to make this faster:
// // "smells"
// //   reduce priority on values that are much bigger than the value you're looking for
// //   increase priority on values that /contain/ the value you're looking for
