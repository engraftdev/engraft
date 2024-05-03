import TestRenderer from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "../lib/useLocalStorage.js";
import { act } from "react-dom/test-utils";
import { Fragment } from "react";

// @vitest-environment happy-dom

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('init runs if key missing', async () => {
    const MyComponent = (props: {}) => {
      const [value, _setValue] = useLocalStorage('local-storage-key', () => 20);
      return <div>{value}</div>;
    };

    let testRenderer = TestRenderer.create(<Fragment />);
    await act(() => {
      testRenderer.update(<MyComponent />);
    });
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['20']});
    expect(window.localStorage.getItem('local-storage-key')).toBe('20');
  });

  it('init does not run if key present', async () => {
    window.localStorage.setItem('local-storage-key', '30');

    const MyComponent = (props: {}) => {
      const [value, _setValue] = useLocalStorage('local-storage-key', () => 20);
      return <div>{value}</div>;
    };

    let testRenderer = TestRenderer.create(<Fragment />);
    await act(() => {
      testRenderer.update(<MyComponent />);
    });
    expect(testRenderer.toJSON()).toEqual({type: 'div', props: {}, children: ['30']});
    expect(window.localStorage.getItem('local-storage-key')).toBe('30');
  });

  it('setValue works', async () => {
    const MyComponent = (props: {onRender: (value: any) => void}) => {
      const [value, setValue] = useLocalStorage('local-storage-key', () => 20);
      props.onRender(value);
      return <button onClick={() => setValue(40)}>Set 40</button>;
    };

    const onRender = vi.fn();

    let testRenderer = TestRenderer.create(<Fragment />);
    await act(() => {
      testRenderer.update(<MyComponent onRender={onRender} />);
    });
    expect(onRender).toHaveBeenCalledWith(20);
    expect(localStorage.getItem('local-storage-key')).toBe('20');

    await act(() => {
      testRenderer.root.findByType('button').props.onClick();
    });
    expect(onRender).toHaveBeenCalledWith(40);
    expect(localStorage.getItem('local-storage-key')).toBe('40');
  });
});
