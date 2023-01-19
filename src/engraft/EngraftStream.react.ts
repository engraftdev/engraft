import _ from "lodash";
import { useEffect, useState } from "react";
import { EngraftStream } from "./EngraftStream";

export function useStream<T>(stream: EngraftStream<T>): T | undefined {
  const [value, setValue] = useState(stream.get());
  useEffect(() => {
    const unsubscribe = stream.subscribe(setValue);
    return unsubscribe;
  }, [stream]);
  return value;
}

export function useStreamObj<T>(streams: {[key: string]: EngraftStream<T>}): {[key: string]: T | undefined} {
  const [values, setValues] = useState(() => _.mapValues(streams, stream => stream.get()));
  useEffect(() => {
    const unsubscribes = _.map(streams, (stream, key) => stream.subscribe(value => {
      setValues(values => ({...values, [key]: value}));
    }));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [streams]);
  return values;
}
