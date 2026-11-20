# rsi-flow-react

Interactive `@xyflow/react` v12 canvas, bidirectional `FlowConfig` adapter, and structural validator for `rsi-flow` workflow graphs (sequential, conditional branch, nested sub-flow, and bounded loop nodes).

## Install

```bash
npm install rsi-flow-react @xyflow/react lucide-react react react-dom
```

## Usage

```tsx
import {
  RsiFlowCanvas,
  flowConfigToGraph,
  graphToFlowConfig,
  validateFlowGraph,
  type FlowConfig,
  type RsiRuntimeOverlay,
} from 'rsi-flow-react';
import 'rsi-flow-react/style.css';

const graph = flowConfigToGraph(flowConfig);
const validation = validateFlowGraph(flowConfig); // { valid, errors, warnings }

export function FlowViewer({ runtimeState }: { runtimeState?: Record<string, RsiRuntimeOverlay> }) {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <RsiFlowCanvas
        nodes={graph.nodes}
        edges={graph.edges}
        runtimeState={runtimeState}
        onNodeSelect={(node) => console.log('selected node:', node?.id)}
        onEdgeSelect={(edge) => console.log('selected edge:', edge?.id)}
      />
    </div>
  );
}
```

## Serialize Back to `rsi-flow` JSON

```ts
const nextConfig: FlowConfig = graphToFlowConfig(graph.nodes, graph.edges, {
  id: 'FLOW_WHU_COMPETITION_SCOUT',
  title: 'WHU 2026-2027 Competition Scout',
});
```

## Validate Structure

```ts
const check = validateFlowGraph(nextConfig);
if (!check.valid) {
  console.error('Validation errors:', check.errors);
}
```
