import { describe, expect, it } from 'vitest';
import { flowConfigToGraph, graphToFlowConfig, validateFlowGraph } from '../adapter/flowAdapter';
import type { FlowConfig } from '../types/flow';

describe('rsi-flow-react adapter and validator', () => {
  it('round-trips sequential, conditional branch, and nested subflow nodes cleanly', () => {
    const flow: FlowConfig = {
      id: 'FLOW_SEQ_BRANCH',
      type: 'flow',
      title: 'Sequential + Branch',
      params: [{ name: 'birthday', type: 'String' }],
      results: [{ name: 'message', type: 'String' }],
      nodes: [
        { id: 'CHECK', type: 'event', reference: 'FLOW_BIRTHDAY', title: 'Check Age' },
        { id: 'ADULT', type: 'flow', reference: 'FLOW_ADULT_SUB', title: 'Adult SubFlow' },
        { id: 'CHILD', type: 'event', reference: 'FLOW_CHILD', title: 'Child' },
      ],
      routes: [
        { source: 'start', target: 'CHECK' },
        { source: 'CHECK', target: 'ADULT', condition: 'type == 1' },
        { source: 'CHECK', target: 'CHILD', condition: 'default' },
        { source: 'ADULT', target: 'end' },
        { source: 'CHILD', target: 'end' },
      ],
    };

    expect(validateFlowGraph(flow)).toEqual({ valid: true, errors: [], warnings: [] });
    const graph = flowConfigToGraph(flow);
    expect(graph.nodes.map((n) => n.id)).toEqual(['start', 'CHECK', 'ADULT', 'CHILD', 'end']);
    expect(graph.edges).toHaveLength(5);

    const roundTrip = graphToFlowConfig(graph.nodes, graph.edges, {
      id: flow.id,
      title: flow.title,
      params: flow.params,
      results: flow.results,
    });
    expect(roundTrip.nodes).toHaveLength(3);
    expect(roundTrip.nodes[1].type).toBe('flow');
    expect(roundTrip.routes[1].condition).toBe('type == 1');
  });

  it('supports structured WHILE and FOR_EACH loop nodes with runtime overlay', () => {
    const loopFlow: FlowConfig = {
      id: 'FLOW_LOOP_DEMO',
      type: 'flow',
      nodes: [
        {
          id: 'WHILE_STEP',
          type: 'loop',
          reference: 'STEP_INC',
          loop: { mode: 'WHILE', condition: 'counter < 3', maxIterations: 10 },
        },
        {
          id: 'EACH_STEP',
          type: 'loop',
          reference: 'STEP_ITEM',
          loop: { mode: 'FOR_EACH', collectionVar: 'items', itemVar: 'loopItem', maxIterations: 20 },
        },
      ],
      routes: [
        { source: 'start', target: 'WHILE_STEP' },
        { source: 'WHILE_STEP', target: 'EACH_STEP' },
        { source: 'EACH_STEP', target: 'end' },
      ],
    };

    expect(validateFlowGraph(loopFlow).valid).toBe(true);
    const graph = flowConfigToGraph(loopFlow, {
      WHILE_STEP: { status: 'running', iteration: 2, maxIterations: 10, note: 'converging' },
    });
    const whileNode = graph.nodes.find((n) => n.id === 'WHILE_STEP');
    expect(whileNode?.type).toBe('rsiLoop');
    expect(whileNode?.data.runtime?.iteration).toBe(2);
    expect(whileNode?.data.config?.loop?.mode).toBe('WHILE');
  });

  it('lays out bounded loopBack cycles without hanging and flags unguarded cycles', () => {
    const guardedCyclic: FlowConfig = {
      id: 'FLOW_GUARDED_CYCLE',
      type: 'flow',
      nodes: [
        { id: 'WORK', type: 'event', reference: 'DO_WORK' },
        { id: 'CHECK', type: 'event', reference: 'DO_CHECK' },
      ],
      routes: [
        { source: 'start', target: 'WORK' },
        { source: 'WORK', target: 'CHECK' },
        { source: 'CHECK', target: 'WORK', condition: 'retry == true', loopBack: true, maxIterations: 5 },
        { source: 'CHECK', target: 'end', condition: 'retry == false' },
      ],
    };

    const guardedRes = validateFlowGraph(guardedCyclic);
    expect(guardedRes.valid).toBe(true);
    const graph = flowConfigToGraph(guardedCyclic);
    const workPos = graph.nodes.find((n) => n.id === 'WORK')?.position.x ?? 0;
    const checkPos = graph.nodes.find((n) => n.id === 'CHECK')?.position.x ?? 0;
    expect(checkPos).toBeGreaterThan(workPos);
    expect(graph.edges.find((e) => e.data?.loopBack)?.animated).toBe(true);

    const unguardedCyclic: FlowConfig = {
      ...guardedCyclic,
      id: 'FLOW_UNGUARDED_CYCLE',
      routes: [
        { source: 'start', target: 'WORK' },
        { source: 'WORK', target: 'CHECK' },
        { source: 'CHECK', target: 'WORK', condition: 'true' },
        { source: 'CHECK', target: 'end', condition: 'false' },
      ],
    };
    const badRes = validateFlowGraph(unguardedCyclic);
    expect(badRes.valid).toBe(false);
    expect(badRes.errors.some((e) => e.includes('neither a loopBack edge nor'))).toBe(true);
  });

  it('rejects loop nodes missing loop config', () => {
    const invalid: FlowConfig = {
      id: 'FLOW_BAD_LOOP',
      nodes: [{ id: 'BAD', type: 'loop', reference: 'REF' }],
      routes: [
        { source: 'start', target: 'BAD' },
        { source: 'BAD', target: 'end' },
      ],
    };
    const res = validateFlowGraph(invalid);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('missing its loop config'))).toBe(true);
  });
});
