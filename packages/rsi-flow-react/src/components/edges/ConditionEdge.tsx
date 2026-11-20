import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  Position,
} from '@xyflow/react';
import { RotateCcw } from 'lucide-react';
import type { Edge } from '@xyflow/react';
import type { RsiFlowEdgeData } from '../../types/flow';

export type RsiEdgeType = Edge<RsiFlowEdgeData>;

export default function ConditionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<RsiEdgeType>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePosition ?? Position.Right,
    targetX,
    targetY,
    targetPosition: targetPosition ?? Position.Left,
  });

  const loopBack = Boolean(data?.loopBack);
  const condition = data?.condition ?? 'true';
  const max = data?.maxIterations !== undefined ? ` max:${data.maxIterations}` : '';
  const active = Boolean(data?.active);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: active ? '#10b981' : loopBack ? '#d97706' : '#64748b',
          strokeWidth: active ? 3 : 2,
          strokeDasharray: loopBack ? '6 4' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="rsi-edge__label rsi-edge__label--condition"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {loopBack ? (
            <span className="rsi-edge__badge rsi-edge__badge--loopback">
              <RotateCcw size={11} />
              {condition}
              {max}
            </span>
          ) : (
            <span className="rsi-edge__badge">{condition}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
