import { usePrevious } from "./usePrevious";

// Utility for debugging what might be causing a component to re-render.
// Just call:
//   useLogChanges({someVar, someOtherVar, ...})

export function useLogChanges(values: any) {
  const prevValues = usePrevious(values, null);
  for (const key in values) {
    if (prevValues && values[key] !== prevValues[key]) {
      console.log(`${key}: ${prevValues[key]} → ${values[key]}`);
    }
  }
}
