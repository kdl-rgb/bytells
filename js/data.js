window.BytellsData = (() => {

  const rand = (min, max, dp = 0) => {
    const v = Math.random() * (max - min) + min;
    return dp > 0 ? parseFloat(v.toFixed(dp)) : Math.round(v);
  };

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const pad = (n, l = 3) => String(n).padStart(l, '0');

  const ORDER_STATUS   = ['Delivered', 'In Transit', 'Delayed', 'Loading', 'Cancelled'];
  const CARGO_COND     = ['Excellent', 'Good', 'Fair', 'Damaged'];
  const RISK_CLASSES   = ['Low', 'Medium', 'High', 'Critical'];
  const TRAFFIC_LEVELS = ['Light', 'Moderate', 'Heavy', 'Severe'];
  const WEATHER_SEV    = ['Clear', 'Light Rain', 'Heavy Rain', 'Storm', 'Fog'];

  const WAREHOUSES = [
    { id: 'WH-001', name: 'Gaborone Central', lat: -24.653, lon: 25.908 },
    { id: 'WH-002', name: 'Francistown Depot', lat: -21.170, lon: 27.500 },
    { id: 'WH-003', name: 'Palapye Hub',       lat: -22.550, lon: 27.132 },
    { id: 'WH-004', name: 'Maun Gateway',      lat: -19.983, lon: 23.416 },
    { id: 'WH-005', name: 'Lobatse Port',      lat: -25.226, lon: 25.678 },
  ];

  const ROUTES = Array.from({ length: 12 }, (_, i) => `RT-${pad(i + 1)}`);

  function generateRows(n = 200) {
    const rows = [];
    const now = Date.now();

    for (let i = 0; i < n; i++) {
      const wh = pick(WAREHOUSES);
      const riskClass = pick(RISK_CLASSES);
      const disruptionScore = riskClass === 'Critical' ? rand(80, 100) :
                              riskClass === 'High'     ? rand(55, 79)  :
                              riskClass === 'Medium'   ? rand(30, 54)  :
                                                         rand(5, 29);
      const delayProb = parseFloat((disruptionScore / 100 * rand(70, 110, 2) / 100).toFixed(2));
      const fuelRate = rand(8.5, 28.0, 1);
      const capacity = pick([10, 20, 30, 40, 50]);

      rows.push({
        Timestamp:              new Date(now - rand(0, 30 * 24 * 3600 * 1000)).toISOString(),
        Vehicle_ID:             `VH-${pad(rand(1, 50))}`,
        Route_ID:               pick(ROUTES),
        Warehouse_ID:           wh.id,
        Warehouse_Name:         wh.name,
        Vehicle_Capacity:       capacity,
        GPS_Latitude:           parseFloat((wh.lat + rand(-2, 2, 3)).toFixed(4)),
        GPS_Longitude:          parseFloat((wh.lon + rand(-2, 2, 3)).toFixed(4)),
        Traffic_Level:          pick(TRAFFIC_LEVELS),
        ETA_Variation:          rand(-45, 120),
        Fuel_Rate:              fuelRate,
        Weather_Severity:       pick(WEATHER_SEV),
        Loading_Time:           rand(15, 180),
        Order_Status:           pick(ORDER_STATUS),
        Cargo_Condition:        pick(CARGO_COND),
        Driver_Fatigue:         rand(1, 10),
        Route_Risk:             rand(1, 10, 1),
        Delivery_Time_Deviation: rand(-30, 180),
        Disruption_Score:       disruptionScore,
        Delay_Probability:      delayProb,
        Risk_Class:             riskClass,
      });
    }

    return rows.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  }

  const MASTER = generateRows(200);

  function groupBy(rows, key) {
    return rows.reduce((acc, row) => {
      const k = row[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(row);
      return acc;
    }, {});
  }

  function avg(arr, key) {
    if (!arr.length) return 0;
    return parseFloat((arr.reduce((s, r) => s + r[key], 0) / arr.length).toFixed(2));
  }

  function count(arr, key, val) {
    return arr.filter(r => r[key] === val).length;
  }

  function getKPIs() {
    const total  = MASTER.length;
    const delivered = count(MASTER, 'Order_Status', 'Delivered');
    const highRisk  = MASTER.filter(r => ['High', 'Critical'].includes(r.Risk_Class)).length;
    const avgFuel   = avg(MASTER, 'Fuel_Rate');
    const avgDisrupt = avg(MASTER, 'Disruption_Score');
    const activeVehicles = new Set(MASTER.slice(0, 50).map(r => r.Vehicle_ID)).size;

    return {
      total_operations:   total,
      delivery_rate:      parseFloat((delivered / total * 100).toFixed(1)),
      active_vehicles:    activeVehicles,
      avg_fuel_rate:      avgFuel,
      high_risk_count:    highRisk,
      avg_disruption:     avgDisrupt,
    };
  }

  function getRiskDistribution() {
    const byRisk = groupBy(MASTER, 'Risk_Class');
    return RISK_CLASSES.map(rc => ({
      label: rc,
      count: (byRisk[rc] || []).length,
      avg_disruption: avg(byRisk[rc] || [], 'Disruption_Score'),
    }));
  }

  function getFuelByCapacity() {
    const byCapacity = groupBy(MASTER, 'Vehicle_Capacity');
    return Object.keys(byCapacity)
      .sort((a, b) => Number(a) - Number(b))
      .map(cap => ({
        capacity: `${cap}T`,
        avg_fuel: avg(byCapacity[cap], 'Fuel_Rate'),
        count: byCapacity[cap].length,
      }));
  }

  function getTrafficVsETA() {
    const byTraffic = groupBy(MASTER, 'Traffic_Level');
    return ['Light', 'Moderate', 'Heavy', 'Severe'].map(tl => ({
      traffic: tl,
      avg_eta_var: avg(byTraffic[tl] || [], 'ETA_Variation'),
      avg_delay_prob: avg(byTraffic[tl] || [], 'Delay_Probability'),
      count: (byTraffic[tl] || []).length,
    }));
  }

  function getOrderStatusBreakdown() {
    return ORDER_STATUS.map(s => ({
      status: s,
      count: count(MASTER, 'Order_Status', s),
    }));
  }

  function getDisruptionTimeSeries() {
    const days = [];
    const now = Date.now();
    for (let d = 13; d >= 0; d--) {
      const dayStart = now - d * 86400000;
      const dayEnd   = dayStart + 86400000;
      const dayRows  = MASTER.filter(r => {
        const t = new Date(r.Timestamp).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const date = new Date(dayStart);
      days.push({
        date: `${date.getMonth()+1}/${date.getDate()}`,
        avg_disruption: avg(dayRows, 'Disruption_Score'),
        avg_fuel: avg(dayRows, 'Fuel_Rate'),
        count: dayRows.length,
      });
    }
    return days;
  }

  function getWarehousePerf() {
    const byWH = groupBy(MASTER, 'Warehouse_ID');
    return WAREHOUSES.map(wh => {
      const rows = byWH[wh.id] || [];
      return {
        warehouse: wh.name,
        id: wh.id,
        operations: rows.length,
        avg_loading: avg(rows, 'Loading_Time'),
        avg_disruption: avg(rows, 'Disruption_Score'),
        delivery_rate: rows.length ? parseFloat((count(rows, 'Order_Status', 'Delivered') / rows.length * 100).toFixed(1)) : 0,
      };
    });
  }

  function getRecentOperations(n = 20) {
    return MASTER.slice(0, n).map(r => ({
      ...r,
      Timestamp_fmt: new Date(r.Timestamp).toLocaleString('en-ZA', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
    }));
  }

  function getDriverRoutes(vehicleId) {
    const vehRows = MASTER.filter(r => r.Vehicle_ID === vehicleId);
    return vehRows.slice(0, 10);
  }

  function executeQuery(sql) {
    sql = sql.toLowerCase().trim();

    if (sql.includes('fuel_rate') && sql.includes('vehicle_capacity')) {
      return { columns: ['Vehicle_Capacity', 'Avg_Fuel_Rate', 'Count'], rows: getFuelByCapacity().map(r => [r.capacity, r.avg_fuel, r.count]) };
    }
    if (sql.includes('risk_class') || sql.includes('disruption_score')) {
      return { columns: ['Risk_Class', 'Count', 'Avg_Disruption'], rows: getRiskDistribution().map(r => [r.label, r.count, r.avg_disruption]) };
    }
    if (sql.includes('traffic') || sql.includes('eta')) {
      return { columns: ['Traffic_Level', 'Avg_ETA_Var', 'Avg_Delay_Prob'], rows: getTrafficVsETA().map(r => [r.traffic, r.avg_eta_var, r.avg_delay_prob]) };
    }
    if (sql.includes('order_status') || sql.includes('delivered')) {
      return { columns: ['Order_Status', 'Count'], rows: getOrderStatusBreakdown().map(r => [r.status, r.count]) };
    }
    if (sql.includes('warehouse') || sql.includes('loading_time')) {
      return { columns: ['Warehouse', 'Operations', 'Avg_Loading_Time', 'Delivery_Rate%'], rows: getWarehousePerf().map(r => [r.warehouse, r.operations, r.avg_loading, r.delivery_rate]) };
    }
    if (sql.includes('driver_fatigue') || sql.includes('route_risk')) {
      const data = getRiskDistribution();
      return { columns: ['Risk_Class', 'Count', 'Avg_Disruption_Score'], rows: data.map(r => [r.label, r.count, r.avg_disruption]) };
    }
    const recent = getRecentOperations(8);
    return {
      columns: ['Vehicle_ID', 'Route_ID', 'Order_Status', 'Risk_Class', 'Disruption_Score'],
      rows: recent.map(r => [r.Vehicle_ID, r.Route_ID, r.Order_Status, r.Risk_Class, r.Disruption_Score])
    };
  }

  return {
    raw: MASTER,
    getKPIs,
    getRiskDistribution,
    getFuelByCapacity,
    getTrafficVsETA,
    getOrderStatusBreakdown,
    getDisruptionTimeSeries,
    getWarehousePerf,
    getRecentOperations,
    getDriverRoutes,
    executeQuery,
    warehouses: WAREHOUSES,
  };

})();
