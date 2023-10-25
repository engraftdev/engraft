import { ErrorView } from "@engraft/core-widgets";
import { ShadowDOM } from "@engraft/shared/lib/ShadowDOM.js";
import { Updater } from '@engraft/shared/lib/Updater.js';
import { Use } from '@engraft/shared/lib/Use.js';
import { count } from "@engraft/shared/lib/count.js";
import { startDrag } from "@engraft/shared/lib/drag.js";
import { isoformat } from "@engraft/shared/lib/isoformat.js";
import { useHover } from '@engraft/shared/lib/useHover.js';
import { CollectReferences, EngraftPromise, InputHeading, MakeProgram, ShowView, ToolProgram, ToolProps, ToolResult, ToolView, ToolViewRenderProps, UpdateProxy, UpdateProxyRemovable, defineTool, hookMemo, hookRunTool, hooks, inputFrameBarBackdrop, memoizeProps, usePromiseState, useUpdateProxy } from '@engraft/toolkit';
import { Menu, MenuButton, MenuPopover } from '@reach/menu-button';
import { CSSProperties, ReactNode, memo, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Column, DataFrame, ValueType, inferDataFrameFromRows } from "./data-frame.js";
import style from './style.css?inline';
import { Filter, FilterType, Transforms, applyTransformsExceptSelect, applyTransformsJustSelect, filterTypes, filterTypesByValueType } from "./transforms.js";

/*
out of scope for now:
* column summaries graphics
* parsing column data (dates from strings, numbers from strings from CSV, etc)
* super cute pop-up menus (just come up with something that works)
*/

type P = {
  toolName: 'data-table',
  inputProgram: ToolProgram,
  transforms: Transforms,
  cellWidths: Record<string, number>,  // TODO: gotta rename these when cols get renamed
}

const makeProgram: MakeProgram<P> = (context, defaultCode) => ({
  toolName: 'data-table',
  inputProgram: context.makeSlotWithCode(defaultCode),
  transforms: {
    sort: [],
    filter: [],
    names: [],
  },
  cellWidths: {},
});

const collectReferences: CollectReferences<P> = (program) => program.inputProgram;

const run = memoizeProps(hooks((props: ToolProps<P>) => {
  const { program, varBindings, context } = props;

  const inputResult = hookRunTool({program: program.inputProgram, varBindings, context});

  const dataFramesP = hookMemo(() => inputResult.outputP.then((inputOutput) => {
    const input = inferDataFrameFromRows(inputOutput.value);
    const outputExceptSelect = applyTransformsExceptSelect(input, program.transforms);
    const output = applyTransformsJustSelect(outputExceptSelect, program.transforms);
    return {input, outputExceptSelect, output};
  }), [inputResult, program.transforms]);

  const outputP = hookMemo(() => dataFramesP.then((dataFrames) => {
    const { output } = dataFrames;
    if (output.columns.length === 1) {
      return {value: output.rows.map((row) => row[output.columns[0].name])};
    }
    return {value: output.rows};
  }), [dataFramesP]);

  const view: ToolView<P> = hookMemo(() => ({
    render: (renderProps) => <View
      {...props} {...renderProps}
      inputResult={inputResult}
      dataFramesP={dataFramesP}
    />,
  }), [props, inputResult, dataFramesP]);

  return {outputP, view};
}));

export default defineTool({ name: "data-table", makeProgram, collectReferences, run });

const View = memo((props: ToolProps<P> & ToolViewRenderProps<P> & {
  inputResult: ToolResult,
  dataFramesP: EngraftPromise<{input: DataFrame, outputExceptSelect: DataFrame, output: DataFrame}>,
}) => {
  const { program, updateProgram, autoFocus, frameBarBackdropElem, inputResult, dataFramesP } = props;
  const programUP = useUpdateProxy(updateProgram);

  const dataFramesState = usePromiseState(dataFramesP);

  return (
    <div className="xCol">
      {frameBarBackdropElem && createPortal(inputFrameBarBackdrop, frameBarBackdropElem)}
      <InputHeading
        slot={<ShowView view={inputResult.view} updateProgram={programUP.inputProgram.$} autoFocus={autoFocus} />}
      />
      { dataFramesState.status === 'pending' && <div>loading...</div> }
      { dataFramesState.status === 'rejected' && <ErrorView error={dataFramesState.reason} /> }
      { dataFramesState.status === 'fulfilled' &&
        <Table
          dataFrames={dataFramesState.value}
          program={program}
          updateProgram={updateProgram}
        />
      }
    </div>
  );
});

