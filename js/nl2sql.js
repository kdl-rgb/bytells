import Groq from "groq-sdk";

window.BytellsNL2SQL = (() => {
  
  const MODEL = 'llama-3.3-70b-versatile';

  const SCHEMA_PROMPT = `You are an expert SQL generator for the Bytells Logistics Intelligence Platform.
Your task is to convert natural language queries into precise PostgreSQL SELECT statements.

DATABASE SCHEMA (Star Schema — 3 normalized tables):

Table 1: dim_vehicles
  - Vehicle_ID     VARCHAR  PRIMARY KEY
  - Vehicle_Capacity  INTEGER  (10, 20, 30, 40, 50 — tonnes)
  - Cargo_Condition    VARCHAR  ('Excellent', 'Good', 'Fair', 'Damaged')
  - Risk_Class         VARCHAR  ('Low', 'Medium', 'High', 'Critical')

Table 2: fact_operations
  - Operation_ID       SERIAL   PRIMARY KEY
  - Vehicle_ID         VARCHAR  FOREIGN KEY → dim_vehicles
  - Route_ID           VARCHAR
  - Warehouse_ID       VARCHAR
  - Timestamp          TIMESTAMPTZ
  - Fuel_Rate          DECIMAL  (litres/100km)
  - Traffic_Level      VARCHAR  ('Light', 'Moderate', 'Heavy', 'Severe')
  - ETA_Variation      INTEGER  (minutes, negative = early, positive = late)
  - Loading_Time       INTEGER  (minutes)
  - Order_Status       VARCHAR  ('Delivered', 'In Transit', 'Delayed', 'Loading', 'Cancelled')
  - Weather_Severity   VARCHAR  ('Clear', 'Light Rain', 'Heavy Rain', 'Storm', 'Fog')

Table 3: dim_risk
  - Route_ID               VARCHAR  PRIMARY KEY
  - Driver_Fatigue         INTEGER  (1–10 scale)
  - Route_Risk             DECIMAL  (1.0–10.0 scale)
  - Delivery_Time_Deviation INTEGER (minutes)
  - Disruption_Score       INTEGER  (0–100)
  - Delay_Probability      DECIMAL  (0.00–1.00)

RULES:
1. ALWAYS output ONLY a valid SQL SELECT statement. No explanation, no markdown, no backticks.
2. Use proper JOINs when data spans multiple tables.
3. Use aggregates (AVG, COUNT, SUM) and GROUP BY when asked for summaries.
4. Always include LIMIT 100 at the end.
5. Use table aliases: fo (fact_operations), dv (dim_vehicles), dr (dim_risk).
6. Example join: SELECT fo.Vehicle_ID, dv.Vehicle_Capacity, fo.Fuel_Rate FROM fact_operations fo JOIN dim_vehicles dv ON fo.Vehicle_ID = dv.Vehicle_ID LIMIT 100;`;

  // ── API Call using Groq SDK ──────────────────────────────────
  async function generateSQL(naturalQuery, apiKey) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('NO_API_KEY');
    }

    // Initialize the Groq client with the provided key
    const groq = new Groq({ 
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true // Required for client-side/browser usage
    });

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SCHEMA_PROMPT },
          { role: 'user', content: `Convert to SQL: "${naturalQuery}"` }
        ],
        model: MODEL,
        temperature: 0.1,
        max_tokens: 512,
        stream: false,
      });

      let sql = chatCompletion.choices[0]?.message?.content?.trim() || '';

      // Sanitize: strip any markdown fences
      sql = sql.replace(/```sql?/gi, '').replace(/```/g, '').trim();

      // Safety gate: only allow SELECT
      if (!sql.toUpperCase().startsWith('SELECT')) {
        throw new Error('NON_SELECT_BLOCKED');
      }

      // Ensure LIMIT 100
      if (!sql.toUpperCase().includes('LIMIT')) {
        sql = sql.replace(/;?\s*$/, '') + ' LIMIT 100;';
      }

      return sql;

    } catch (err) {
      if (err.status === 401) throw new Error('INVALID_API_KEY');
      if (err.status === 429) throw new Error('RATE_LIMITED');
      throw err;
    }
  }

  // ── Typewriter effect helper ─────────────────────────────────
  async function typewrite(el, text, speed = 18) {
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await new Promise(r => setTimeout(r, speed));
    }
  }

  // ── Full NL2SQL flow with UI updates ─────────────────────────
  async function runQuery({
    query,
    apiKey,
    sqlOutputEl,
    resultAreaEl,
    chartCanvasId,
    statusEl,
  }) {
    if (statusEl) statusEl.innerHTML = `Generating SQL...`;

    let sql;
    try {
      sql = await generateSQL(query, apiKey);
    } catch (err) {
      const msgs = {
        NO_API_KEY:         'Please enter your Groq API key above.',
        INVALID_API_KEY:    'Invalid API key. Get one free at console.groq.com',
        RATE_LIMITED:       'Rate limited. Wait a moment and try again.',
        NON_SELECT_BLOCKED: 'Security: Only SELECT queries are permitted.',
      };
      if (statusEl) statusEl.innerHTML = msgs[err.message] || `Error: ${err.message}`;
      return null;
    }

    if (sqlOutputEl) {
      sqlOutputEl.classList.add('active');
      const code = sqlOutputEl.querySelector('.sql-code') || sqlOutputEl;
      await typewrite(code, sql, 12);
    }

    if (statusEl) statusEl.innerHTML = `Executing query...`;
    await new Promise(r => setTimeout(r, 400));

    // Assumes window.BytellsData exists in your environment
    const result = window.BytellsData.executeQuery(sql);

    if (chartCanvasId && result) {
      window.BytellsCharts.nlResultChart(chartCanvasId, result);
    }

    if (resultAreaEl && result) {
      renderResultTable(resultAreaEl, result);
    }

    if (statusEl) {
      statusEl.innerHTML = `✓ ${result.rows.length} rows returned`;
    }

    return { sql, result };
  }

  function renderResultTable(container, result) {
    const html = `
      <div style="overflow-x:auto;">
        <table class="data-table" style="font-size:0.72rem; border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="border-bottom: 1px solid #6C6960;">
                ${result.columns.map(c => `<th style="text-align:left; padding:8px;">${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${result.rows.map(row => `
              <tr style="border-bottom: 1px solid #E5E7EB;">
                ${row.map(cell => `<td style="padding:8px;">${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    container.innerHTML = html;
  }

  const SAMPLE_PROMPTS = [
    'Show fuel rate for vehicles with low capacity',
    'Analyze route risk scores',
    'Count operations by order status',
    'Average disruption score by risk class',
    'ETA variation by traffic level',
    'Warehouse delivery rates comparison',
    'Driver fatigue vs delay probability',
  ];

  return {
    generateSQL,
    runQuery,
    renderResultTable,
    SAMPLE_PROMPTS,
  };

})();