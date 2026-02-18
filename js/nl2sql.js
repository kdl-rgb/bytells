window.BytellsNL2SQL = (() => {

  const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL    = 'llama-3.3-70b-versatile';

  // ── Full schema context for system prompt ────────────────────
  const SCHEMA_PROMPT = `You are an expert SQL generator for the Bytells Logistics Intelligence Platform.
Your task is to convert natural language queries into precise PostgreSQL SELECT statements.

DATABASE SCHEMA (Star Schema — 3 normalized tables):

Table 1: dim_vehicles
  - Vehicle_ID     VARCHAR  PRIMARY KEY
  - Vehicle_Capacity  INTEGER  (10, 20, 30, 40, 50 — tonnes)
  - Cargo_Condition   VARCHAR  ('Excellent', 'Good', 'Fair', 'Damaged')
  - Risk_Class        VARCHAR  ('Low', 'Medium', 'High', 'Critical')

Table 2: fact_operations
  - Operation_ID      SERIAL   PRIMARY KEY
  - Vehicle_ID        VARCHAR  FOREIGN KEY → dim_vehicles
  - Route_ID          VARCHAR
  - Warehouse_ID      VARCHAR
  - Timestamp         TIMESTAMPTZ
  - Fuel_Rate         DECIMAL  (litres/100km)
  - Traffic_Level     VARCHAR  ('Light', 'Moderate', 'Heavy', 'Severe')
  - ETA_Variation     INTEGER  (minutes, negative = early, positive = late)
  - Loading_Time      INTEGER  (minutes)
  - Order_Status      VARCHAR  ('Delivered', 'In Transit', 'Delayed', 'Loading', 'Cancelled')
  - Weather_Severity  VARCHAR  ('Clear', 'Light Rain', 'Heavy Rain', 'Storm', 'Fog')

Table 3: dim_risk
  - Route_ID              VARCHAR  PRIMARY KEY
  - Driver_Fatigue        INTEGER  (1–10 scale)
  - Route_Risk            DECIMAL  (1.0–10.0 scale)
  - Delivery_Time_Deviation INTEGER (minutes)
  - Disruption_Score      INTEGER  (0–100)
  - Delay_Probability     DECIMAL  (0.00–1.00)

RULES:
1. ALWAYS output ONLY a valid SQL SELECT statement. No explanation, no markdown, no backticks.
2. Use proper JOINs when data spans multiple tables.
3. Use aggregates (AVG, COUNT, SUM) and GROUP BY when asked for summaries.
4. Always include LIMIT 100 at the end.
5. Use table aliases: fo (fact_operations), dv (dim_vehicles), dr (dim_risk).
6. Example join: SELECT fo.Vehicle_ID, dv.Vehicle_Capacity, fo.Fuel_Rate FROM fact_operations fo JOIN dim_vehicles dv ON fo.Vehicle_ID = dv.Vehicle_ID LIMIT 100;`;

  // ── API Call ─────────────────────────────────────────────────
  async function generateSQL(naturalQuery, apiKey) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('NO_API_KEY');
    }

    // CORS Note: Groq API may block browser requests due to CORS policy.
    // For production, run this through your Flask backend as a proxy.
    // For demo purposes, this attempts direct call (may fail with CORS error).
    
    let response;
    try {
      response = await fetch(GROQ_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SCHEMA_PROMPT },
            { role: 'user',   content: `Convert to SQL: "${naturalQuery}"` }
          ],
          temperature: 0.1,
          max_tokens: 512,
          stream: false,
        })
      });
    } catch (fetchErr) {
      // CORS or network error
      if (fetchErr.message.includes('CORS') || fetchErr.name === 'TypeError') {
        throw new Error('CORS_BLOCKED');
      }
      throw new Error('NETWORK_ERROR');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('INVALID_API_KEY');
      if (response.status === 429) throw new Error('RATE_LIMITED');
      throw new Error(err?.error?.message || `API_ERROR_${response.status}`);
    }

    const data = await response.json();
    let sql = data.choices?.[0]?.message?.content?.trim() || '';

    if (!sql) {
      throw new Error('EMPTY_RESPONSE');
    }

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
    // Update status
    if (statusEl) statusEl.innerHTML = `<span class="spinner"></span> Generating SQL...`;

    let sql;
    try {
      sql = await generateSQL(query, apiKey);
    } catch (err) {
      const msgs = {
        NO_API_KEY:        '⚠ Please enter your Groq API key above.',
        INVALID_API_KEY:   '⚠ Invalid API key. Get one free at console.groq.com',
        RATE_LIMITED:      '⚠ Rate limited. Wait a moment and try again.',
        NON_SELECT_BLOCKED:'⚠ Security: Only SELECT queries are permitted.',
        CORS_BLOCKED:      '⚠ CORS blocked. In production, route this through your Flask backend. Showing mock SQL instead.',
        NETWORK_ERROR:     '⚠ Network error. Check your connection or use mock mode.',
        EMPTY_RESPONSE:    '⚠ Empty response from API. Showing mock SQL instead.',
      };
      const errMsg = msgs[err.message] || `⚠ ${err.message}`;
      if (statusEl) statusEl.innerHTML = errMsg;
      
      // If CORS blocked or network error, fallback to mock SQL for demo
      if (err.message === 'CORS_BLOCKED' || err.message === 'NETWORK_ERROR' || err.message === 'EMPTY_RESPONSE') {
        if (statusEl) statusEl.innerHTML += ' <span style="color:var(--amber-light)">(using mock SQL)</span>';
        // Continue with mock SQL generation below
        sql = null; // Will trigger mock SQL path
      } else {
        return null;
      }
    }

    // Display SQL with typewriter
    if (sqlOutputEl) {
      sqlOutputEl.classList.add('active');
      const label = sqlOutputEl.querySelector('.sql-label');
      const code  = sqlOutputEl.querySelector('.sql-code') || sqlOutputEl;
      
      // If API failed and we don't have SQL, generate mock
      if (!sql) {
        sql = generateMockSQL(query);
        if (statusEl && !statusEl.innerHTML.includes('mock')) {
          statusEl.innerHTML = '<span style="color:var(--amber-light)">⚠ Using mock SQL (API unavailable)</span>';
        }
      }
      
      if (label) {
        await typewrite(code, sql, 12);
      } else {
        await typewrite(sqlOutputEl, sql, 12);
      }
    }

    // Execute against mock data
    if (statusEl) statusEl.innerHTML = `<span class="spinner"></span> Executing query...`;
    await new Promise(r => setTimeout(r, 400));

    const result = window.BytellsData.executeQuery(sql);

    // Render chart if canvas available
    if (chartCanvasId && result) {
      window.BytellsCharts.nlResultChart(chartCanvasId, result);
    }

    // Render result table if resultAreaEl
    if (resultAreaEl && result) {
      renderResultTable(resultAreaEl, result);
    }

    if (statusEl) {
      statusEl.innerHTML = `<span style="color:var(--teal-light)">✓</span> ${result.rows.length} rows returned`;
    }

    return { sql, result };
  }

  // ── Result table renderer ─────────────────────────────────────
  function renderResultTable(container, result) {
    const html = `
      <div style="overflow-x:auto;">
        <table class="data-table" style="font-size:0.72rem;">
          <thead>
            <tr>${result.columns.map(c => `<th>${c}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${result.rows.map(row => `
              <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    container.innerHTML = html;
  }

  // ── Sample prompts ────────────────────────────────────────────
  const SAMPLE_PROMPTS = [
    'Show fuel rate for vehicles with low capacity',
    'Analyze route risk scores',
    'Count operations by order status',
    'Average disruption score by risk class',
    'ETA variation by traffic level',
    'Warehouse delivery rates comparison',
    'Driver fatigue vs delay probability',
  ];

  // ── Mock SQL generator (fallback when API unavailable) ───────
  function generateMockSQL(query) {
    const q = query.toLowerCase();
    if (q.includes('fuel') && (q.includes('capacity') || q.includes('low')))
      return `SELECT dv.Vehicle_Capacity, AVG(fo.Fuel_Rate) AS avg_fuel_rate, COUNT(*) AS operations\nFROM fact_operations fo\nJOIN dim_vehicles dv ON fo.Vehicle_ID = dv.Vehicle_ID\nWHERE dv.Vehicle_Capacity < 30\nGROUP BY dv.Vehicle_Capacity\nORDER BY dv.Vehicle_Capacity LIMIT 100;`;
    if (q.includes('risk') && (q.includes('route') || q.includes('score')))
      return `SELECT dr.Route_ID, dr.Route_Risk, dr.Disruption_Score, dr.Delay_Probability\nFROM dim_risk dr\nWHERE dr.Route_Risk > 5.0\nORDER BY dr.Disruption_Score DESC LIMIT 100;`;
    if (q.includes('status') || q.includes('order'))
      return `SELECT fo.Order_Status, COUNT(*) AS total_operations\nFROM fact_operations fo\nGROUP BY fo.Order_Status\nORDER BY total_operations DESC LIMIT 100;`;
    if (q.includes('disruption') && q.includes('class'))
      return `SELECT dv.Risk_Class, COUNT(*) AS operations, AVG(dr.Disruption_Score) AS avg_disruption\nFROM fact_operations fo\nJOIN dim_vehicles dv ON fo.Vehicle_ID = dv.Vehicle_ID\nJOIN dim_risk dr ON fo.Route_ID = dr.Route_ID\nGROUP BY dv.Risk_Class\nORDER BY avg_disruption DESC LIMIT 100;`;
    if (q.includes('eta') || q.includes('traffic'))
      return `SELECT fo.Traffic_Level, AVG(fo.ETA_Variation) AS avg_eta_var, AVG(dr.Delay_Probability) AS avg_delay\nFROM fact_operations fo\nJOIN dim_risk dr ON fo.Route_ID = dr.Route_ID\nGROUP BY fo.Traffic_Level\nORDER BY avg_eta_var DESC LIMIT 100;`;
    if (q.includes('warehouse') || q.includes('delivery'))
      return `SELECT fo.Warehouse_ID, COUNT(*) AS operations,\n  SUM(CASE WHEN fo.Order_Status = 'Delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS delivery_rate\nFROM fact_operations fo\nGROUP BY fo.Warehouse_ID\nORDER BY delivery_rate DESC LIMIT 100;`;
    if (q.includes('fatigue') || q.includes('driver'))
      return `SELECT dr.Driver_Fatigue, AVG(dr.Delay_Probability) AS avg_delay_prob, COUNT(*) AS routes\nFROM dim_risk dr\nGROUP BY dr.Driver_Fatigue\nORDER BY dr.Driver_Fatigue DESC LIMIT 100;`;
    
    // Generic fallback
    return `SELECT fo.Vehicle_ID, fo.Route_ID, fo.Order_Status, dv.Risk_Class, dr.Disruption_Score\nFROM fact_operations fo\nJOIN dim_vehicles dv ON fo.Vehicle_ID = dv.Vehicle_ID\nJOIN dim_risk dr ON fo.Route_ID = dr.Route_ID\nORDER BY fo.Timestamp DESC LIMIT 100;`;
  }

  return {
    generateSQL,
    generateMockSQL,
    runQuery,
    renderResultTable,
    SAMPLE_PROMPTS,
  };

})();