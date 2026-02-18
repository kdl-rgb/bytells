document.addEventListener('DOMContentLoaded', () => {

  BytellsCharts.initDefaults();

  const clockEl = document.getElementById('liveTime');
  const updateClock = () => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);

  const ROLE_CONFIG = {
    fleet: {
      label: 'Fleet Manager',
      avatar: 'FM',
      views: [
        { id: 'fleet',   label: 'Fleet Overview',   icon: 'truck',     section: 'OVERVIEW' },
        { id: 'analyst', label: 'Analytics',         icon: 'bar-chart', section: 'ANALYTICS' },
        { id: 'admin',   label: 'User Management',   icon: 'users',     section: 'MANAGEMENT' },
      ],
      defaultView: 'fleet',
    },
    analyst: {
      label: 'Analyst',
      avatar: 'AN',
      views: [
        { id: 'analyst', label: 'Research & Risk',  icon: 'bar-chart', section: 'ANALYTICS' },
      ],
      defaultView: 'analyst',
    },
    driver: {
      label: 'Driver',
      avatar: 'DV',
      views: [
        { id: 'driver', label: 'Route Safety HUD', icon: 'navigation', section: 'ROUTES' },
      ],
      defaultView: 'driver',
    },
    admin: {
      label: 'Admin',
      avatar: 'AD',
      views: [
        { id: 'fleet',  label: 'Fleet Overview',   icon: 'truck',     section: 'OVERVIEW' },
        { id: 'analyst',label: 'Analytics',         icon: 'bar-chart', section: 'ANALYTICS' },
        { id: 'driver', label: 'Driver HUD',        icon: 'navigation',section: 'OVERVIEW' },
        { id: 'admin',  label: 'User Management',   icon: 'users',     section: 'MANAGEMENT' },
      ],
      defaultView: 'admin',
    },
  };

  const ICONS = {
    truck:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    'bar-chart':`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    navigation:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
    users:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  };

  let currentRole = null;
  let currentView = null;

  document.getElementById('loginBtn').addEventListener('click', () => {
    const role = document.getElementById('loginRole').value;
    doLogin(role);
  });

  function doLogin(role) {
    currentRole = role;
    const config = ROLE_CONFIG[role];

    document.getElementById('userAvatar').textContent = config.avatar;
    document.getElementById('userName').textContent   = 'Demo User';

    buildSidebar(config);
    document.getElementById('loginModal').classList.remove('open');
    document.getElementById('dashboardRoot').style.display = 'flex';
    navigateTo(config.defaultView);
  }

  function buildSidebar(config) {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = '';

    let lastSection = null;

    config.views.forEach(view => {
      if (view.section !== lastSection) {
        const label = document.createElement('div');
        label.className = 'nav-section-label';
        label.textContent = view.section;
        nav.appendChild(label);
        lastSection = view.section;
      }

      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.view = view.id;
      btn.innerHTML = `
        <span class="nav-item-icon">${ICONS[view.icon] || ''}</span>
        <span class="nav-item-text">${view.label}</span>
      `;
      btn.addEventListener('click', () => navigateTo(view.id));
      nav.appendChild(btn);
    });
  }

  function navigateTo(viewId) {
    currentView = viewId;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    document.querySelectorAll('.content-area').forEach(area => {
      area.classList.toggle('active', area.id === `view-${viewId}`);
    });

    const titles = { fleet: 'Fleet Overview', analyst: 'Analytics', driver: 'Driver HUD', admin: 'User Management' };
    const crumbs = { fleet: 'Bytells / Dashboard', analyst: 'Bytells / Analytics', driver: 'Bytells / Driver HUD', admin: 'Bytells / Admin' };
    document.getElementById('pageTitle').textContent    = titles[viewId] || viewId;
    document.getElementById('pageBreadcrumb').textContent = crumbs[viewId] || 'Bytells';

    switch (viewId) {
      case 'fleet':   renderFleetView();   break;
      case 'analyst': renderAnalystView(); break;
      case 'driver':  renderDriverView();  break;
      case 'admin':   renderAdminView();   break;
    }
  }

  document.getElementById('refreshBtn').addEventListener('click', () => {
    if (currentView) navigateTo(currentView);
  });

  function renderFleetView() {
    const kpis = BytellsData.getKPIs();

    document.getElementById('kpiVehicles').textContent = kpis.active_vehicles;
    document.getElementById('kpiDelivery').textContent = kpis.delivery_rate + '%';
    document.getElementById('kpiFuel').textContent     = kpis.avg_fuel_rate;
    document.getElementById('kpiHighRisk').textContent = kpis.high_risk_count;

    BytellsCharts.disruptionTimeSeries('chartTimeSeries', BytellsData.getDisruptionTimeSeries());
    BytellsCharts.orderStatus('chartOrderStatus', BytellsData.getOrderStatusBreakdown());
    BytellsCharts.warehouseBar('chartWarehouse', BytellsData.getWarehousePerf());
    BytellsCharts.riskDoughnut('chartRiskDist', BytellsData.getRiskDistribution());

    renderOpsTable(BytellsData.getRecentOperations(20));

    document.getElementById('opsFilterInput').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = BytellsData.getRecentOperations(50).filter(r =>
        r.Vehicle_ID.toLowerCase().includes(term) ||
        r.Route_ID.toLowerCase().includes(term)   ||
        r.Order_Status.toLowerCase().includes(term)||
        r.Risk_Class.toLowerCase().includes(term)
      );
      renderOpsTable(filtered);
    });
  }

  function renderOpsTable(rows) {
    document.getElementById('opsCount').textContent = `${rows.length} records`;
    const riskColor = { Low: 'risk-low', Medium: 'risk-medium', High: 'risk-high', Critical: 'risk-critical' };
    const statusColor = { Delivered: 'risk-low', 'In Transit': 'tag-teal', Delayed: 'risk-high', Loading: 'tag-grey', Cancelled: 'risk-critical' };

    document.getElementById('opsTableBody').innerHTML = rows.map(r => `
      <tr>
        <td class="mono">${r.Vehicle_ID}</td>
        <td class="mono">${r.Route_ID}</td>
        <td style="font-size:0.78rem;">${r.Warehouse_Name}</td>
        <td><span class="risk-badge ${statusColor[r.Order_Status] || 'tag-grey'}">${r.Order_Status}</span></td>
        <td style="color:var(--amber-light);font-family:var(--font-mono);font-size:0.78rem;">${r.Fuel_Rate}</td>
        <td style="font-size:0.78rem;">${r.Traffic_Level}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:48px;height:4px;border-radius:2px;background:rgba(108,105,96,0.2);">
              <div style="height:100%;width:${r.Disruption_Score}%;border-radius:2px;background:${r.Disruption_Score > 70 ? 'var(--red)' : r.Disruption_Score > 40 ? 'var(--amber)' : 'var(--teal)'};"></div>
            </div>
            <span style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);">${r.Disruption_Score}</span>
          </div>
        </td>
        <td><span class="risk-badge ${riskColor[r.Risk_Class]}">${r.Risk_Class}</span></td>
        <td style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);">${r.Timestamp_fmt}</td>
      </tr>
    `).join('');
  }

  function renderAnalystView() {
    BytellsCharts.fuelByCapacity('chartFuelCap', BytellsData.getFuelByCapacity());
    BytellsCharts.trafficETA('chartTrafficETA', BytellsData.getTrafficVsETA());
    BytellsCharts.riskDoughnut('chartRiskAnalyst', BytellsData.getRiskDistribution());

    const chipsEl = document.getElementById('analystChips');
    if (!chipsEl.children.length) {
      BytellsNL2SQL.SAMPLE_PROMPTS.forEach(p => {
        const chip = document.createElement('button');
        chip.className = 'prompt-chip';
        chip.textContent = p;
        chip.addEventListener('click', () => {
          document.getElementById('analystNlInput').value = p;
          runAnalystQuery(p);
        });
        chipsEl.appendChild(chip);
      });
    }
    const sendBtn = document.getElementById('analystSendBtn');
    sendBtn.onclick = () => {
      const q = document.getElementById('analystNlInput').value.trim();
      if (q) runAnalystQuery(q);
    };

    document.getElementById('analystNlInput').onkeydown = (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) runAnalystQuery(q);
      }
    };
  }

  async function runAnalystQuery(query) {
    const apiKey   = document.getElementById('analystApiKey').value;
    const sqlEl    = document.getElementById('analystSqlOutput');
    const statusEl = document.getElementById('analystStatus');
    const sendBtn  = document.getElementById('analystSendBtn');

    sendBtn.disabled = true;
    statusEl.innerHTML = `<span class="spinner"></span> Generating...`;
    sqlEl.textContent  = 'SELECT -- generating...';

    try {
      let sql;
      if (!apiKey.trim()) {
        sql = BytellsNL2SQL.generateMockSQL(query);
        statusEl.innerHTML = `<span style="color:var(--amber-light)">⚠ No API key — showing mock SQL</span>`;
      } else {
        try {
          sql = await BytellsNL2SQL.generateSQL(query, apiKey);
          statusEl.innerHTML = `<span style="color:var(--teal-light)">✓ SQL generated via Groq</span>`;
        } catch (apiErr) {
          sql = BytellsNL2SQL.generateMockSQL(query);
          if (apiErr.message === 'CORS_BLOCKED') {
            statusEl.innerHTML = `<span style="color:var(--amber-light)">⚠ CORS blocked — showing mock SQL (route through Flask in production)</span>`;
          } else if (apiErr.message === 'INVALID_API_KEY') {
            statusEl.innerHTML = `<span style="color:#F87171">⚠ Invalid API key — showing mock SQL</span>`;
          } else {
            statusEl.innerHTML = `<span style="color:var(--amber-light)">⚠ API error — showing mock SQL</span>`;
          }
        }
      }

      sqlEl.textContent = '';
      for (let i = 0; i < sql.length; i++) {
        sqlEl.textContent += sql[i];
        await new Promise(r => setTimeout(r, 8));
      }

      const result = BytellsData.executeQuery(sql);
      BytellsCharts.nlResultChart('analystChart', result);
      BytellsNL2SQL.renderResultTable(document.getElementById('analystResultTable'), result);
      statusEl.innerHTML += ` · ${result.rows.length} rows`;

    } catch (err) {
      statusEl.innerHTML = `<span style="color:#F87171">⚠ ${err.message}</span>`;
    }

    sendBtn.disabled = false;
  }

  function renderDriverView() {
    const ops = BytellsData.getRecentOperations(10);
    const activeOp = ops[Math.floor(Math.random() * ops.length)];
    const wh = BytellsData.warehouses;

    const etaVal = activeOp.ETA_Variation;
    document.getElementById('driverETA').textContent    = (etaVal >= 0 ? '+' : '') + etaVal + ' min';
    document.getElementById('driverFatigue').textContent = activeOp.Driver_Fatigue + '/10';
    document.getElementById('driverRisk').textContent   = activeOp.Risk_Class;
    document.getElementById('driverRouteId').textContent = activeOp.Route_ID;
    document.getElementById('driverVehicleTag').textContent = activeOp.Vehicle_ID;

    const fromWh = wh[Math.floor(Math.random() * wh.length)];
    const toWh   = wh[Math.floor(Math.random() * wh.length)];
    document.getElementById('driverFrom').textContent = fromWh.name;
    document.getElementById('driverTo').textContent   = toWh.name;

    const rc = document.getElementById('driverRiskCard');
    rc.className = `stat-card ${activeOp.Risk_Class === 'Low' ? 'teal' : activeOp.Risk_Class === 'Medium' ? 'amber' : 'red'}`;

    BytellsCharts.routeRiskRadar('chartDriverRadar', activeOp);

    const alerts = [];
    if (activeOp.Driver_Fatigue >= 7) alerts.push({ type: 'amber', msg: `High fatigue score (${activeOp.Driver_Fatigue}/10) — consider rest stop` });
    if (['High', 'Critical'].includes(activeOp.Risk_Class)) alerts.push({ type: 'red', msg: `${activeOp.Risk_Class} risk route — enhanced monitoring active` });
    if (activeOp.Delay_Probability > 0.65) alerts.push({ type: 'amber', msg: `Delay probability ${(activeOp.Delay_Probability * 100).toFixed(0)}% — check traffic ahead` });
    if (activeOp.Weather_Severity === 'Storm' || activeOp.Weather_Severity === 'Heavy Rain') alerts.push({ type: 'red', msg: `Weather alert: ${activeOp.Weather_Severity} — reduce speed` });
    if (!alerts.length) alerts.push({ type: 'teal', msg: 'All systems nominal — safe travels' });

    document.getElementById('driverAlerts').innerHTML = alerts.map(a => `
      <div style="padding:var(--space-3) var(--space-4);background:${a.type === 'red' ? 'rgba(239,68,68,0.08)' : a.type === 'amber' ? 'rgba(180,95,6,0.08)' : 'rgba(13,148,136,0.08)'};border:1px solid ${a.type === 'red' ? 'rgba(239,68,68,0.25)' : a.type === 'amber' ? 'rgba(180,95,6,0.25)' : 'rgba(13,148,136,0.25)'};border-radius:var(--radius-md);display:flex;align-items:center;gap:var(--space-3);">
        <div style="width:6px;height:6px;border-radius:50%;background:${a.type === 'red' ? '#EF4444' : a.type === 'amber' ? 'var(--amber-light)' : 'var(--teal-light)'};flex-shrink:0;"></div>
        <span style="font-size:0.8rem;color:var(--text-secondary);">${a.msg}</span>
      </div>
    `).join('');

    const vehicleOps = BytellsData.getRecentOperations(50)
      .filter(r => r.Vehicle_ID === activeOp.Vehicle_ID)
      .slice(0, 8);

    const riskColor = { Low: 'risk-low', Medium: 'risk-medium', High: 'risk-high', Critical: 'risk-critical' };

    document.getElementById('driverHistoryBody').innerHTML = vehicleOps.map(r => `
      <tr>
        <td class="mono">${r.Route_ID}</td>
        <td style="font-size:0.78rem;">${r.Warehouse_Name}</td>
        <td><span class="risk-badge risk-${r.Order_Status === 'Delivered' ? 'low' : r.Order_Status === 'Delayed' ? 'high' : 'medium'}">${r.Order_Status}</span></td>
        <td><span class="risk-badge ${riskColor[r.Risk_Class]}">${r.Risk_Class}</span></td>
        <td style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);">${r.Disruption_Score}</td>
        <td style="font-family:var(--font-mono);font-size:0.72rem;color:${r.ETA_Variation > 0 ? 'var(--amber-light)' : 'var(--teal-light)'};">${r.ETA_Variation > 0 ? '+' : ''}${r.ETA_Variation}m</td>
        <td style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-muted);">${r.Timestamp_fmt}</td>
      </tr>
    `).join('');
  }

  const MOCK_USERS = [
    { name: 'Kgotla Moagi',    email: 'k.moagi@kdl.co.bw',    role: 'fleet',   status: 'online' },
    { name: 'Tshepiso Dube',   email: 't.dube@kdl.co.bw',     role: 'analyst', status: 'online' },
    { name: 'Mpho Letsatsi',   email: 'm.letsatsi@kdl.co.bw', role: 'driver',  status: 'offline' },
    { name: 'Onthatile Setlho',email: 'o.setlho@kdl.co.bw',   role: 'driver',  status: 'online' },
    { name: 'Neo Gabatshware', email: 'n.gab@kdl.co.bw',      role: 'analyst', status: 'offline' },
  ];

  const AUDIT_EVENTS = [
    { ts: '10:42:31', user: 'k.moagi',    action: 'LOGIN',        resource: 'Dashboard',    ip: '10.0.1.5',  status: 'Success' },
    { ts: '10:38:15', user: 't.dube',     action: 'NL2SQL_QUERY', resource: 'fact_ops',     ip: '10.0.1.8',  status: 'Success' },
    { ts: '10:22:04', user: 'm.letsatsi', action: 'VIEW_ROUTE',   resource: 'RT-005',       ip: '10.0.2.14', status: 'Success' },
    { ts: '09:55:18', user: 'n.gab',      action: 'LOGIN_FAIL',   resource: 'Dashboard',    ip: '192.168.1.3', status: 'Denied' },
    { ts: '09:44:07', user: 'k.moagi',    action: 'EXPORT',       resource: 'fact_ops',     ip: '10.0.1.5',  status: 'Success' },
    { ts: '09:30:55', user: 't.dube',     action: 'NL2SQL_QUERY', resource: 'dim_risk',     ip: '10.0.1.8',  status: 'Success' },
    { ts: '09:12:41', user: 'o.setlho',   action: 'VIEW_HUD',     resource: 'RT-003',       ip: '10.0.3.21', status: 'Success' },
    { ts: '08:58:02', user: 'system',     action: 'DB_BACKUP',    resource: 'neon_main',    ip: 'internal',  status: 'Success' },
    { ts: '08:45:19', user: 'system',     action: 'SCHEMA_SYNC',  resource: 'dim_vehicles', ip: 'internal',  status: 'Success' },
    { ts: '08:30:00', user: 'system',     action: 'HEALTH_CHECK', resource: 'all_tables',   ip: 'internal',  status: 'Success' },
  ];

  function renderAdminView() {
    
    const roleLabels = { fleet: 'Fleet Manager', analyst: 'Analyst', driver: 'Driver', admin: 'Admin' };
    const roleColors = { fleet: 'tag-amber', analyst: 'tag-teal', driver: 'tag-grey', admin: 'tag-amber' };

    document.getElementById('adminUserList').innerHTML = MOCK_USERS.map(u => `
      <div class="user-row">
        <div class="user-row-info">
          <div style="width:30px;height:30px;border-radius:50%;background:var(--teal-glow);border:1px solid rgba(13,148,136,0.2);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:0.7rem;font-weight:700;color:var(--teal-light);">
            ${u.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div class="user-row-name">${u.name}</div>
            <div class="user-row-email">${u.email}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <span class="label-tag ${roleColors[u.role]}">${roleLabels[u.role]}</span>
          <span class="status-dot ${u.status === 'online' ? 'online' : 'offline'}"></span>
        </div>
      </div>
    `).join('');

    
    const health = [
      { label: 'Neon PostgreSQL',     status: 'Connected',  pct: 99, color: 'teal' },
      { label: 'Cloudflare Tunnel',   status: 'Active',     pct: 100, color: 'teal' },
      { label: 'Groq API (NL2SQL)',   status: 'Available',  pct: 97, color: 'teal' },
      { label: 'Flask Backend',       status: 'Running',    pct: 100, color: 'teal' },
      { label: 'DB Backup (Neon)',    status: '2h ago',     pct: 100, color: 'teal' },
    ];

    document.getElementById('adminHealthItems').innerHTML = health.map(h => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);">
        <div style="display:flex;align-items:center;gap:var(--space-2);">
          <span class="status-dot online"></span>
          <span style="font-size:0.8rem;color:var(--text-secondary);">${h.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div style="width:64px;height:3px;border-radius:2px;background:rgba(108,105,96,0.2);">
            <div style="height:100%;width:${h.pct}%;background:var(--teal);border-radius:2px;"></div>
          </div>
          <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--teal-light);">${h.status}</span>
        </div>
      </div>
    `).join('');

    
    document.getElementById('auditBody').innerHTML = AUDIT_EVENTS.map(e => `
      <tr>
        <td style="font-family:var(--font-mono);font-size:0.68rem;color:var(--text-muted);">Today ${e.ts}</td>
        <td class="mono">${e.user}</td>
        <td><span style="font-family:var(--font-mono);font-size:0.68rem;color:${e.action.includes('FAIL') || e.action.includes('DENY') ? '#F87171' : 'var(--teal-light)'};">${e.action}</span></td>
        <td style="font-size:0.78rem;color:var(--text-secondary);">${e.resource}</td>
        <td class="mono" style="font-size:0.68rem;">${e.ip}</td>
        <td><span class="risk-badge ${e.status === 'Success' ? 'risk-low' : 'risk-high'}">${e.status}</span></td>
      </tr>
    `).join('');

    
    document.getElementById('addUserBtn').onclick = () => {
      alert('In production: opens user creation form with role assignment and Argon2 credential setup.');
    };
  }

});