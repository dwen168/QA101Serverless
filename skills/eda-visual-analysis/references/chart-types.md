# Chart Types Reference — EDA Visual Analysis

## Theme Variables
All charts use the QuantBot dark theme. Reference CSS variables defined in `frontend/index.html`:

| Variable | Value | Usage |
|----------|-------|-------|
| `--cyan` | `#00d4ff` | Primary price line, highlights |
| `--green` | `#10b981` | Bullish signals, MA20 |
| `--amber` | `#f59e0b` | MA10, neutral indicators |
| `--red` | `#dc2626` | Bearish signals, high-volume spikes |
| `--bg` / `--bg2` / `--bg3` | `#060912` / `#0d1424` / `#111b2e` | Chart backgrounds |
| `--text2` | `#7a8fb8` | Axis labels, legend text |
| `--text3` | `#3d5080` | Tick marks, grid lines |

---

## Chart A: Price & Moving Averages (Line)

**Purpose:** Show 30-day closing price trend with MA10 and MA20 overlays.

**Chart.js type:** `line`

**Key options:**
```js
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#7a8fb8' } } },
  scales: {
    x: { grid: { color: 'rgba(0,212,255,0.04)' }, ticks: { maxTicksLimit: 8 } },
    y: { grid: { color: 'rgba(0,212,255,0.04)' } }
  }
}
```

**Dataset styling:**
- Price: `borderColor: '#00d4ff'`, `fill: true`, `backgroundColor: 'rgba(0,212,255,0.08)'`, `tension: 0.3`, `pointRadius: 0`
- MA10: `borderDash: [4,4]`, `borderColor: '#f59e0b'`, no fill
- MA20: `borderDash: [8,4]`, `borderColor: '#10b981'`, no fill

---

## Chart B: Volume Analysis (Bar + Line Combo)

**Purpose:** Identify abnormal volume spikes relative to the 30-day average.

**Chart.js type:** `bar` (with a `line` dataset for the average)

**Color logic:**
```js
volumes.map(v => v > avgVolume * 1.3 ? 'rgba(239,68,68,0.7)' : 'rgba(0,212,255,0.4)')
```

**Average line:** `borderDash: [5,5]`, `borderColor: '#f59e0b'`, `type: 'line'`, `pointRadius: 0`

---

## Chart C: Analyst Consensus (Doughnut)

**Purpose:** Show the distribution of analyst ratings at a glance.

**Chart.js type:** `doughnut`

**Key options:**
```js
{
  cutout: '65%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, padding: 6 } }
  }
}
```

**Color mapping:**
| Rating | Color |
|--------|-------|
| Strong Buy | `#10b981` |
| Buy | `#6ee7b7` |
| Hold | `#f59e0b` |
| Sell | `#f87171` |
| Strong Sell | `#dc2626` |

---

## Chart D: News Sentiment (Bar)

**Purpose:** Visualise per-source sentiment scores on a −1 to +1 scale.

**Chart.js type:** `bar`

**Key options:**
```js
{ scales: { y: { min: -1, max: 1 } } }
```

**Color logic:**
```js
sentiment > 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'
```

---

## Chart Lifecycle (Frontend)

All charts are stored in `currentCharts` and destroyed via `destroyCharts()` before a new analysis run to prevent canvas reuse errors:

```js
function destroyCharts() {
  Object.values(currentCharts).forEach(c => { try { c.destroy(); } catch(e) {} });
  currentCharts = {};
}
```

Charts are initialised inside `setTimeout(..., 50)` to ensure the canvas elements are in the DOM before Chart.js mounts.
