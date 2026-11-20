import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { RsiFlowNodeData } from '../../types/flow';

export type RsiNodeType = Node<RsiFlowNodeData, 'rsiStart'>;

export default function StartNode({ data, selected }: NodeProps<RsiNodeType>) {
  const status = data.runtime?.status ?? 'idle';

  return (
    <div className={`rsi-node rsi-node--start rsi-status--${status} ${selected ? 'rsi-node--selected' : ''}`}>
      <div className="rsi-node__icon">
        <Play size={14} />
      </div>
      <div className="rsi-node__body">
        <div className="rsi-node__title">{data.label ?? 'Start'}</div>
      </div>
      <Handle type="source" position={Position.Right} className="rsi-node__handle rsi-node__handle--source" />
    </div>
  );
}
