import { InternMap } from "../../util/internmap";
import { mapUpdate } from "../../util/mapUpdate";


export const wildcard = {wildcard: true};

export type PatternStep = string | number | typeof wildcard;
export type Pattern = PatternStep[];
export type Path = (string | number)[];

export function isWildcard(step: PatternStep): step is typeof wildcard {
  return typeof step === 'object';
}

function followPattern(value: any, pattern: Pattern): any {
  if (pattern.length === 0 || value === undefined) {
    return value;
  }

  const [firstStep, ...restPath] = pattern;
  if (isWildcard(firstStep)) {
    return Object.values(value).flatMap(subvalue => followPattern(subvalue, restPath));
  } else {
    return followPattern(value[firstStep], restPath);
  }
}

export function mergePatterns(patterns: Pattern[]): (value: unknown) => unknown {
  const headPaths = patterns.map(getHeadPath);
  // A pattern with a given head-path will be followed after that head by either:
  // * the end of the pattern, or
  // * a wildcard.
  // If all the patterns here have one or the other of these, life is easy.
  // Otherwise, we need to append _ROOT & _ALL (names TBD).

  const commonHead = getCommonHead(headPaths);

  const patternsByHead = new InternMap<Path, {atRoot: boolean, afterWildcard: Pattern[]}>([], JSON.stringify);

  patterns.forEach((pattern) => {
    const headPath = getHeadPath(pattern)
    const pathAfterCommon = headPath.slice(commonHead.length);
    mapUpdate(patternsByHead, pathAfterCommon, (prev) => {
      if (!prev) {
        prev = {atRoot: false, afterWildcard: []};
      }
      if (pattern[headPath.length] === undefined) {
        prev.atRoot = true;
      } else if (isWildcard(pattern[headPath.length])) {
        prev.afterWildcard.push(pattern.slice(headPath.length + 1));
      } else {
        throw new Error('waaaaat');
      }
      return prev;
    })
  })

  let subMergers: {key: string, pathAfterCommon: Path, func: (value: unknown) => unknown}[] = [];

  patternsByHead.forEach(({atRoot, afterWildcard}, pathAfterCommon) => {
    let conflict = atRoot && afterWildcard.length > 0;

    if (atRoot) {
      let pathAfterCommonForKey = pathAfterCommon;
      if (conflict) {
        pathAfterCommonForKey = [...pathAfterCommon, 'ROOT'];
      }
      subMergers.push({
        key: pathAfterCommonForKey.length === 0 ? 'ROOT' : pathAfterCommonForKey.join('_'),
        pathAfterCommon,
        func: (value) => value,
      });
    }

    if (afterWildcard.length > 0) {
      let pathAfterCommonForKey = pathAfterCommon;
      if (conflict) {
        pathAfterCommonForKey = [...pathAfterCommon, 'ALL'];
      }

      const itemFunc = mergePatterns(afterWildcard)

      subMergers.push({
        key: pathAfterCommonForKey.length === 0 ? 'ALL' : pathAfterCommonForKey.join('_'),
        pathAfterCommon,
        func: (value) => typeof value === 'object' && value !== null ? Object.values(value).map(itemFunc) : [],
      });
    }

  })

  if (subMergers.length === 1) {
    if (subMergers[0].pathAfterCommon.length > 0) {
      throw new Error('no way');
    }
    return (value) => {
      const valueToCommon = followPattern(value, commonHead);
      return subMergers[0].func(valueToCommon);
    }
  } else {
    return (value) => {
      const valueToCommon = followPattern(value, commonHead);
      return Object.fromEntries(subMergers.map(({key, pathAfterCommon, func}) => [
        key,
        func(followPattern(valueToCommon, pathAfterCommon))
      ]))
    }
  }
}

function getHeadPath(pattern: Pattern): Path {
  let path: Path = [];
  for (const step of pattern) {
    if (isWildcard(step)) {
      return path;
    }
    path.push(step);
  }
  return path;
}

function getCommonHead(paths: Path[]): Path {
  if (paths.length === 0) {
    throw new Error('idk man');
  }
  const [firstPath, ...otherPaths] = paths;

  let common: Path = [];
  for (let i = 0; i < firstPath.length; i++) {
    if (otherPaths.some(otherPath => otherPath[i] !== firstPath[i])) {
      break;
    }
    common.push(firstPath[i]);
  }
  return common;
}
