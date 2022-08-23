export function log<T>(arg1: T): T
export function log<T>(arg1: any, arg2: T): T
export function log<T>(arg1: any, arg2: any, arg3: T): T
export function log(...args: any[]) {
  console.log(...args);
  return args[args.length - 1];
}