const Table = memo((props: {
  dataFrames: {input: DataFrame, outputExceptSelect: DataFrame, output: DataFrame},
  program: P,
  updateProgram: Updater<P>,
}) => {
  const { dataFrames, program, updateProgram } = props;
  const programUP = useUpdateProxy(updateProgram);

  const [maxRows, setMaxRows] = useState(50);

  return <ShadowDOM>
    <style>{style}</style>
    <div
      className="container overflow-auto bt bl br b--light-silver"
      style={{
        // margin: '0px -14px',
        borderTopRightRadius: 'var(--border-radius-2)',

        // TODO: so delicate!
        maxHeight: '369px',
      }}
      onScroll={(ev) => {
        const target = ev.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = target;
        if (scrollTop + clientHeight + 1 >= scrollHeight) {
          setMaxRows(maxRows + 50);
        }
      }}
    >
      <table
        className="dark-gray ma0 nowrap overflow-visible"
        style={{
          tableLayout: 'fixed',
          font: '13px/1.2 var(--sans-serif)',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}
      >
        <thead className="sticky top-0 v-top tl">
          <tr>
            <th
              role="button"
              style={{
                ...allHeaderCellStyle,
                borderLeft: 'none',
                verticalAlign: 'top',
                cursor: 'pointer',
                userSelect: 'none',
                width: '30px',
                padding: '7px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{transition: 'transform 150ms ease 0s'}}><path d="M13 6.5L8 12L3 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            </th>
            {dataFrames.outputExceptSelect.columns.map((column) =>
              <TableHeaderCell
                key={column.name}
                column={column}
                programUP={programUP}
                removeColumn={() => {
                  programUP.transforms.select.$default(dataFrames.input.columns.map((c) => c.name));
                  programUP.transforms.select.$apply((cols) => cols!.filter((c) => c !== column.name))
                }}
                width={program.cellWidths[column.name]}
                widthUP={programUP.cellWidths[column.name].$as<number | undefined>()}
                selected={dataFrames.output.columns.includes(column)}
              />
            )}
            <th
              style={{
                position: 'relative',
                background: 'var(--white)',
                borderBottom: 'solid 1px var(--light-silver)',
                borderLeft: 'solid 1px var(--light-silver)',

                // width: '99%',
              }}
            >

            </th>
          </tr>
        </thead>
        <tbody
          style={{
            maxHeight: '300px',
            overflowY: 'scroll',
          }}
        >
          {/* TODO: we could alternately use react-window for fast rendering */}
          {dataFrames.outputExceptSelect.rows.slice(0, maxRows).map((row, i) =>
            <TableRow key={i} i={i} rowData={row} columns={dataFrames.outputExceptSelect.columns} selectedColumns={dataFrames.output.columns} />
          )}
        </tbody>
      </table>
    </div>
    <div
      className="mid-gray f7 flex items-center justify-between b--light-silver pv1 ph2 ba"
      style={{
        // margin: '0px -14px',
        height: '34px',
      }}
    >
      <div />
      <div style={{fontVariantNumeric: 'tabular-nums'}}>
        {/* TODO: commas */}
        {count(dataFrames.output.rows.length, 'row', 'rows')}
      </div>
    </div>
    <div
      // TODO: bg-observable-focus-lightest-blue is for focused, otherwise bg-near-white
      className="flex items-stretch flex-wrap br2 br--bottom bg-observable-focus-lightest-blue"
      style={{
        // margin: '0px -14px',
        padding: '4px 6px',
        rowGap: '2px',
        minHeight: '29px',
        borderBottomLeftRadius: '0px',
      }}
    >
      <TransformMenu count={program.transforms.filter.length} label={<>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr1"><path d="M3.06752 3H12.9325C13.3564 3 13.588 3.49443 13.3166 3.82009L9 9V11.7929C9 11.9255 8.94732 12.0527 8.85355 12.1464L7.85355 13.1464C7.53857 13.4614 7 13.2383 7 12.7929V9L2.68341 3.82009C2.41202 3.49443 2.6436 3 3.06752 3Z" fill="currentColor"></path></svg>
        Filter
      </>}>
        <div className="gray f7 pb12">
          Filter
        </div>
        <FiltersEditor
          filters={program.transforms.filter}
          filtersUP={programUP.transforms.filter}
          inputDataFrame={dataFrames.input}
        />
      </TransformMenu>
      <TransformMenu count={program.transforms.select?.length || 0} label={<>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr1"><path fillRule="evenodd" clipRule="evenodd" d="M1 5C1 2.79086 2.79086 1 5 1H11C13.2091 1 15 2.79086 15 5V11C15 13.2091 13.2091 15 11 15H5C2.79086 15 1 13.2091 1 11V5ZM5 3C3.89543 3 3 3.89543 3 5V11C3 12.1046 3.89543 13 5 13H11C12.1046 13 13 12.1046 13 11V5C13 3.89543 12.1046 3 11 3H5Z" fill="currentColor"></path><path fillRule="evenodd" clipRule="evenodd" d="M11.7071 6.70711L7.00001 11.4142L4.29291 8.70711L5.70712 7.29289L7.00001 8.58579L10.2929 5.29289L11.7071 6.70711Z" fill="currentColor"></path></svg>
        Columns
      </>}>
        <div className="flex justify-between pb12">
          <div className="gray f7">
            Columns
          </div>
          {program.transforms.select &&
            <button
              className="bg-transparent bn blue fw6 f7 pa0 pointer"
              onClick={() => programUP.transforms.select.$remove()}
            >
              Show all
            </button>
          }
        </div>
        {dataFrames.input.columns.map((column) =>
          <Use key={column.name} hook={useHover} children={([hoverRef, isHovered]) =>
            <div ref={hoverRef} className="flex mb1">
              <label className="flex fg1 items-start mr2 f6 fw5 lh-copy pointer dark-gray" style={{flexGrow: 1}}>
                <input
                  type="checkbox"
                  className="pointer mr2 mt1"
                  checked={!program.transforms.select || program.transforms.select.includes(column.name)}
                  onChange={(e) => {
                    programUP.transforms.select.$default(dataFrames.input.columns.map((c) => c.name))
                    if (e.target.checked) {
                      programUP.transforms.select.$helper({$push: [column.name]})
                    } else {
                      programUP.transforms.select.$apply((cols) => cols!.filter((c) => c !== column.name))
                    }
                  }}
                />
                <div
                  style={{
                    maxWidth: '260px',
                    overflowX: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {column.name}
                  {/* if renamed... */}
                  {/* <div class="gray f7 truncate">original name</div> */}
                </div>
              </label>
              <button
                className="pointer pa0 only-button"
                style={{
                  color: isHovered ? 'gray' : 'white',
                  backgroundColor: 'white',
                  border: 'none',
                }}
                onClick={(e) => {
                  // TODO: doesn't work sometimes; clicking closes menu
                  programUP.transforms.select.$set([column.name]);
                }}
              >
                only
              </button>
            </div>
          } />
        )}
      </TransformMenu>
      {/* TODO: sorts */}
      {/* <TransformMenu count={0} label={<>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr1"><rect x="2" y="3" width="3" height="2" rx="1" fill="currentColor"></rect><rect x="2" y="12" width="12" height="2" rx="1" fill="currentColor"></rect><rect x="2" y="9" width="9" height="2" rx="1" fill="currentColor"></rect><rect x="2" y="6" width="6" height="2" rx="1" fill="currentColor"></rect></svg>
        Sort
      </>}>
        <div className="gray f7 pb12">
          Sort
        </div>
      </TransformMenu> */}
      {/* TODO: slice */}
      {/* <TransformMenu count={0} label={<>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mr1"><path fillRule="evenodd" clipRule="evenodd" d="M13 4.75C13.6904 4.75 14.25 5.30964 14.25 6C14.25 6.69036 13.6904 7.25 13 7.25C12.3096 7.25 11.75 6.69036 11.75 6C11.75 5.30964 12.3096 4.75 13 4.75ZM15.75 6C15.75 4.48122 14.5188 3.25 13 3.25C11.4812 3.25 10.25 4.48122 10.25 6C10.25 7.51878 11.4812 8.75 13 8.75C14.5188 8.75 15.75 7.51878 15.75 6Z" fill="currentColor"></path><path fillRule="evenodd" clipRule="evenodd" d="M1.5 8L11.5 8V6L1.5 6C0.947715 6 0.5 6.44772 0.5 7C0.5 7.55228 0.947715 8 1.5 8Z" fill="currentColor"></path><path fillRule="evenodd" clipRule="evenodd" d="M3.17594 2.56653L8.67594 10.5665L10.324 9.43347L4.82403 1.43347C4.51114 0.978369 3.88856 0.863076 3.43345 1.17596C2.97835 1.48885 2.86306 2.11143 3.17594 2.56653Z" fill="currentColor"></path><path fillRule="evenodd" clipRule="evenodd" d="M10 10.75C10.6904 10.75 11.25 11.3096 11.25 12C11.25 12.6904 10.6904 13.25 10 13.25C9.30964 13.25 8.75 12.6904 8.75 12C8.75 11.3096 9.30964 10.75 10 10.75ZM12.75 12C12.75 10.4812 11.5188 9.25 10 9.25C8.48122 9.25 7.25 10.4812 7.25 12C7.25 13.5188 8.48122 14.75 10 14.75C11.5188 14.75 12.75 13.5188 12.75 12Z" fill="currentColor"></path></svg>
        Slice
      </>}>
      </TransformMenu> */}
    </div>
  </ShadowDOM>
})

const FiltersEditor = memo((props: {
  filters: Filter[],
  filtersUP: UpdateProxy<Filter[]>,
  inputDataFrame: DataFrame,
}) => {
  const { filters, filtersUP, inputDataFrame } = props;

  return <>
    {filters.map((filter, i) => <FilterEditor
      key={i}
      filter={filter}
      filterUP={filtersUP[i]}
      inputDataFrame={inputDataFrame}
    />)}
    <FilterEditor
      filter={undefined}
      filterUP={filtersUP[filters.length]}
      inputDataFrame={inputDataFrame}
    />
  </>
});

const FilterEditor = memo((props: {
  filter: Filter | undefined,
  filterUP: UpdateProxyRemovable<Filter>,
  inputDataFrame: DataFrame,
}) => {
  const { filter, filterUP, inputDataFrame } = props;

  const initFilter = useCallback((columnName: string) => {
    filterUP.$default({
      type: 'eq',
      operands: [
        { type: 'column', value: columnName },
        { type: 'resolved', value: '' },
      ]
    });
  }, [filterUP]);

  const column = filter && inputDataFrame.columns.find((column) => column.name === filter.operands[0].value as string);


  /* TODO: better-looking selection boxes */
  return <div className="flex mb2">
    <select
      style={{ ...!filter && { color: 'gray' }}}
      value={filter ? filter.operands[0].value as string : '__NONE__'}
      onChange={(e) => {
        const columnName = e.target.value;
        initFilter(columnName);
      }}
    >
      <option value="__NONE__" disabled>Column</option>
      {inputDataFrame.columns.map((column) =>
        <option key={column.name} value={column.name}>{column.name}</option>)
      }
    </select>
    <select
      className="ml2"
      style={{ ...!filter && { color: 'gray' }}}
      value={filter ? filter.type : '__NONE__'}
      onChange={(e) => {
        const filterType = e.target.value as FilterType;
        filterUP.type.$set(filterType);
        filterUP.operands.$apply(operands => {
          if (filterTypes[filterType].arity === 1) {
            return operands.slice(0, 1);
          } else if (filterTypes[filterType].arity === 2 && operands.length === 1) {
            return [...operands, { type: 'resolved', value: '' }];
          }
          return operands;
        });
      }}
    >
      <option value="__NONE__" disabled>Operator</option>
      { column && filterTypesByValueType[column.type].map((filterType) =>
        <option key={filterType} value={filterType}>{filterTypes[filterType].label}</option>)
      }
    </select>
    { filter && filter.operands.length > 1 &&
      <input
        className="ml2"
        type="text"
        value={filter.operands[1].value as string}
        onChange={(e) => {
          filterUP.operands[1].value.$set(e.target.value);
        }}
      />
    }
    { filter &&
      <button className="bg-transparent bn light-gray pointer" title="Remove filter"
        onClick={filterUP.$remove}
      >
        <svg width="16" height="16" viewBox="0 0 10 16" stroke="currentColor" strokeWidth="2"><path d="M1 4L9 12M9 4L1 12"></path></svg>
      </button>
    }
  </div>;
});

const TransformMenu = memo((props: {
  label: ReactNode,
  count: number,
  children: ReactNode,
}) => {
  const { label, count, children } = props;
  return <Menu>
    <MenuButton
      className={`dark-gray hover-black ${count > 0 ? 'bg-white' : 'bg-transparent'} mr-tiny bn ph2 f6 fw5 pa0 br2 lh-copy pointer flex items-center focus-black-05`}
      style={{
        minHeight: '25px',
      }}
    >
      {label}
      {count > 0 && <span className="fw4 ml1 nowrap">{count}</span>}
    </MenuButton>
    <MenuPopover
      style={{
        minWidth: '150px',
      }}
    >
      {/* TODO: this use of ShadowDOM in MenuPopover breaks some kinda multi-click thing; boo */}
      <ShadowDOM>
        <style>{style}</style>
        <div
          className="bg-white ba b--silver br2 shadow-4 outline-0 pa12"
          style={{font: 'var(--font-size-6) var(--sans-serif)'}}
        >
          <div className="bg-white outline-0 undefined">
            {children}
          </div>
        </div>
      </ShadowDOM>
    </MenuPopover>
  </Menu>
});

const allHeaderCellStyle: CSSProperties = {
  position: 'relative',
  background: 'var(--white)',
  borderBottom: 'solid 1px var(--light-silver)',
  borderLeft: 'solid 1px var(--light-silver)',
};

const unselectedCellStyle: CSSProperties = {
  background: 'hsl(0,0%,90%)',
  opacity: 0.5,
};

const TableHeaderCell = memo((props: {
  column: Column,
  programUP: UpdateProxy<P>,
  removeColumn: () => void,
  width: number | undefined,
  widthUP: UpdateProxy<number | undefined>,
  selected: boolean,
}) => {
  const { column, removeColumn, width, widthUP, selected } = props;

  const [ref, isHovered] = useHover();
  const [isFocused, setIsFocused] = useState(false);

  const onMouseDownResizer = useMemo(() => startDrag({
    init() {
      return {startWidth: width || 150};
    },
    move({startWidth}) {
      const newHeight = Math.max(startWidth + this.startDeltaX, 100);
      widthUP.$set(newHeight);
    },
    done() {},
    keepCursor: true,
  }), [width, widthUP]);


  return <th
    ref={ref}
    style={{
      ...allHeaderCellStyle,
      width: width || 150,
      padding: 5,
      height: 70,  // TODO: shrinks when header collapsed
      zIndex: 1,
      ...!selected && unselectedCellStyle,
    }}
  >
    <div className="flex justify-between items-center">
      <input
        className="ColumnName dark-gray truncate b br1 ph0 mv1 bg-transparent"
        style={{
          border: 'none',
        }}
        type="text"
        placeholder={column.name}
        value={column.name}
        // TODO: onChange
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={() => {}}
      />
      { !isFocused &&
        <div
          className="pl1 flex items-center"
          style={{
            visibility: isHovered ? 'visible' : 'hidden',
          }}
        >
          <button
            className="pointer bn pl1 pr0 pv1 bg-transparent"
            // onClick={() => {
            //   programUP.transforms.sort
            // });
          >
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none"><path d="M2.08062 5.5L5.91938 5.5C6.75788 5.5 7.22405 4.53007 6.70024 3.8753L4.78087 1.47609C4.38054 0.975679 3.61946 0.97568 3.21913 1.47609L1.29976 3.87531C0.775945 4.53007 1.24212 5.5 2.08062 5.5Z" fill="var(--washed-blue)"></path><path d="M5.91938 6.5H2.08062C1.24212 6.5 0.775946 7.46993 1.29976 8.1247L3.21913 10.5239C3.61946 11.0243 4.38054 11.0243 4.78087 10.5239L6.70024 8.12469C7.22405 7.46993 6.75788 6.5 5.91938 6.5Z" fill="var(--washed-blue)"></path></svg>
          </button>
          <button
            className="blue bn bg-transparent pa0 ml1 pointer"
            onClick={removeColumn}
          >
            <svg width="16" height="16" viewBox="0 0 10 16" stroke="currentColor" strokeWidth="2"><path d="M1 4L9 12M9 4L1 12"></path></svg>
          </button>
        </div>
      }
      { isFocused &&
        <button
          className="bn bg-transparent gray pointer"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 9.5L3 6L6 2.5" stroke="currentColor" strokeWidth="2"></path><path d="M4 6C5.91616 6 7.69217 6 9.49994 6C11.4329 6 13 7.567 13 9.5V9.5C13 11.433 11.433 13 9.5 13H9" stroke="currentColor" strokeWidth="2"></path></svg>
        </button>
      }
    </div>
    {/* TODO: data type & data summary go here */}
    <div style={{marginBottom: '12px'}}>
      <div
        className="mid-gray fw4"
        style={{
          width: 'fit-content',
          height: '15px',
          marginBottom: '8px',
          marginTop: '-2px',
        }}
      >
        <div
          // className="bb b--light-gray pointer"
          style={{
            // TODO: some kinda flex-shrink nonsense?
          }}
        >
          <span
            // role="button"
            className="flex items-center justify-between f6 fw4 mid-gray outline-0"
          >
            <div
              style={{
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {column.type}
            </div>
            {/* TODO: change type? */}
            {/* <span
              className="inline-flex items-center light-gray"
              style={{marginLeft: '10px'}}
            >
              <svg width="8" height="16" viewBox="0 0 8 16" fill="none"><path d="M4.74329 10.1741C4.34605 10.6155 3.65395 10.6155 3.25671 10.1741L1.00207 7.66897C0.4229 7.02544 0.879592 6 1.74536 6L6.25464 6C7.12041 6 7.5771 7.02544 6.99793 7.66897L4.74329 10.1741Z" fill="currentColor"></path></svg>
            </span> */}
          </span>
        </div>
      </div>
    </div>
    <Use hook={useHover} children={([hoverRef, isHovered]) =>
      <div
        ref={hoverRef}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 3,
          cursor: 'col-resize',
          zIndex: 1,
          ...isHovered && {background: 'rgb(239, 239, 239)'},
        }}
        onMouseDown={onMouseDownResizer}
      />
    } />
  </th>;
});

const allBodyCellStyle: CSSProperties = {
  padding: '4px 6px',
  borderTop: 'solid 1px var(--light-silver)',
  borderLeft: 'solid 1px var(--light-silver)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const TableRow = memo((props: {
  i: number,
  rowData: object,
  columns: Column[],
  selectedColumns: Column[],
}) => {
  const { i, rowData, columns, selectedColumns } = props;

  const isFirstRow = i === 0;

  return <tr>
    <td
      style={{
        ...allBodyCellStyle,
        ...isFirstRow && {borderTop: 'none'},
        textAlign: 'center',
        color: 'var(--moon-gray)',
        padding: '0 4px',
        borderLeft: 'none',
      }}
    >
      {i}
    </td>
    {columns.map((column, j) =>
      <TableDataCell
        key={column.name}
        isInFirstRow={isFirstRow}
        cellData={(rowData as any)[column.name]}
        type={column.type}
        selected={selectedColumns.includes(column)}
      />
    )}
    <td
      style={{
        ...allBodyCellStyle,
        ...isFirstRow && {borderTop: 'none'},
        // width: '99%',
      }}
    />
  </tr>
});

const TableDataCell = memo((props: {
  isInFirstRow: boolean,
  cellData: unknown,
  type: ValueType,
  selected: boolean,
}) => {
  const { isInFirstRow, cellData, type, selected } = props;

  const dataTypeStyle: CSSProperties = {
    ...(type === 'integer' || type === 'number') && {
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
    },
    ...(type === 'date') && {
      fontVariantNumeric: 'tabular-nums',
    },
  }

  return <td
    style={{
      ...allBodyCellStyle,
      ...dataTypeStyle,
      ...isInFirstRow && {
        borderTop: 'none',
      },
      ...!selected && unselectedCellStyle,
    }}
  >
    {/* TODO: handle all the different display cases */}
    {/* TODO: undefined / NaN */}
    {
      cellData === null || cellData === undefined
      ? ''
      : type === 'number'
      ? (cellData as number).toFixed(2)  // TODO: precision
      : type === 'date'
      ? isoformat(cellData as Date)
      : `${cellData}`
    }
  </td>
});
