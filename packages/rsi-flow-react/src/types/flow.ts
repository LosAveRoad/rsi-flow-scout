/**
 * RSI Flow domain types mirroring Java `cc.eamon.open.flow.config.*` JSON schema.
 */

export type FlowNodeType = 'event' | 'flow' | 'http' | 'loop';

export interface FlowParamConfig {
  name: string;
  title?: string;
  description?: string;
  type: string;
  scope?: string;
  notnull?: boolean;
  defaultValue?: unknown;
  value?: string;
}

export interface FlowResultConfig {
  name: string;
  title?: string;
  description?: string;
  type: string;
  scope?: string;
  parse?: string;
  notnull?: boolean;
  defaultValue?: unknown;
  value?: string;
}

export type FlowLoopMode = 'WHILE' | 'DO_WHILE' | 'FOR_COUNT' | 'FOR_EACH';

export interface FlowLoopConfig {
  mode: FlowLoopMode;
  condition?: string;
  breakCondition?: string;
  maxIterations?: number;
  count?: number;
  collectionVar?: string;
  collection?: string;
  itemVar?: string;
  indexVar?: string;
}

export interface FlowScheduleConfig {
  taskName?: string;
  time?: string;
  cron?: string;
  async?: boolean;
  distributed?: boolean;
  special?: boolean;
}

export interface FlowNodeConfig {
  id: string;
  type: FlowNodeType;
  name?: string;
  title?: string;
  description?: string;
  async?: boolean;
  method?: string;
  url?: string;
  reference?: string;
  params?: FlowParamConfig[];
  results?: FlowResultConfig[];
  loop?: FlowLoopConfig;
  schedule?: FlowScheduleConfig;
  x?: number;
  y?: number;
}

export interface FlowRouteConfig {
  source: string;
  target: string;
  condition?: string;
  scope?: string;
  loopBack?: boolean;
  maxIterations?: number;
}

export interface FlowRouteStrategyConfig {
  source?: string;
  target?: string;
  strategy: string;
}

export interface FlowConfig {
  id: string;
  name?: string;
  type?: 'flow';
  title?: string;
  description?: string;
  params?: FlowParamConfig[];
  results?: FlowResultConfig[];
  nodes: FlowNodeConfig[];
  routes: FlowRouteConfig[];
  strategies?: FlowRouteStrategyConfig[];
}

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'mutated';

export interface RsiRuntimeOverlay {
  status?: NodeExecutionStatus;
  iteration?: number;
  maxIterations?: number;
  note?: string;
}

export interface RsiFlowNodeData extends Record<string, unknown> {
  kind: 'start' | 'end' | FlowNodeType;
  label: string;
  description?: string;
  config?: FlowNodeConfig;
  runtime?: RsiRuntimeOverlay;
}

export interface RsiFlowEdgeData extends Record<string, unknown> {
  condition: string;
  scope?: string;
  loopBack?: boolean;
  maxIterations?: number;
  active?: boolean;
}
