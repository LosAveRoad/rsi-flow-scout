import type { FlowConfig } from 'rsi-flow-react';

export interface PresetFlowEntry {
  key: string;
  label: string;
  tag: string;
  config: FlowConfig;
}

export const FLOW_WHU_COMPETITION_SCOUT_PRESET: FlowConfig = {
  id: 'FLOW_WHU_COMPETITION_SCOUT',
  type: 'flow',
  title: '武汉大学 2026-2027 学科竞赛智能调研与分级流程',
  description:
    '基于武大本科生学科竞赛认定信息表（153项）：白名单加载 → 赛道初筛 → 嵌套子流程评分 → S/A/B 三档条件分支立项',
  params: [
    { name: 'seasonWindow', type: 'String' },
    { name: 'teamTrack', type: 'String' },
  ],
  results: [
    { name: 'tierDecision', type: 'String' },
    { name: 'fitScore', type: 'Integer' },
  ],
  nodes: [
    {
      id: 'SCOUT_LOAD_WHU_LIST',
      type: 'event',
      title: '加载武大2026认定白名单',
      description: '解析武大153项认定赛事级别、推荐学院与奇偶年备注',
      reference: 'WHU_LOAD_RECOGNITION_LIST',
      params: [{ name: 'seasonWindow', type: 'String' }],
      results: [{ name: 'rawCatalog', type: 'List' }],
    },
    {
      id: 'SCOUT_FILTER_CS_AI',
      type: 'event',
      title: '筛选计算机与AI相关赛道',
      description: '锁定计院/网安/AI院/遥感/工创/团委推荐的高契合赛事',
      reference: 'WHU_FILTER_DOMAIN_TRACKS',
      params: [
        { name: 'rawCatalog', type: 'List' },
        { name: 'teamTrack', type: 'String' },
      ],
      results: [{ name: 'candidateTracks', type: 'List' }],
    },
    {
      id: 'SCOUT_EVAL_SUBFLOW',
      type: 'flow',
      title: '嵌套子流程：级别与契合度评估',
      description: '核验国家级/省部级认定、2027奇数年窗口并计算 fitScore',
      reference: 'FLOW_WHU_TRACK_SCORING',
      params: [{ name: 'candidateTracks', type: 'List' }],
      results: [
        { name: 'level', type: 'String' },
        { name: 'fitScore', type: 'Integer' },
      ],
    },
    {
      id: 'SCOUT_TIER_S_MAIN',
      type: 'event',
      title: '生成 S 档国家级主攻方案',
      description: '#102 CCF开源 / #113 软件杯 / #107 C4 / #104 软件创新 / #106 4C',
      reference: 'WHU_BUILD_TIER_S_PLAN',
      results: [{ name: 'tierDecision', type: 'String' }],
    },
    {
      id: 'SCOUT_TIER_A_EXPAND',
      type: 'event',
      title: '生成 A 档综合科创冲刺方案',
      description: '#148 挑战杯(自强杯·奇数年) / #147 国创 / #127 全球校园AI / #108 华为ICT',
      reference: 'WHU_BUILD_TIER_A_PLAN',
      results: [{ name: 'tierDecision', type: 'String' }],
    },
    {
      id: 'SCOUT_TIER_B_PRACTICE',
      type: 'event',
      title: '归入 B 档省部级实战练兵池',
      description: '#109 服务外包(武大省部级) / #126 全国大学生AI安全竞赛',
      reference: 'WHU_ARCHIVE_TIER_B_POOL',
      results: [{ name: 'tierDecision', type: 'String' }],
    },
  ],
  routes: [
    { source: 'start', target: 'SCOUT_LOAD_WHU_LIST' },
    { source: 'SCOUT_LOAD_WHU_LIST', target: 'SCOUT_FILTER_CS_AI' },
    { source: 'SCOUT_FILTER_CS_AI', target: 'SCOUT_EVAL_SUBFLOW' },
    {
      source: 'SCOUT_EVAL_SUBFLOW',
      target: 'SCOUT_TIER_S_MAIN',
      condition: "fitScore >= 90 && level == 'NATIONAL'",
    },
    {
      source: 'SCOUT_EVAL_SUBFLOW',
      target: 'SCOUT_TIER_A_EXPAND',
      condition: 'fitScore >= 80',
    },
    {
      source: 'SCOUT_EVAL_SUBFLOW',
      target: 'SCOUT_TIER_B_PRACTICE',
      condition: 'default',
    },
    { source: 'SCOUT_TIER_S_MAIN', target: 'end' },
    { source: 'SCOUT_TIER_A_EXPAND', target: 'end' },
    { source: 'SCOUT_TIER_B_PRACTICE', target: 'end' },
  ],
};

