/* ============================================================
   BYTELLS — Chart Engine (Chart.js wrapper)
   Uses design system tokens for consistent styling
   ============================================================ */

window.BytellsCharts = (() => {

  const COLORS = {
    teal:        '#0D9488',
    tealLight:   '#14B8A6',
    tealFade:    'rgba(13,148,136,0.15)',
    tealFade2:   'rgba(13,148,136,0.08)',
    amber:       '#B45F06',
    amberLight:  '#D97706',
    amberFade:   'rgba(180,95,6,0.2)',
    quartz:      '#6C6960',
    navy:        '#1B2B34',
    red:         '#EF4444',
    redFade:     'rgba(239,68,68,0.15)',
    green:       '#22C55E',
    greenFade:   'rgba(34,197,94,0.15)',
    textMuted:   '#6C7680',
    textSec:     '#9BA3A8',
    border:      'rgba(108,105,96,0.18)',
  };

  const RISK_COLORS = {
    Low:      { bg: 'rgba(13,148,136,0.2)',  border: '#0D9488' },
    Medium:   { bg: 'rgba(180,95,6,0.2)',    border: '#B45F06' },
    High:     { bg: 'rgba(239,68,68,0.2)',   border: '#EF4444' },
    Critical: { bg: 'rgba(239,68,68,0.35)',  border: '#DC2626' },
  };

  const STATUS_COLORS = {
    'Delivered':  { bg: 'rgba(13,148,136,0.2)',  border: '#0D9488' },
    'In Transit': { bg: 'rgba(180,95,6,0.2)',    border: '#D97706' },
    'Delayed':    { bg: 'rgba(239,68,68,0.2)',   border: '#EF4444' },
    'Loading':    { bg: 'rgba(108,105,96,0.2)',  border: '#6C6960' },
    'Cancelled':  { bg: 'rgba(239,68,68,0.15)',  border: '#DC2626' },
  };

  // ── Global Chart.js defaults ─────────────────────────────────
  function initDefaults() {
    if (!window.Chart) return;
    Chart.defaults.color = COLORS.textMuted;
    Chart.defaults.font.family = "'DM Mono', monospace";
    Chart.defaults.font.size = 10;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(14,27,34,0.95)';
    Chart.defaults.plugins.tooltip.borderColor = COLORS.border;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = '#EEF0F2';
    Chart.defaults.plugins.tooltip.bodyColor = COLORS.textSec;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
  }

  const instances = {};

  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  // ── Risk Distribution Doughnut ────────────────────────────────
  function riskDoughnut(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => RISK_COLORS[d.label]?.bg || COLORS.tealFade),
          borderColor:     data.map(d => RISK_COLORS[d.label]?.border || COLORS.teal),
          borderWidth: 1.5,
          hoverOffset: 6,
        }]
      },
      options: {
        cutout: '68%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} ops`
            }
          }
        }
      }
    });
  }

  // ── Fuel Rate by Capacity Bar ────────────────────────────────
  function fuelByCapacity(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.capacity),
        datasets: [{
          label: 'Avg Fuel Rate (L/100km)',
          data: data.map(d => d.avg_fuel),
          backgroundColor: data.map((_, i) =>
            i % 2 === 0 ? COLORS.tealFade : COLORS.amberFade
          ),
          borderColor: data.map((_, i) =>
            i % 2 === 0 ? COLORS.teal : COLORS.amber
          ),
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` Fuel: ${ctx.parsed.y} L/100km`
            }
          }
        },
        scales: {
          x: {
            grid: { color: COLORS.border },
            ticks: { color: COLORS.textMuted },
          },
          y: {
            grid: { color: COLORS.border },
            ticks: { color: COLORS.textMuted },
            beginAtZero: false,
          }
        }
      }
    });
  }

  // ── Disruption Time Series Line ──────────────────────────────
  function disruptionTimeSeries(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [
          {
            label: 'Disruption Score',
            data: data.map(d => d.avg_disruption),
            borderColor: COLORS.teal,
            backgroundColor: 'rgba(13,148,136,0.07)',
            borderWidth: 2,
            pointBackgroundColor: COLORS.teal,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.4,
          },
          {
            label: 'Avg Fuel Rate',
            data: data.map(d => d.avg_fuel),
            borderColor: COLORS.amber,
            backgroundColor: 'rgba(180,95,6,0.05)',
            borderWidth: 2,
            pointBackgroundColor: COLORS.amber,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false,
            tension: 0.4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top' },
        },
        scales: {
          x: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted } },
          y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted }, beginAtZero: false }
        }
      }
    });
  }

  // ── Traffic vs ETA Bar ───────────────────────────────────────
  function trafficETA(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.traffic),
        datasets: [
          {
            label: 'Avg ETA Variation (min)',
            data: data.map(d => d.avg_eta_var),
            backgroundColor: COLORS.tealFade,
            borderColor: COLORS.teal,
            borderWidth: 1.5,
            borderRadius: 4,
            borderSkipped: false,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted } },
          y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted } }
        }
      }
    });
  }

  // ── Order Status Doughnut (small) ────────────────────────────
  function orderStatus(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.status),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => STATUS_COLORS[d.status]?.bg || COLORS.tealFade),
          borderColor:     data.map(d => STATUS_COLORS[d.status]?.border || COLORS.teal),
          borderWidth: 1.5,
          hoverOffset: 4,
        }]
      },
      options: {
        cutout: '60%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 9 }, padding: 10 } },
        }
      }
    });
  }

  // ── Horizontal bar for warehouse performance ─────────────────
  function warehouseBar(canvasId, data) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.warehouse.split(' ')[0]),
        datasets: [
          {
            label: 'Delivery Rate %',
            data: data.map(d => d.delivery_rate),
            backgroundColor: COLORS.tealFade,
            borderColor: COLORS.teal,
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Avg Disruption',
            data: data.map(d => d.avg_disruption),
            backgroundColor: COLORS.amberFade,
            borderColor: COLORS.amber,
            borderWidth: 1.5,
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted } },
          y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted } }
        }
      }
    });
  }

  // ── Generic result chart for NL2SQL output ───────────────────
  function nlResultChart(canvasId, queryResult) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx || !queryResult || !queryResult.rows.length) return;

    const labels = queryResult.rows.map(r => String(r[0]));
    const values = queryResult.rows.map(r => parseFloat(r[1]) || 0);

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: queryResult.columns[1] || 'Value',
          data: values,
          backgroundColor: labels.map((_, i) =>
            [COLORS.tealFade, COLORS.amberFade, COLORS.tealFade2, 'rgba(108,105,96,0.15)'][i % 4]
          ),
          borderColor: labels.map((_, i) =>
            [COLORS.teal, COLORS.amber, COLORS.tealLight, COLORS.quartz][i % 4]
          ),
          borderWidth: 1.5,
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted, maxRotation: 30 } },
          y: { grid: { color: COLORS.border }, ticks: { color: COLORS.textMuted }, beginAtZero: true }
        }
      }
    });
  }

  // ── Route risk radar ─────────────────────────────────────────
  function routeRiskRadar(canvasId, row) {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Driver Fatigue', 'Route Risk', 'Disruption', 'Delay Prob', 'ETA Var', 'Weather'],
        datasets: [{
          label: row?.Vehicle_ID || 'Active Vehicle',
          data: [
            (row?.Driver_Fatigue || 5) * 10,
            (row?.Route_Risk || 5) * 10,
            row?.Disruption_Score || 50,
            (row?.Delay_Probability || 0.5) * 100,
            Math.min(Math.abs(row?.ETA_Variation || 30), 100),
            ['Clear','Light Rain','Heavy Rain','Storm','Fog'].indexOf(row?.Weather_Severity || 'Clear') * 25,
          ],
          borderColor: COLORS.teal,
          backgroundColor: 'rgba(13,148,136,0.1)',
          borderWidth: 2,
          pointBackgroundColor: COLORS.teal,
          pointRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0, max: 100,
            grid: { color: COLORS.border },
            ticks: { color: COLORS.textMuted, stepSize: 25, backdropColor: 'transparent' },
            pointLabels: { color: COLORS.textSec, font: { size: 9 } },
            angleLines: { color: COLORS.border },
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  return {
    initDefaults,
    riskDoughnut,
    fuelByCapacity,
    disruptionTimeSeries,
    trafficETA,
    orderStatus,
    warehouseBar,
    nlResultChart,
    routeRiskRadar,
    destroy,
  };

})();
