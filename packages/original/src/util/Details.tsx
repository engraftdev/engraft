import { memo, ReactEventHandler, ReactNode, useCallback, useState } from "react";

export type DetailsProps = {
  summary: ReactNode,
  children: ReactNode,
}

export const Details = memo((props: DetailsProps) => {
  const { summary, children } = props;

  const [open, setOpen] = useState(false);

  const onToggle: ReactEventHandler<HTMLDetailsElement> = useCallback((ev) => {
    setOpen(ev.currentTarget.open);
  }, []);

  return (
    <details onToggle={onToggle}>
      <summary>{summary}</summary>
      {open && children}
    </details>
  );
});
