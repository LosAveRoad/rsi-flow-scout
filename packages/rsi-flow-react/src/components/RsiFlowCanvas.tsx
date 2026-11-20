import { useMemo } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  EdgeMouseHandler,
  MiniMap,
  Node,
  NodeMouseHandler,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles.css';

import type {
  RsiFlowEdgeData,
  RsiFlowNodeData,
  RsiRuntimeOverlay,
} from '../types/flow';
import StartNode from './nodes/StartNode';
import EndNode from './nodes/EndNode';
import EventNode from './nodes/EventNode';
import SubFlowNode from './nodes/SubFlowNode';
import LoopNode from './nodes/LoopNode';
import ConditionEdge from './edges/ConditionEdge';

export const nodeTypes = {
  rsiStart: StartNode,
  rsiEnd: EndNode,
  rsiEvent: EventNode,
  rsiSubFlow: SubFlowNode,
  rsiLoop: LoopNode,
};

export const edgeTypes = {
  rsiCondition: ConditionEdge,
  rsiRoute: ConditionEdge,
};

export interface RsiFlowCanvasProps {
  nodes: Node<RsiFlowNodeData>[];
  edges: Edge<RsiFlowEdgeData>[];
  onNodesChange?: OnNodesChange<Node<RsiFlowNodeData>>;
  onEdgesChange?: OnEdgesChange<Edge<RsiFlowEdgeData>>;
  onConnect?: OnConnect;
  onNodeSelect?: (node: Node<RsiFlowNodeData> | null) => void;
  onEdgeSelect?: (edge: Edge<RsiFlowEdgeData> | null) => void;
  runtimeState?: Record<string, RsiRuntimeOverlay>;
  fitView?: boolean;
  interactive?: boolean;
  showMiniMap?: boolean;
  className?: string;
}

/**
 * Interactive React Flow canvas tailored for rsi-flow DAG and bounded loop definitions.
 */
export function RsiFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onEdgeSelect,
  runtimeState,
  fitView = true,
  interactive = true,
  showMiniMap = true,
  className,
}: RsiFlowCanvasProps) {
  const hydratedNodes = useMemo(() => {
    if (!runtimeState) {
      return nodes;
    }
    return nodes.map((node) => {
      const overlay = runtimeState[node.id];
      if (!overlay) {
        return node;
      }
      return {
        ...node,
        data: {
          ...node.data,
          runtime: {
            ...node.data.runtime,
            ...overlay,
          },
        },
      };
    });
  }, [nodes, runtimeState]);

  const handleNodeClick: NodeMouseHandler<Node<RsiFlowNodeData>> = (_evt, node) => {
    onNodeSelect?.(node);
  };

  const handleEdgeClick: EdgeMouseHandler<Edge<RsiFlowEdgeData>> = (_evt, edge) => {
    onEdgeSelect?.(edge);
  };

  const handlePaneClick = () => {
    onNodeSelect?.(null);
    onEdgeSelect?.(null);
  };

  return (
    <div
      className={className ? `rsi-canvas ${className}` : 'rsi-canvas'}
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={hydratedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          nodesDraggable={interactive}
          nodesConnectable={interactive}
          elementsSelectable={interactive}
          fitView={fitView}
          deleteKeyCode={interactive ? ['Backspace', 'Delete'] : null}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#d0d5dd" />
          <Controls />
          {showMiniMap && <MiniMap pannable zoomable />}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default RsiFlowCanvas;
