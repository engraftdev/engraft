import React, { ChangeEvent, HTMLProps, useEffect, useRef, useState } from 'react';

interface ControlledTextInputProps extends HTMLProps<HTMLInputElement> {
  value: string,
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function ControlledTextInput(props: ControlledTextInputProps) {
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


interface ControlledSpanProps extends HTMLProps<HTMLSpanElement> {
  value: string,
  onValue: (value: string) => void;
}


export function ControlledSpan(props: ControlledSpanProps) {
  const { value, onValue, ...rest } = props;
  const [cursor, setCursor] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input || !cursor) { return; }

    var range = document.createRange()
    var sel = window.getSelection()!

    range.setStart(input.childNodes[0], cursor)
    range.collapse(true)

    sel.removeAllRanges()
    sel.addRange(range)
  }, [ref, cursor, value]);

  const handleChange = (e: ChangeEvent<HTMLSpanElement>) => {
    var sel = document.getSelection()!;
    setCursor(sel.focusOffset);
    onValue && onValue(e.target.innerText);
  };

  return <span ref={ref} contentEditable={true} onInput={handleChange} suppressContentEditableWarning={true} {...rest}>{value}</span>;
};