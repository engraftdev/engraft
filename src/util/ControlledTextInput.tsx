import React, { ChangeEvent, HTMLProps, useEffect, useRef, useState } from 'react';

interface Props extends HTMLProps<HTMLInputElement> {
  value: string,
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function ControlledTextInput(props: Props) {
  const { value, onChange, ...rest } = props;
  const [cursor, setCursor] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (input) {
      input.setSelectionRange(cursor, cursor);
    }
  }, [ref, cursor, value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCursor(e.target.selectionStart);
    onChange && onChange(e);
  };

  return <input ref={ref} type='text' value={value} onChange={handleChange} {...rest} />;
};