export const FLOW_WHU_TRACK_SCORING_PRESET: FlowConfig = {
  id: 'FLOW_WHU_TRACK_SCORING',
  type: 'flow',
  title: '武大竞赛级别核验与技术契合度评分（嵌套子流程）',
  description:
    '由主流程 SCOUT_EVAL_SUBFLOW 调用：核验官方认定级别 → 校验2027奇数年办赛窗口 → 计算底座复用契合分',
  params: [{ name: 'candidateTracks', type: 'List' }],
  results: [
    { name: 'level', type: 'String' },
    { name: 'fitScore', type: 'Integer' },
  ],
  nodes: [
    {
      id: 'CHECK_WHU_LEVEL',
      type: 'event',
      title: '核验武大官方认定级别',
      description: '区分国家级与省部级（如识别 #109 服务外包在武大为省部级）',
      reference: 'SCORE_VERIFY_WHU_LEVEL',
      results: [{ name: 'level', type: 'String' }],
    },
    {
      id: 'CHECK_ODD_YEAR_2027',
      type: 'event',
      title: '校验2027奇数年办赛窗口',
      description: '匹配奇数年 #148 大挑（自强杯），过滤偶数年停办国赛项',
      reference: 'SCORE_VERIFY_YEAR_WINDOW',
      results: [{ name: 'yearValid', type: 'Boolean' }],
    },
    {
      id: 'CALC_RSI_FIT_SCORE',
      type: 'event',
      title: '计算 Vibe Coding 与编排契合分',
      description: '结合开源仓库、软件系统演示与可视化交互维度综合打分',
      reference: 'SCORE_COMPUTE_ALIGNMENT',
      results: [{ name: 'fitScore', type: 'Integer' }],
    },
    {
      id: 'MARK_DEFERRED',
      type: 'event',
      title: '标记跨年顺延赛事',
      description: '偶数年赛事归档至下一周期观察表',
      reference: 'SCORE_MARK_NEXT_CYCLE',
      results: [{ name: 'fitScore', type: 'Integer' }],
    },
  ],
  routes: [
    { source: 'start', target: 'CHECK_WHU_LEVEL' },
    { source: 'CHECK_WHU_LEVEL', target: 'CHECK_ODD_YEAR_2027' },
    {
      source: 'CHECK_ODD_YEAR_2027',
      target: 'CALC_RSI_FIT_SCORE',
      condition: 'yearValid == true',
    },
    {
      source: 'CHECK_ODD_YEAR_2027',
      target: 'MARK_DEFERRED',
      condition: 'default',
    },
    { source: 'CALC_RSI_FIT_SCORE', target: 'end' },
    { source: 'MARK_DEFERRED', target: 'end' },
  ],
};

export const FLOW_COMPETITION_REUSE_PIPELINE_PRESET: FlowConfig = {
  id: 'FLOW_COMPETITION_REUSE_PIPELINE',
  type: 'flow',
  title: '一套底座多赛交付物生成流水线',
  description:
    '围绕同一套 RSI-Flow 可视化与编排工程底座，按目标赛事交付形态条件路由生成参赛材料包',
  params: [{ name: 'trackForm', type: 'String' }],
  results: [{ name: 'artifactBundle', type: 'String' }],
  nodes: [
    {
      id: 'FREEZE_CORE_ARTIFACT',
      type: 'event',
      title: '冻结核心代码与标准流程包',
      description: '打包 rsi-flow-react + rsi-flow-visual 与 JSON 工作流快照',
      reference: 'REUSE_FREEZE_SNAPSHOT',
    },
    {
      id: 'DETECT_SUBMISSION_TYPE',
      type: 'event',
      title: '识别目标赛事交付物规范',
      description: '解析开源共建类 / 企业命题软件类 / 综合科创路演类要求',
      reference: 'REUSE_DETECT_FORMAT',
    },
    {
      id: 'PACK_CCF_OPENSOURCE',
      type: 'event',
      title: '生成 CCF 开源大赛交付包',
      description: '整理开源仓库 README、架构文档、CI 与 Issue 路线图',
      reference: 'REUSE_BUILD_CCF_PACK',
    },
    {
      id: 'PACK_SOFTCUP_C4',
      type: 'event',
      title: '生成软件杯与 C4 系统演示包',
      description: '封装在线可视化编排 Demo、设计文档与 3 分钟演示脚本',
      reference: 'REUSE_BUILD_DEMO_PACK',
    },
    {
      id: 'PACK_CHALLENGE_PROPOSAL',
      type: 'event',
      title: '生成自强杯与国创申报材料包',
      description: '输出科技发明申报书、查新要点与商业化路演大纲',
      reference: 'REUSE_BUILD_PROPOSAL_PACK',
    },
  ],
  routes: [
    { source: 'start', target: 'FREEZE_CORE_ARTIFACT' },
    { source: 'FREEZE_CORE_ARTIFACT', target: 'DETECT_SUBMISSION_TYPE' },
    {
      source: 'DETECT_SUBMISSION_TYPE',
      target: 'PACK_CCF_OPENSOURCE',
      condition: "trackForm == 'OPEN_SOURCE'",
    },
    {
      source: 'DETECT_SUBMISSION_TYPE',
      target: 'PACK_SOFTCUP_C4',
      condition: "trackForm == 'SYSTEM_DEMO'",
    },
    {
      source: 'DETECT_SUBMISSION_TYPE',
      target: 'PACK_CHALLENGE_PROPOSAL',
      condition: 'default',
    },
    { source: 'PACK_CCF_OPENSOURCE', target: 'end' },
    { source: 'PACK_SOFTCUP_C4', target: 'end' },
    { source: 'PACK_CHALLENGE_PROPOSAL', target: 'end' },
  ],
};

export const PRESET_FLOWS: PresetFlowEntry[] = [
  {
    key: 'FLOW_WHU_COMPETITION_SCOUT',
    label: '主流程: 武大赛事智能调研与分级',
    tag: 'First Flow',
    config: FLOW_WHU_COMPETITION_SCOUT_PRESET,
  },
  {
    key: 'FLOW_WHU_TRACK_SCORING',
    label: '子流程: 白名单级别与奇偶年核验',
    tag: 'Sub-Flow',
    config: FLOW_WHU_TRACK_SCORING_PRESET,
  },
  {
    key: 'FLOW_COMPETITION_REUSE_PIPELINE',
    label: '扩展流程: 一套底座多赛材料复用',
    tag: 'Pipeline',
    config: FLOW_COMPETITION_REUSE_PIPELINE_PRESET,
  },
];
