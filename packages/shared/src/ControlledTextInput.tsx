import { ChangeEvent, HTMLProps, memo, useCallback, useEffect, useRef, useState } from "react";

import * as ContentEditableModule from "react-contenteditable";
// TODO: look carefully at https://github.com/lovasoa/react-contenteditable/issues/161

// TODO: what hath ESM wrought?
const ContentEditable = ContentEditableModule.default as unknown as typeof import("react-contenteditable").default;


interface ControlledTextInputProps extends HTMLProps<HTMLInputElement> {
  value: string,
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const ControlledTextInput = memo(function ControlledTextInput(props: ControlledTextInputProps) {
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
});


interface ControlledSpanProps extends HTMLProps<HTMLSpanElement> {
  value: string,
  onValue: (value: string) => void;
}

export const ControlledSpan = memo(function ControlledSpan(props: ControlledSpanProps) {
  const { value, onValue, style, className } = props;

  return <ContentEditable
    html={value}
    onChange={useCallback((e) => {
      onValue(e.target.value);
    } , [onValue])}
    style={style}
    className={className}
  />;
});
