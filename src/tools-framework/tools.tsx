import { ReactElement } from "react";
import { Setter, Updater } from "../util/state";

export type ToolValue = {
  toolValue: unknown
};

export interface ToolConfig {
  toolName: string;
}

export interface ToolViewProps {
  autoFocus?: boolean
}

export type ToolView = (props: ToolViewProps) => ReactElement<any, any> | null;

export interface ToolProps<C extends ToolConfig> {
  context: { [key: string]: ToolValue };
  config: C;
  updateConfig: Updater<C>;
  reportOutput: Setter<ToolValue | null>;
  reportView: Setter<ToolView | null>;
}

export interface Tool<C extends ToolConfig> {
  (props: ToolProps<C>): ReactElement<any, any> | null;
  defaultConfig: C;
}

export let toolIndex: { [toolName: string]: Tool<any> } = {};

export function registerTool<C extends ToolConfig>(
  func: (props: ToolProps<C>) => ReactElement<any, any> | null,
  defaultConfig: C
) {
  toolIndex[defaultConfig.toolName] = Object.assign(func, { defaultConfig });
}
