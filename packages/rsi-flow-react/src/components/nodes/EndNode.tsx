import { Handle, Position, NodeProps } from '@xyflow/react';
import { Flag } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { RsiFlowNodeData } from '../../types/flow';

export type RsiNodeType = Node<RsiFlowNodeData, 'rsiEnd'>;

export default function EndNode({ data, selected }: NodeProps<RsiNodeType>) {
  const status = data.runtime?.status ?? 'idle';

  return (
    <div className={`rsi-node rsi-node--end rsi-status--${status} ${selected ? 'rsi-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="rsi-node__handle rsi-node__handle--target" />
      <div className="rsi-node__icon">
        <Flag size={14} />
      </div>
      <div className="rsi-node__body">
        <div className="rsi-node__title">{data.label ?? 'End'}</div>
      </div>
    </div>
  );
}
