import { UpdateProxy } from '@engraft/update-proxy';
import { Updater } from '@engraft/shared/lib/Updater';
import { Fragment } from 'react';
import TestRenderer from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { UseUpdateProxy, useUpdateProxy } from '../dist';

describe('useUpdateProxy', () => {
  it('basically works', () => {
    let latestUpdateProxy: UpdateProxy<object> | null = null;
    const MyComponent = (props: {updater: Updater<object>}) => {
      latestUpdateProxy = useUpdateProxy(props.updater);
      return null;
    };

    const testRenderer = TestRenderer.create(<Fragment></Fragment>);

    const updater1 = () => {};
    testRenderer.update(<MyComponent updater={updater1} />);
    expect(latestUpdateProxy).not.toBeNull();
    const updateProxy1 = latestUpdateProxy!;

    testRenderer.update(<MyComponent updater={updater1} />);
    expect(latestUpdateProxy).toBe(updateProxy1);

    const updater2 = () => {};
    testRenderer.update(<MyComponent updater={updater2} />);
    expect(latestUpdateProxy).not.toBeNull();
    const updateProxy2 = latestUpdateProxy!;
    expect(updateProxy2).not.toBe(updateProxy1);
  });
});

describe('UseUpdateProxy', () => {
  it('basically works', () => {
    let latestUpdateProxy: UpdateProxy<object> | null = null;

    const testRenderer = TestRenderer.create(<Fragment></Fragment>);

    const updater1: Updater<object> = () => {};
    testRenderer.update(
      <UseUpdateProxy updater={updater1} children={(updateProxy) => {
        latestUpdateProxy = updateProxy;
        return null;
      }} />
    );
    expect(latestUpdateProxy).not.toBeNull();
    const updateProxy1 = latestUpdateProxy!;

    testRenderer.update(
      <UseUpdateProxy updater={updater1} children={(updateProxy) => {
        latestUpdateProxy = updateProxy;
        return null;
      }} />
    );
    expect(latestUpdateProxy).toBe(updateProxy1);

    const updater2: Updater<Object> = () => {};
    testRenderer.update(
      <UseUpdateProxy updater={updater2} children={(updateProxy) => {
        latestUpdateProxy = updateProxy;
        return null;
      }} />
    );
    expect(latestUpdateProxy).not.toBeNull();
    const updateProxy2 = latestUpdateProxy!;
    expect(updateProxy2).not.toBe(updateProxy1);
  });
});
