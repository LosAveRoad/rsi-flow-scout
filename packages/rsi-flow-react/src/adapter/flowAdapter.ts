import type { Edge, Node } from '@xyflow/react';
import type {
  FlowConfig,
  FlowNodeConfig,
  FlowRouteConfig,
  RsiFlowEdgeData,
  RsiFlowNodeData,
  RsiRuntimeOverlay,
} from '../types/flow';

const START_ID = 'start';
const END_ID = 'end';

const NODE_TYPE_TO_COMPONENT: Record<FlowNodeConfig['type'], string> = {
  event: 'rsiEvent',
  flow: 'rsiSubFlow',
  http: 'rsiEvent',
  loop: 'rsiLoop',
};

const COMPONENT_KIND_TO_NODE_TYPE: Record<string, FlowNodeConfig['type']> = {
  rsiEvent: 'event',
  rsiSubFlow: 'flow',
  rsiLoop: 'loop',
};

const SYNTHETIC_IDS = new Set<string>([START_ID, END_ID]);

export function flowConfigToGraph(
  config: FlowConfig,
  runtimeState?: Record<string, RsiRuntimeOverlay>,
): { nodes: Node<RsiFlowNodeData>[]; edges: Edge<RsiFlowEdgeData>[] } {
  const runtime = runtimeState ?? {};
  const nodesById = new Map(config.nodes.map((n) => [n.id, n]));

  const startNode: Node<RsiFlowNodeData> = {
    id: START_ID,
    type: 'rsiStart',
    position: { x: 0, y: 60 },
    data: { kind: 'start', label: config.title ?? config.name ?? 'Start', runtime: runtime[START_ID] },
  };
  const endNode: Node<RsiFlowNodeData> = {
    id: END_ID,
    type: 'rsiEnd',
    position: { x: 0, y: 60 },
    data: { kind: 'end', label: 'End', runtime: runtime[END_ID] },
  };

  const flowNodes: Node<RsiFlowNodeData>[] = config.nodes.map((n) => ({
    id: n.id,
    type: NODE_TYPE_TO_COMPONENT[n.type] ?? 'rsiEvent',
    position: { x: typeof n.x === 'number' ? n.x : 0, y: typeof n.y === 'number' ? n.y : 0 },
    data: {
      kind: n.type,
      label: n.title ?? n.name ?? n.id,
      description: n.description,
      config: n,
      runtime: runtime[n.id],
    },
  }));

  const edges: Edge<RsiFlowEdgeData>[] = config.routes.map((r, index) => ({
    id: `route-${r.source}-${r.target}-${index}`,
    source: r.source,
    target: r.target,
    type: 'rsiCondition',
    animated: Boolean(r.loopBack),
    data: {
      condition: r.condition ?? 'true',
      scope: r.scope,
      loopBack: r.loopBack,
      maxIterations: r.maxIterations,
      active: false,
    },
  }));

  const nonLoopBackAdj = new Map<string, string[]>();
  for (const r of config.routes) {
    if (r.loopBack === true) continue;
    if (!nodesById.has(r.source) || !nodesById.has(r.target)) continue;
    const list = nonLoopBackAdj.get(r.source) ?? [];
    list.push(r.target);
    nonLoopBackAdj.set(r.source, list);
  }

  // Strip only true DFS back-edges so forward edges still compute increasing DAG layers.
  const backEdges = new Set<string>();
  const color = new Map<string, 0 | 1 | 2>();
  const markBackEdges = (u: string) => {
    color.set(u, 1);
    for (const v of nonLoopBackAdj.get(u) ?? []) {
      const c = color.get(v) ?? 0;
      if (c === 1) {
        backEdges.add(`${u}>${v}`);
      } else if (c === 0) {
        markBackEdges(v);
      }
    }
    color.set(u, 2);
  };
  const startTargets = config.routes.filter((r) => r.source === START_ID).map((r) => r.target);
  for (const id of [...startTargets, ...nodesById.keys()]) {
    if (nodesById.has(id) && (color.get(id) ?? 0) === 0) {
      markBackEdges(id);
    }
  }

  const layoutEdges: Array<{ u: string; v: string }> = [];
  for (const r of config.routes) {
    if (r.loopBack === true) continue;
    if (backEdges.has(`${r.source}>${r.target}`)) continue;
    if (!nodesById.has(r.source) || !nodesById.has(r.target)) continue;
    layoutEdges.push({ u: r.source, v: r.target });
  }

  const layer = new Map<string, number>([...nodesById.keys()].map((id) => [id, 0]));
  let changed = true;
  let guard = 0;
  const upperBound = nodesById.size * Math.max(1, layoutEdges.length);
  while (changed && guard <= upperBound) {
    changed = false;
    guard++;
    for (const { u, v } of layoutEdges) {
      const lu = layer.get(u) ?? 0;
      const lv = layer.get(v) ?? 0;
      if (lu + 1 > lv) {
        layer.set(v, lu + 1);
        changed = true;
      }
    }
  }

  const byLayer = new Map<number, string[]>();
  for (const [id, l] of layer) {
    const arr = byLayer.get(l) ?? [];
    arr.push(id);
    byLayer.set(l, arr);
  }

  for (const [l, ids] of [...byLayer.entries()].sort((a, b) => a[0] - b[0])) {
    ids.forEach((id, row) => {
      const node = flowNodes.find((n) => n.id === id);
      if (node && typeof node.data.config?.x !== 'number') {
        node.position = { x: (l + 1) * 280, y: row * 150 + 60 };
      }
    });
  }

  const endSources = config.routes.filter((r) => r.target === END_ID).map((r) => r.source);
  const deepest = endSources.length
    ? Math.max(0, ...endSources.map((id) => layer.get(id) ?? 0))
    : Math.max(0, ...layer.values());
  endNode.position = { x: (deepest + 2) * 280, y: 60 };

  return { nodes: [startNode, ...flowNodes, endNode], edges };
}

