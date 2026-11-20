import { type FormEvent, useCallback, useMemo, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import {
  flowConfigToGraph,
  graphToFlowConfig,
  RsiFlowCanvas,
  validateFlowGraph,
  type FlowConfig,
  type FlowNodeConfig,
  type FlowNodeType,
  type RsiFlowEdgeData,
  type RsiFlowNodeData,
  type RsiRuntimeOverlay,
} from 'rsi-flow-react';
import { PRESET_FLOWS } from './presets/flows';
import { synthesizeFlowFromPrompt } from './vibe/vibeFlowSynthesizer';

const VIBE_CHIPS = [
  '调研武大2026白名单国家级比赛并嵌套子流程评分后分支立项',
  '围绕CCF开源大赛与中国软件杯生成多赛材料复用分支流程',
  '核验2027奇数年挑战杯窗口并按契合分筛选目标赛道',
];

function nextNodeTypeForReact(kind: FlowNodeType): string {
  if (kind === 'flow') return 'rsiSubFlow';
  if (kind === 'loop') return 'rsiLoop';
  return 'rsiEvent';
}

export default function App() {
  const initialConfig = PRESET_FLOWS[0].config;
  const initialGraph = flowConfigToGraph(initialConfig);

  const [flowMeta, setFlowMeta] = useState<{ id: string; title: string; description?: string }>({
    id: initialConfig.id,
    title: initialConfig.title ?? initialConfig.id,
    description: initialConfig.description,
  });
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_FLOWS[0].key);
  const [nodes, setNodes] = useState<Node<RsiFlowNodeData>[]>(initialGraph.nodes);
  const [edges, setEdges] = useState<Edge<RsiFlowEdgeData>[]>(initialGraph.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [runtimeState, setRuntimeState] = useState<Record<string, RsiRuntimeOverlay>>({});
  const [simStepIdx, setSimStepIdx] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([
    `已加载预置流程: ${initialConfig.id}`,
  ]);

  const [vibePrompt, setVibePrompt] = useState<string>(VIBE_CHIPS[0]);
  const [jsonModalOpen, setJsonModalOpen] = useState<boolean>(false);
  const [jsonDraft, setJsonDraft] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');

  const currentFlowConfig: FlowConfig = useMemo(() => {
    return graphToFlowConfig(nodes, edges, {
      id: flowMeta.id,
      title: flowMeta.title,
      description: flowMeta.description,
    });
  }, [nodes, edges, flowMeta]);

  const validation = useMemo(() => validateFlowGraph(currentFlowConfig), [currentFlowConfig]);

  const pushLog = useCallback((entry: string) => {
    setLogs((prev) => [entry, ...prev].slice(0, 30));
  }, []);

  const loadConfigIntoCanvas = useCallback((cfg: FlowConfig, sourceNote: string) => {
    const graph = flowConfigToGraph(cfg);
    setFlowMeta({
      id: cfg.id,
      title: cfg.title ?? cfg.id,
      description: cfg.description,
    });
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setRuntimeState({});
    setSimStepIdx(0);
    pushLog(sourceNote);
  }, [pushLog]);

  const handlePresetChange = (key: string) => {
    setSelectedPreset(key);
    const found = PRESET_FLOWS.find((p) => p.key === key);
    if (found) {
      loadConfigIntoCanvas(found.config, `切换预置流程: ${found.config.id}`);
    }
  };

  const handleSynthesize = (e?: FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = synthesizeFlowFromPrompt(vibePrompt);
      setSelectedPreset('CUSTOM');
      loadConfigIntoCanvas(res.config, `Vibe 合成成功: ${res.summary}`);
    } catch (err) {
      pushLog(`Vibe 合成失败: ${(err as Error).message}`);
    }
  };

  const onNodesChange = useCallback((changes: NodeChange<Node<RsiFlowNodeData>>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge<RsiFlowEdgeData>>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge<RsiFlowEdgeData> = {
      id: `route-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      type: 'rsiCondition',
      data: { condition: 'true' },
    };
    setEdges((eds) => addEdge(newEdge, eds));
    pushLog(`新增路由: ${connection.source} -> ${connection.target}`);
  }, [pushLog]);

  const handleAddNode = (kind: FlowNodeType) => {
    const id = `NODE_${kind.toUpperCase()}_${nodes.length + 1}`;
    const config: FlowNodeConfig = {
      id,
      type: kind,
      title: kind === 'flow' ? '新建嵌套子流程' : '新建顺序算子节点',
      reference: kind === 'flow' ? 'FLOW_WHU_TRACK_SCORING' : 'CUSTOM_EVENT_STEP',
    };
    const newNode: Node<RsiFlowNodeData> = {
      id,
      type: nextNodeTypeForReact(kind),
      position: { x: 280 + nodes.length * 40, y: 180 },
      data: {
        kind,
        label: config.title ?? id,
        description: `type=${kind}`,
        config,
      },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    pushLog(`添加节点: ${id} (${kind})`);
  };

  const handleStepSimulate = () => {
    const realNodes = nodes.filter((n) => n.id !== 'start' && n.id !== 'end');
    if (realNodes.length === 0) return;
    const idx = simStepIdx % realNodes.length;
    const target = realNodes[idx];
    const nextOverlay: Record<string, RsiRuntimeOverlay> = {};
    realNodes.forEach((n, i) => {
      if (i < idx) nextOverlay[n.id] = { status: 'success' };
      else if (i === idx) {
        nextOverlay[n.id] = { status: 'running' };
      }
    });
    setRuntimeState(nextOverlay);
    setSimStepIdx((prev) => prev + 1);
    pushLog(`[执行步 #${idx + 1}] 运行节点 ${target.id}`);
  };

  const handleRunFullSimulation = () => {
    const primaryPathIds: string[] = [];
    const visited = new Set<string>();
    let cursor = 'start';
    while (cursor && cursor !== 'end' && !visited.has(cursor)) {
      visited.add(cursor);
      const outEdge = edges.find((e) => e.source === cursor);
      if (!outEdge) break;
      if (outEdge.target !== 'end') {
        primaryPathIds.push(outEdge.target);
      }
      cursor = outEdge.target;
    }

    const nextOverlay: Record<string, RsiRuntimeOverlay> = {};
    primaryPathIds.forEach((id, idx) => {
      nextOverlay[id] = {
        status: 'success',
        note: `Step ${idx + 1}`,
      };
    });
    setRuntimeState(nextOverlay);
    setSimStepIdx(0);
    pushLog(`已完成主路径全量仿真 (${primaryPathIds.length} 个业务节点): ${flowMeta.id}`);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  const updateSelectedNodeConfig = (updater: (cfg: FlowNodeConfig) => FlowNodeConfig, label?: string) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedNode.id) return n;
        const baseCfg: FlowNodeConfig = n.data.config ?? {
          id: n.id,
          type: (n.data.kind as FlowNodeType) ?? 'event',
          title: n.data.label,
        };
        const nextCfg = updater(baseCfg);
        return {
          ...n,
          type: nextNodeTypeForReact(nextCfg.type),
          data: {
            ...n.data,
            kind: nextCfg.type,
            label: label ?? nextCfg.title ?? n.id,
            description: nextCfg.description ?? n.data.description,
            config: nextCfg,
          },
        };
      }),
    );
  };

  const updateSelectedEdge = (patch: Partial<RsiFlowEdgeData>) => {
    if (!selectedEdge) return;
    setEdges((prev) =>
      prev.map((e) => {
        if (e.id !== selectedEdge.id) return e;
        const nextData: RsiFlowEdgeData = {
          condition: patch.condition ?? e.data?.condition ?? 'true',
          ...e.data,
          ...patch,
        };
        return {
          ...e,
          data: nextData,
        };
      }),
    );
  };

  const openJsonModal = () => {
    setJsonDraft(JSON.stringify(currentFlowConfig, null, 2));
    setJsonError('');
    setJsonModalOpen(true);
  };

  const applyJsonDraft = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as FlowConfig;
      const check = validateFlowGraph(parsed);
      if (!check.valid) {
        setJsonError(`结构校验失败: ${check.errors.join('; ')}`);
        return;
      }
      loadConfigIntoCanvas(parsed, `已从 JSON 导入并验证流程: ${parsed.id}`);
      setJsonModalOpen(false);
    } catch (err) {
      setJsonError(`JSON 解析错误: ${(err as Error).message}`);
    }
  };

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-brand">
          <h1>RSI-Flow Visual Studio</h1>
          <span className="studio-tag">{flowMeta.id}</span>
        </div>
        <div className="studio-controls">
          <select
            aria-label="选择预置流程"
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {PRESET_FLOWS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} ({p.tag})
              </option>
            ))}
            <option value="CUSTOM">Vibe 自定义合成</option>
          </select>
          <span
            data-testid="validation-pill"
            className={`studio-pill ${validation.valid ? 'studio-pill--ok' : 'studio-pill--bad'}`}
          >
            {validation.valid
              ? `结构校验通过 ✓ (${currentFlowConfig.nodes.length} 节点 / ${currentFlowConfig.routes.length} 路由)`
              : `校验错误 (${validation.errors.length})`}
          </span>
          <button type="button" className="studio-btn" onClick={openJsonModal}>
            JSON 导入/导出
          </button>
        </div>
      </header>

      <section className="studio-vibebar">
        <form className="studio-vibeform" onSubmit={handleSynthesize}>
          <input
            aria-label="Vibe Coding 自然语言流程描述"
            placeholder="输入自然语言描述，如：调研武大2026白名单比赛并嵌套评分后分支立项..."
            value={vibePrompt}
            onChange={(e) => setVibePrompt(e.target.value)}
          />
          <button type="submit" className="studio-btn studio-btn--primary">
            Vibe 生成流程
          </button>
        </form>
        <div className="studio-chips">
          <span>快捷 Prompt:</span>
          {VIBE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className="studio-chip"
              onClick={() => setVibePrompt(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      <main className="studio-workspace">
        <aside className="studio-sidebar">
          <div className="studio-section">
            <h3>节点面板 (Node Palette)</h3>
            <button type="button" className="studio-btn" onClick={() => handleAddNode('event')}>
              + Event 顺序算子节点
            </button>
            <button type="button" className="studio-btn" onClick={() => handleAddNode('flow')}>
              + SubFlow 嵌套子流程
            </button>
          </div>

          <div className="studio-section">
            <h3>流程执行仿真 (Simulation)</h3>
            <button type="button" className="studio-btn studio-btn--primary" onClick={handleStepSimulate}>
              单步执行高亮
            </button>
            <button type="button" className="studio-btn studio-btn--warn" onClick={handleRunFullSimulation}>
              主路径全量仿真
            </button>
            <button
              type="button"
              className="studio-btn"
              onClick={() => {
                setRuntimeState({});
                setSimStepIdx(0);
                pushLog('已重置仿真运行态');
              }}
            >
              重置运行态
            </button>
          </div>

          <div className="studio-section">
            <h3>编排日志 ({logs.length})</h3>
            <div className="studio-logs">
              {logs.map((line, i) => (
                <div key={`${i}-${line}`}>{line}</div>
              ))}
            </div>
          </div>
        </aside>

        <section className="studio-canvas-wrap">
          <RsiFlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            runtimeState={runtimeState}
            onNodeSelect={(n) => {
              setSelectedNodeId(n ? n.id : null);
              setSelectedEdgeId(null);
            }}
            onEdgeSelect={(edge) => {
              setSelectedEdgeId(edge ? edge.id : null);
              setSelectedNodeId(null);
            }}
          />
        </section>

        <aside className="studio-inspector">
          <div className="studio-section">
            <h3>属性检查器 (Inspector)</h3>
            {selectedNode && selectedNode.id !== 'start' && selectedNode.id !== 'end' ? (
              <>
                <div className="studio-field">
                  <label>节点 ID</label>
                  <input value={selectedNode.id} readOnly />
                </div>
                <div className="studio-field">
                  <label>标题 (title)</label>
                  <input
                    value={selectedNode.data.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateSelectedNodeConfig((cfg) => ({ ...cfg, title: val }), val);
                    }}
                  />
                </div>
                <div className="studio-field">
                  <label>引用算子 / 子流程 (reference)</label>
                  <input
                    value={selectedNode.data.config?.reference ?? ''}
                    onChange={(e) => {
                      const ref = e.target.value;
                      updateSelectedNodeConfig((cfg) => ({ ...cfg, reference: ref }));
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="studio-btn studio-btn--danger"
                  onClick={() => {
                    const delId = selectedNode.id;
                    setNodes((prev) => prev.filter((n) => n.id !== delId));
                    setEdges((prev) => prev.filter((e) => e.source !== delId && e.target !== delId));
                    setSelectedNodeId(null);
                    pushLog(`删除节点: ${delId}`);
                  }}
                >
                  删除该节点
                </button>
              </>
            ) : selectedEdge ? (
              <>
                <div className="studio-field">
                  <label>路由方向</label>
                  <input value={`${selectedEdge.source} -> ${selectedEdge.target}`} readOnly />
                </div>
                <div className="studio-field">
                  <label>JEXL 条件表达式 (condition)</label>
                  <input
                    value={selectedEdge.data?.condition ?? 'true'}
                    onChange={(e) => updateSelectedEdge({ condition: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: '#667085', margin: 0 }}>
                在画布中点击任意算子节点、嵌套子流程或条件路由连线，即可实时编辑属性并导出标准 FlowConfig JSON。
              </p>
            )}
          </div>

          {!validation.valid && (
            <div className="studio-section">
              <h3>静态拓扑校验告警</h3>
              {validation.errors.map((err) => (
                <div key={err} style={{ fontSize: 11, color: '#b42318' }}>
                  • {err}
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>

      {jsonModalOpen && (
        <div className="studio-modal-backdrop">
          <div className="studio-modal">
            <h3>FlowConfig JSON（与 Java rsi-flow 双向兼容）</h3>
            <textarea value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} />
            {jsonError && <div style={{ color: '#b42318', fontSize: 12 }}>{jsonError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="studio-btn" onClick={() => setJsonModalOpen(false)}>
                取消
              </button>
              <button type="button" className="studio-btn studio-btn--primary" onClick={applyJsonDraft}>
                校验并应用 JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
