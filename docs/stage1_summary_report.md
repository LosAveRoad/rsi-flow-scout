# 阶段一工作总结报告：Vibe Coding 可视化工作室与武大 2026–2027 竞赛调研

> **交付范围**：阶段一（Week 1 · 比赛路线）工程构建、首个示范工作流设计、武汉大学 2026 官方白名单赛事调研与自动化测试验证汇总。

---

## 一、阶段目标与总体成果

本阶段围绕工作流前端可视化与竞赛立项调研两条主线同步推进，在独立开源仓库 `rsi-flow-scout` 中交付了以下可运行资产：

| 模块 / 文档 | 定位 | 核心产出 | 验证状态 |
|---|---|---|---|
| `packages/rsi-flow-react` | 核心画布组件库 | 基于 `@xyflow/react` v12 与 `ReactFlowProvider` 封装交互式画布，支持 `FlowConfig` 与 React Flow 图结构双向无损转换及静态拓扑校验 | Vitest **4 passed (4)** + `npm run build` 成功（含 `.d.ts`） |
| `packages/rsi-flow-visual` | Vibe Coding 工作室 | 集成自然语言 `vibeFlowSynthesizer`、3 套武大赛事预置流程、节点与 JEXL 路由属性检查器、主路径执行仿真与 JSON 导入导出弹窗 | Vitest **3 passed (3)** + `vite build` 打包通过 |
| `workflows/*.json` | 标准流程配置包 | 交付首个完整示范主流程 `flow-whu-competition-scout.json` 与嵌套子流程 `flow-whu-track-scoring.json` | 通过 `validateFlowGraph` 结构校验 |
| `docs/whu_competition_survey_2026_2027.md` | 武大参赛规划文档 | 逐条核对武大 2026 本科生学科竞赛认定表（153 项），确立 S/A/B 三档梯队、全年甘特表及 3 分钟路演模板 | 完成人工复核与级别校准 |

---

## 二、工程实现亮点（`rsi-flow-react` + `rsi-flow-visual`）

### 2.1 `rsi-flow-react`：图布局、转换与校验内核

1. **图转换双向保真（`flowConfigToGraph` / `graphToFlowConfig`）**
   - 自动注入 `start` 入口与 `end` 出口虚节点，对包含顺序算子（`event`）、嵌套子流程（`flow`）及多路条件分支边（`rsiCondition`）的复杂流程做分层排布，避免节点重叠。
   - 支持从画布拖拽编辑后的 React Flow 状态一键反向导出为兼容上游 `rsi-flow` 协议的 `FlowConfig` JSON。
2. **静态安全校验（`validateFlowGraph`）**
   - 在预览、导入 JSON 与 Vibe 生成阶段实时检查：缺失流程 ID、无效边的起止节点引用、无保护循环等结构性缺陷，在上线前阻断图拓扑错误。
3. **运行态视觉叠层（`RsiRuntimeOverlay`）**
   - 支持按节点 ID 注入 `running`、`success`、`error` 等状态与 Step 注解徽标，配合 `RsiFlowCanvas` 内置 Controls 与 MiniMap 提升可观测性。

### 2.2 `rsi-flow-visual`：以 Vibe Coding 驱动首个示范工作流

1. **首个主流程设计：`FLOW_WHU_COMPETITION_SCOUT` + 嵌套子流程 `FLOW_WHU_TRACK_SCORING`**
   - **入口与初筛**：依次经过 `SCOUT_LOAD_WHU_LIST`（加载武大 153 项白名单）与 `SCOUT_FILTER_CS_AI`（锁定计院、网安、AI 院、遥感、工创与团委推荐赛道）。
   - **嵌套子流程评估**：调用 `SCOUT_EVAL_SUBFLOW`（引用 `FLOW_WHU_TRACK_SCORING`），完成“国家级/省部级官方核验 → 2027 奇数年办赛窗口判断 → 技术契合度打分”。
   - **三路条件分级输出**：依据 JEXL 条件表达式 `fitScore >= 90 && level == 'NATIONAL'`、`fitScore >= 80` 与 `default`，分别进入 S 档国家级主攻方案、A 档综合科创冲刺方案或 B 档省部级练兵池。
2. **自然语言 Vibe 合成引擎（`vibeFlowSynthesizer`）**
   - 通过关键词模式识别（`scout`、`subflow`、`reuse`、`branch`）动态编排节点与条件路由，所有自动生成结果强制经由 `validateFlowGraph` 门禁校验后方能渲染上画布。
3. **单仓构建链路规范化**
   - 在 `packages/rsi-flow-visual` 的 Vite / Vitest 配置中通过 `resolve.dedupe` 与 `resolve.alias` 对齐本地包 `file:../rsi-flow-react` 的 `react` / `@xyflow/react` 单例依赖，彻底解决本地软链开发模式下的多实例上下文冲突。

---

## 三、武汉大学 2026 白名单赛事调研核心结论

经过逐条核查《武汉大学本科生学科竞赛认定信息表（2026年）》全表 153 项赛事，总结出三条最具操作价值的团队策略：

1. **识别认定级别差异**：**#109 中国大学生服务外包创新创业大赛** 在武大本科生认定表中属于**省部级**，应定位为春季 4 月实战热身赛；冲击国家级保研/评优加分的主战场必须锁定 **#102 CCF开源创新大赛**、**#113 中国软件杯**、**#107 中国高校计算机大赛（C4）**、**#104 全国大学生软件创新大赛** 与 **#106 中国大学生计算机设计大赛（4C）**。
2. **对齐 2027 奇数年赛历**：2027 年为奇数年，**#148 “挑战杯”全国大学生课外学术科技作品竞赛（校赛：武汉大学“自强杯”）** 正好进入本届周期，需从 2026 年 11 月起提前立项校级申报。
3. **坚持“一套底座、四轮复用”**：以本仓库建立的可视化编排工作室与标准流程 JSON 为统一内核，面向不同赛事仅调整约 20% 场景案例与申报文档视角，覆盖全年从自强杯、软件杯到 CCF 开源大赛的完整赛程。

---

## 四、自动化验证结果记录

| 验证项 | 执行命令 | 实测输出 |
|---|---|---|
| 画布组件库单测 | `cd packages/rsi-flow-react && npm test` | Vitest `1 file`, **`4 passed (4)`**（含顺序/分支/嵌套转换、校验、异常拦截） |
| 画布组件库打包 | `cd packages/rsi-flow-react && npm run build` | `tsc && vite build` 成功产出 `dist/index.js`、`dist/rsi-flow-react.css` 与 `.d.ts` |
| 工作室应用单测 | `cd packages/rsi-flow-visual && npm test` | Vitest `1 file`, **`3 passed (3)`**（涵盖 3 套预置校验、Vibe 合成、UI 渲染与全路径仿真） |
| 工作室应用打包 | `cd packages/rsi-flow-visual && npm run build` | `tsc && vite build` 成功打包 `dist/index.html` 与生产静态资源 |
