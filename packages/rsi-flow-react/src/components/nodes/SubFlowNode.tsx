import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { RsiFlowNodeData } from '../../types/flow';

export type RsiNodeType = Node<RsiFlowNodeData, 'rsiSubFlow'>;

export default function SubFlowNode({ data, selected }: NodeProps<RsiNodeType>) {
  const status = data.runtime?.status ?? 'idle';
  const reference = data.config?.reference;

  return (
    <div className={`rsi-node rsi-node--subflow rsi-status--${status} ${selected ? 'rsi-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="rsi-node__handle rsi-node__handle--target" />
      <div className="rsi-node__icon">
        <GitBranch size={14} />
      </div>
      <div className="rsi-node__body">
        <div className="rsi-node__title">
          {data.label ?? 'SubFlow'}
          <span className="rsi-node__badge">FLOW</span>
        </div>
        {reference ? <div className="rsi-node__meta">{reference}</div> : null}
        {data.runtime?.note ? <div className="rsi-node__desc">{data.runtime.note}</div> : null}
      </div>
      <Handle type="source" position={Position.Right} className="rsi-node__handle rsi-node__handle--source" />
    </div>
  );
}
