import { Handle, Position, NodeProps } from '@xyflow/react';
import { Repeat } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { RsiFlowNodeData } from '../../types/flow';

export type RsiNodeType = Node<RsiFlowNodeData, 'rsiLoop'>;

export default function LoopNode({ data, selected }: NodeProps<RsiNodeType>) {
  const status = data.runtime?.status ?? 'idle';
  const loop = data.config?.loop;
  const reference = data.config?.reference;
  const mode = (loop?.mode ?? 'WHILE').toUpperCase();
  const collectionExpr = loop?.collectionVar ?? loop?.collection;

  return (
    <div className={`rsi-node rsi-node--loop rsi-status--${status} ${selected ? 'rsi-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="rsi-node__handle rsi-node__handle--target" />
      <div className="rsi-node__icon">
        <Repeat size={14} />
      </div>
      <div className="rsi-node__body">
        <div className="rsi-node__title">
          {data.label ?? 'Loop'}
          <span className="rsi-node__badge">{mode}</span>
        </div>
        {reference ? <div className="rsi-node__meta">target: {reference}</div> : null}
        {(mode === 'WHILE' || mode === 'DO_WHILE') && loop?.condition ? (
          <div className="rsi-node__meta">cond: {loop.condition}</div>
        ) : null}
        {mode === 'FOR_COUNT' && loop?.count !== undefined ? (
          <div className="rsi-node__meta">count: {loop.count}</div>
        ) : null}
        {mode === 'FOR_EACH' && collectionExpr ? (
          <div className="rsi-node__meta">collection: {collectionExpr}</div>
        ) : null}
        {loop?.maxIterations !== undefined ? (
          <div className="rsi-node__meta">max: {loop.maxIterations}</div>
        ) : null}
        {data.runtime?.note ? <div className="rsi-node__desc">{data.runtime.note}</div> : null}
      </div>
      {data.runtime?.iteration !== undefined ? (
        <div className="rsi-node__live rsi-node__live--iteration">
          iter: {data.runtime.iteration}
          {data.runtime.maxIterations ? `/${data.runtime.maxIterations}` : ''}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="rsi-node__handle rsi-node__handle--source" />
    </div>
  );
}
