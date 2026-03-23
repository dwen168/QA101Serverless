# Quant Stock Analysis - Improvement v2.4 (Cross-Asset Macro Anchors)

## Overview
Analysis of the `trade-recommendation` skill indicated that the original sector-event mapping was somewhat static and relied entirely on descriptive labels rather than underlying market flows. Buying an energy stock on geopolitical headlines can be an empty trade if oil prices are not actively participating in a breakout.

In version 2.4, we engineered a **Cross-Asset Validation (Macro Anchors)** logic, pivoting the skill moving toward institutional-grade macro correlation mapping.

## Functional Changes

### 1. Macro Data Ingestion (`market-intelligence` Skill)
- **Module Created**: `skills/market-intelligence/scripts/modules/macro-anchors.js`
- **Functionality**: Built `fetchMacroAnchors` to automatically retrieve 90-day trailing price histories from the Yahoo Finance API for fundamental market anchors:
  - **Crude Oil (`CL=F`)**: Barometer for energy sector momentum.
  - **Gold (`GC=F`)**: Proxy for traditional safe-haven accumulation.
  - **10Y Treasury Yield (`^TNX`)**: Risk-free rate proxy affecting valuation models.
  - **VIX Volatility Index (`^VIX`)**: The leading indicator of market-wide panic.
- **Integration**: Plumbed the anchor evaluations seamlessly into the unified `marketData` pipeline in `market-intelligence/scripts/index.js`.

### 2. Enhanced Conviction Scoring (`trade-recommendation` Skill)
- **Module Affected**: `skills/trade-recommendation/scripts/modules/scoring.js`
- **Functionality**: Layered in dynamic point shifts based on multi-asset context.
  - **Oil Confirmation**: Energy signal confidence now hinges directly on crude (`CL=F`) health. A strong bull trend in oil triggers a +1 tailwind for Energy names; weakness applies a -1 headwind.
  - **Volatility Intervention**: A trailing >10% surge in the `^VIX` triggers a rigid -1.5 point "risk-off" override limit across most cyclical groups, preventing the system from aggressively buying falling knives.
  - **Rate Gravity**: Significant momentum in the 10Y Treasury (`^TNX` growth > 10%) applies a -1 headwind valuation penalty specifically targeting duration-sensitive spaces like `Technology` and `Real Estate`.

### 3. Visualizations and UI Displays (`frontend`)
- **Module Affected**: `frontend/js/app.js` -> `renderMarketIntelligence()`
- **Functionality**:
  - Implemented an elegant **"Macro Anchors (3-Month Trend)"** card immediately following existing macro indicators.
  - Engineered lightweight HTML/CSS **Mini Sparkline Charts** inside the widgets to plot the 30-day fractional curve, negating the need for heavyweight canvas/Chart.js footprints for simple context widgets.
  - Fully integrated the macro overlay with the existing `trade-recommendation` panel. The new constraints naturally appear under **"Signal Breakdown"** (e.g. `Macro Anchor: Volatility Spiking`).

---

## Factor Contribution (Decision Tree Replacement)

### Background
The original "Decision Tree" used a 4-gate sequential chain (Score Gate → Signal Balance → Macro Gate → Confidence Gate). While structurally valid, users found it opaque — the nodes described thresholds rather than explaining *what* drove the final recommendation.

### New Design: 5-Pillar Factor Contribution

| Pillar | Scoring Buckets Covered |
|---|---|
| **Technical Trend** | `trend`, `longtrend`, `oscillator`, `momentum`, `technical`, `intraday` |
| **Fundamental Value** | `valuation`, `analyst` |
| **News & Sentiment** | `sentiment`, `eda` |
| **Macro Context** | `macro` |
| **Risk Penalty** *(inverse)* | Cross-cutting — all negative-pointing signals across every bucket |

Each pillar aggregates the net point contribution of all signals that belong to its bucket group, making it immediately clear **which category of evidence is pushing the recommendation**.

### Module Changes

#### `skills/trade-recommendation/scripts/modules/decision-tree.js`
- Replaced the `buildDecisionTree` logic with a pillar-based aggregation model.
- Each pillar outputs:
  - `netScore` — signed sum of signal points within the pillar's buckets.
  - `outcome` — `"bullish"` / `"neutral"` / `"bearish"` (or `"low"` / `"moderate"` / `"high"` for Risk Penalty).
  - `topSignals[]` — top 5 contributing signals sorted by absolute point magnitude.
- The **Risk Penalty** pillar collects only negative-pointing signals across *all* buckets and computes `riskPressurePct` (what fraction of total signal power works against the trade).
- `buildDecisionTree()` interface is unchanged — same inputs (`score`, `signals`, `confidence`, `action`, `macroOverlay`, `eventRegimeOverlay`), but the output shape is now `{ title, pillars[], leaf }` instead of `{ title, nodes[], selectedPath[], leaf }`.

#### `frontend/js/app.js` → `renderDecisionTreeHtml(tree)`
- Re-written to render 5 coloured cards stacked vertically.
- Each card shows:
  - Pillar name + net score label + outcome chip (BULLISH / NEUTRAL / BEARISH / LOW|MOD|HIGH RISK).
  - A **centred contribution bar**: extends right for bullish net score, left for bearish, proportional to magnitude.
  - Risk Penalty shows a left-to-right pressure bar (0–100% drag), coloured green → amber → red.
  - A **"Show signals (N)"** button expands the top contributing signals inline, displaying signal name, reason, and point value.
- Event delegation (delegated click on `recCard`) handles the show/hide toggle without re-attaching listeners on re-render.

### Why This Is Better
- **Transparent** — users immediately see whether the call is driven by technicals, fundamentals, news, or macro, and how large each category's contribution is relative to the others.
- **Actionable** — clicking "Show signals" inside any pillar reveals the exact signals (with reasons and point values) that formed that category's verdict.
- **Honest about risk** — the Risk Penalty pillar makes headwinds visible rather than burying them inside an aggregate score.

