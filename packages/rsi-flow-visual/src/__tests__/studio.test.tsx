import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { validateFlowGraph } from 'rsi-flow-react';
import App from '../App';
import { PRESET_FLOWS } from '../presets/flows';
import { synthesizeFlowFromPrompt } from '../vibe/vibeFlowSynthesizer';

describe('rsi-flow-visual Vibe Coding Studio', () => {
  it('validates all 3 built-in WHU competition presets as clean FlowConfigs', () => {
    expect(PRESET_FLOWS.length).toBe(3);
    for (const preset of PRESET_FLOWS) {
      const result = validateFlowGraph(preset.config);
      expect(result.valid, `Preset ${preset.key} failed: ${result.errors.join(', ')}`).toBe(true);
    }

    const scoutPreset = PRESET_FLOWS.find((p) => p.key === 'FLOW_WHU_COMPETITION_SCOUT');
    expect(scoutPreset).toBeDefined();
    expect(
      scoutPreset!.config.nodes.some(
        (n) => n.id === 'SCOUT_EVAL_SUBFLOW' && n.type === 'flow' && n.reference === 'FLOW_WHU_TRACK_SCORING',
      ),
    ).toBe(true);
    expect(
      scoutPreset!.config.routes.some((r) => r.condition?.includes('NATIONAL')),
    ).toBe(true);
  });

  it('synthesizes valid FlowConfig topologies from natural language Vibe prompts', () => {
    const scoutFlow = synthesizeFlowFromPrompt('调研武大2026白名单国家级比赛并嵌套子流程评分后分支立项');
    expect(scoutFlow.detectedPatterns).toEqual(expect.arrayContaining(['scout', 'subflow', 'branch']));
    expect(validateFlowGraph(scoutFlow.config).valid).toBe(true);
    expect(scoutFlow.config.nodes.some((n) => n.type === 'flow')).toBe(true);

    const reuseFlow = synthesizeFlowFromPrompt('围绕CCF开源大赛与中国软件杯生成多赛材料复用分支流程');
    expect(reuseFlow.detectedPatterns).toEqual(expect.arrayContaining(['reuse', 'branch']));
    expect(validateFlowGraph(reuseFlow.config).valid).toBe(true);
  });

  it('renders Studio UI, synthesizes workflow on Vibe submit, and runs full path simulation', () => {
    render(<App />);
    expect(screen.getByText('RSI-Flow Visual Studio')).toBeTruthy();
    expect(screen.getByText('FLOW_WHU_COMPETITION_SCOUT')).toBeTruthy();
    expect(screen.getByTestId('validation-pill').textContent).toContain('结构校验通过 ✓');

    const input = screen.getByLabelText('Vibe Coding 自然语言流程描述') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '围绕CCF开源大赛与软件杯材料复用并条件分支筛选' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vibe 生成流程' }));
    expect(screen.getByText('FLOW_VIBE_REUSE_BRANCH')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '主路径全量仿真' }));
    expect(screen.getByText(/已完成主路径全量仿真/)).toBeTruthy();
    expect(screen.getByTestId('validation-pill').textContent).toContain('结构校验通过 ✓');
  });
});
