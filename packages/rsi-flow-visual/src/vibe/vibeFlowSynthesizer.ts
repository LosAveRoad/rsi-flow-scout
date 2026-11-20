import {
  validateFlowGraph,
  type FlowConfig,
  type FlowNodeConfig,
  type FlowRouteConfig,
} from 'rsi-flow-react';

interface DetectedPattern {
  key: string;
  regex: RegExp;
}

const PATTERNS: DetectedPattern[] = [
  { key: 'scout', regex: /比赛|竞赛|调研|武大|白名单|自强杯|scout|whu/i },
  { key: 'subflow', regex: /嵌套|子流程|评估|核验|评分|奇数年|subflow|score/i },
  { key: 'reuse', regex: /复用|材料|申报|开源|软件杯|路演|reuse|pack/i },
  { key: 'branch', regex: /分支|分级|条件|梯队|筛选|branch|if|tier/i },
];

export interface VibeSynthesisResult {
  config: FlowConfig;
  summary: string;
  detectedPatterns: string[];
}

export function synthesizeFlowFromPrompt(prompt: string): VibeSynthesisResult {
  const cleanPrompt = prompt.trim();
  const detectedPatterns = PATTERNS.filter((p) => p.regex.test(cleanPrompt)).map((p) => p.key);

  const nodes: FlowNodeConfig[] = [];
  const routes: FlowRouteConfig[] = [];
  let cursor = 'start';

  if (detectedPatterns.includes('scout')) {
    nodes.push({
      id: 'VIBE_WHU_CATALOG',
      type: 'event',
      title: '加载武大2026学科竞赛白名单',
      description: '读取153项官方认定赛事级别与推荐学院信息',
      reference: 'WHU_LOAD_RECOGNITION_LIST',
      params: [{ name: 'seasonWindow', type: 'String' }],
      results: [{ name: 'candidateTracks', type: 'List' }],
    });
    routes.push({ source: cursor, target: 'VIBE_WHU_CATALOG' });
    cursor = 'VIBE_WHU_CATALOG';
  } else {
    nodes.push({
      id: 'VIBE_TASK_ENTRY',
      type: 'event',
      title: '解析任务输入参数',
      description: cleanPrompt ? `Vibe 需求: ${cleanPrompt.slice(0, 28)}` : '标准入口算子',
      reference: 'FLOW_PREPARE_CONTEXT',
      params: [{ name: 'payload', type: 'String' }],
      results: [{ name: 'fitScore', type: 'Integer' }],
    });
    routes.push({ source: cursor, target: 'VIBE_TASK_ENTRY' });
    cursor = 'VIBE_TASK_ENTRY';
  }

  if (detectedPatterns.includes('subflow')) {
    nodes.push({
      id: 'VIBE_SCORE_SUBFLOW',
      type: 'flow',
      title: '嵌套子流程：级别与奇数年窗口核验',
      description: '调用 FLOW_WHU_TRACK_SCORING 计算赛道契合分 fitScore',
      reference: 'FLOW_WHU_TRACK_SCORING',
      results: [
        { name: 'level', type: 'String' },
        { name: 'fitScore', type: 'Integer' },
      ],
    });
    routes.push({ source: cursor, target: 'VIBE_SCORE_SUBFLOW' });
    cursor = 'VIBE_SCORE_SUBFLOW';
  }

  if (detectedPatterns.includes('reuse')) {
    nodes.push({
      id: 'VIBE_ARTIFACT_PACKER',
      type: 'event',
      title: '组装跨赛可复用交付物快照',
      description: '对齐 CCF 开源大赛、中国软件杯与挑战杯材料结构',
      reference: 'REUSE_FREEZE_SNAPSHOT',
      results: [{ name: 'artifactReady', type: 'Boolean' }],
    });
    routes.push({ source: cursor, target: 'VIBE_ARTIFACT_PACKER' });
    cursor = 'VIBE_ARTIFACT_PACKER';
  }

  if (detectedPatterns.includes('branch')) {
    nodes.push({
      id: 'VIBE_TIER_S_ROUTE',
      type: 'event',
      title: '生成 S 档国家级主攻立项方案',
      description: '锁定高契合国家级赛事并输出排期表',
      reference: 'WHU_BUILD_TIER_S_PLAN',
    });
    nodes.push({
      id: 'VIBE_TIER_FALLBACK_ROUTE',
      type: 'event',
      title: '归入省部级练兵与观察池',
      description: '保留春季实战演练与跨周期跟踪清单',
      reference: 'WHU_ARCHIVE_TIER_B_POOL',
    });
    routes.push({ source: cursor, target: 'VIBE_TIER_S_ROUTE', condition: 'fitScore >= 85' });
    routes.push({ source: cursor, target: 'VIBE_TIER_FALLBACK_ROUTE', condition: 'default' });
    routes.push({ source: 'VIBE_TIER_S_ROUTE', target: 'end' });
    routes.push({ source: 'VIBE_TIER_FALLBACK_ROUTE', target: 'end' });
  } else {
    routes.push({ source: cursor, target: 'end' });
  }

  const slug = (detectedPatterns.join('_') || 'CUSTOM').toUpperCase();
  const config: FlowConfig = {
    id: `FLOW_VIBE_${slug}`,
    type: 'flow',
    title: cleanPrompt ? `Vibe: ${cleanPrompt.slice(0, 32)}` : 'Vibe Synthesized Workflow',
    description: `Vibe Coding 自动合成 (${detectedPatterns.join(', ') || 'sequential'})`,
    nodes,
    routes,
  };

  const validation = validateFlowGraph(config);
  if (!validation.valid) {
    throw new Error(`Generated FlowConfig failed validation: ${validation.errors.join('; ')}`);
  }

  return {
    config,
    summary: `已生成 ${nodes.length} 个节点、${routes.length} 条路由（识别模式: ${detectedPatterns.join(', ') || 'sequential'}）`,
    detectedPatterns,
  };
}