export function graphToFlowConfig(
  nodes: Node<RsiFlowNodeData>[],
  edges: Edge<RsiFlowEdgeData>[],
  baseMeta: Omit<FlowConfig, 'nodes' | 'routes'>,
): FlowConfig {
  const configNodes: FlowNodeConfig[] = nodes
    .filter((n) => !SYNTHETIC_IDS.has(n.id) && n.data?.config)
    .map((n) => {
      const data = n.data as RsiFlowNodeData;
      const config: FlowNodeConfig = {
        ...data.config!,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
      };
      const mapped = n.type ? COMPONENT_KIND_TO_NODE_TYPE[n.type] : undefined;
      if (config.type !== 'http' && mapped) {
        config.type = mapped;
      }
      return config;
    });

  const validIds = new Set(configNodes.map((n) => n.id));

  const routes: FlowRouteConfig[] = edges
    .filter((e) => validIds.has(e.source) || SYNTHETIC_IDS.has(e.source))
    .filter((e) => validIds.has(e.target) || SYNTHETIC_IDS.has(e.target))
    .map((e) => {
      const data = (e.data ?? {}) as Partial<RsiFlowEdgeData>;
      const route: FlowRouteConfig = { source: e.source, target: e.target };
      if (data.condition && data.condition.trim() !== '') route.condition = data.condition;
      if (data.scope) route.scope = data.scope;
      if (data.loopBack) route.loopBack = true;
      if (typeof data.maxIterations === 'number' && data.maxIterations > 0) {
        route.maxIterations = data.maxIterations;
      }
      return route;
    });

  return { type: 'flow', ...baseMeta, nodes: configNodes, routes };
}

