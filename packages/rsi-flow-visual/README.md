# rsi-flow-visual

Vibe Coding Visual Workflow Studio built on top of `rsi-flow-react` (`@xyflow/react` v12) and aligned with the `rsi-flow` JSON schema.

## Features

- **Natural-Language Vibe Synthesis**: Convert Chinese/English workflow requirements into validated `FlowConfig` topologies (`vibeFlowSynthesizer.ts`).
- **3 Built-in WHU Competition Scouting Presets**:
  - `FLOW_WHU_COMPETITION_SCOUT`: Sequential screening + nested sub-flow evaluation + S/A/B tier conditional branching.
  - `FLOW_WHU_TRACK_SCORING`: Nested scoring sub-flow verifying official WHU 2026 recognition levels and 2027 odd-year windows.
  - `FLOW_COMPETITION_REUSE_PIPELINE`: Cross-competition deliverable packaging flow.
- **Interactive Inspector & JSON Round-Trip**: Edit node titles, operator references, and JEXL edge conditions directly on canvas; import/export standard `rsi-flow` JSON definitions.
- **Execution Simulation**: Step-by-step highlight and primary-path simulation overlay.

## Commands

```bash
npm install
npm run dev     # start local Vite studio (http://localhost:5173)
npm test        # run Vitest + React Testing Library suite
npm run build   # type-check & bundle production assets
```