export function validateFlowGraph(config: FlowConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.id || config.id.trim() === '') {
    errors.push('Flow id must not be empty.');
  }
  if (!config.nodes || config.nodes.length === 0) {
    errors.push('Flow must declare at least one node.');
  }
  if (!config.routes || config.routes.length === 0) {
    errors.push('Flow must declare at least one route.');
  }

  const seen = new Set<string>();
  for (const node of config.nodes) {
    if (!node.id || node.id.trim() === '') {
      errors.push('Every node must have an id.');
      continue;
    }
    if (seen.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
    }
    seen.add(node.id);

    if (!SYNTHETIC_IDS.has(node.id) && node.type !== 'http' && !node.reference) {
      errors.push(`Node "${node.id}" (${node.type}) is missing a reference.`);
    }
    if (node.type === 'loop' && !node.loop) {
      errors.push(`Loop node "${node.id}" is missing its loop config.`);
    }
    if (node.type === 'loop' && node.loop) {
      const collectionExpr = node.loop.collectionVar ?? node.loop.collection;
      if ((node.loop.mode === 'WHILE' || node.loop.mode === 'DO_WHILE') && !node.loop.condition) {
        errors.push(`Loop node "${node.id}" uses ${node.loop.mode} without a condition.`);
      }
      if (node.loop.mode === 'FOR_COUNT' && (!node.loop.count || node.loop.count <= 0)) {
        errors.push(`Loop node "${node.id}" uses FOR_COUNT with an invalid count.`);
      }
      if (node.loop.mode === 'FOR_EACH' && !collectionExpr) {
        errors.push(`Loop node "${node.id}" uses FOR_EACH without a collectionVar.`);
      }
      if (typeof node.loop.maxIterations === 'number' && node.loop.maxIterations <= 0) {
        errors.push(`Loop node "${node.id}" has maxIterations <= 0.`);
      }
    }
  }

  const nodeIds = new Set(config.nodes.map((n) => n.id));
  for (const [i, route] of (config.routes ?? []).entries()) {
    if (!route.source || !route.target) {
      errors.push(`Route #${i} must define source and target.`);
      continue;
    }
    for (const endpoint of [route.source, route.target]) {
      if (!SYNTHETIC_IDS.has(endpoint) && !nodeIds.has(endpoint)) {
        errors.push(`Route #${i} references unknown endpoint "${endpoint}".`);
      }
    }
    if (typeof route.maxIterations === 'number' && route.maxIterations <= 0) {
      errors.push(`Route #${i} (${route.source} -> ${route.target}) has maxIterations <= 0.`);
    }
    if (route.loopBack && typeof route.maxIterations !== 'number') {
      warnings.push(`Loop-back route "${route.source}" -> "${route.target}" has no maxIterations cap.`);
    }
  }

  const adjacency = new Map<string, Array<{ to: string; loopBack?: boolean; cap?: number }>>();
  for (const r of config.routes) {
    const list = adjacency.get(r.source) ?? [];
    list.push({ to: r.target, loopBack: r.loopBack, cap: r.maxIterations });
    adjacency.set(r.source, list);
  }
  const color = new Map<string, number>(config.nodes.map((n) => [n.id, 0]));
  const path: string[] = [];

  const dfs = (u: string): void => {
    color.set(u, 1);
    path.push(u);
    for (const edge of adjacency.get(u) ?? []) {
      const v = edge.to;
      if (!color.has(v)) continue;
      const state = color.get(v) ?? 0;
      if (state === 0) {
        dfs(v);
      } else if (state === 1) {
        const from = path.indexOf(v);
        if (from >= 0) {
          const cyclePath = path.slice(from);
          const cycleEdges: Array<{ loopBack?: boolean; cap?: number }> = [];
          for (let i = 0; i < cyclePath.length; i++) {
            const from2 = cyclePath[i];
            const to = cyclePath[(i + 1) % cyclePath.length];
            const match = (adjacency.get(from2) ?? []).filter((e) => e.to === to);
            cycleEdges.push(...match);
          }
          const hasLoopBackEdge = cycleEdges.some((e) => e.loopBack === true);
          const hasCappedEdge = cycleEdges.some((e) => typeof e.cap === 'number' && e.cap > 0);
          if (!hasLoopBackEdge && !hasCappedEdge) {
            errors.push(
              `Cycle ${cyclePath.join(' -> ')} -> ${cyclePath[0]} has neither a loopBack edge nor a maxIterations > 0 cap.`,
            );
          } else if (!hasLoopBackEdge) {
            warnings.push(
              `Cycle ${cyclePath.join(' -> ')} -> ${cyclePath[0]} is capped by maxIterations but has no explicit loopBack edge.`,
            );
          }
        }
      }
    }
    path.pop();
    color.set(u, 2);
  };

  for (const node of config.nodes) {
    if ((color.get(node.id) ?? 0) === 0) dfs(node.id);
  }

  return { valid: errors.length === 0, errors, warnings };
}
