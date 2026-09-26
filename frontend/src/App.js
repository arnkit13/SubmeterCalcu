import React, { useState, useEffect, useMemo, useRef } from "react";
import "./App.css";

function App() {
  const isOnline = true;
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // === Persistent Data from LocalStorage ===
  const [tenants, setTenants] = useState(() => {
    const saved = localStorage.getItem("submeter_tenants");
    return saved ? JSON.parse(saved) : [
      { id: 1, name: "John Doe", roomNumber: "Room 101" },
      { id: 2, name: "Jane Smith", roomNumber: "Room 102" }
    ];
  });

  const [allBills, setAllBills] = useState(() => {
    const saved = localStorage.getItem("submeter_bills");
    return saved ? JSON.parse(saved) : [];
  });

  const [allReadings, setAllReadings] = useState(() => {
    const saved = localStorage.getItem("submeter_readings");
    return saved ? JSON.parse(saved) : [];
  });

  // Filtered bills for selected tenant
  const [bills, setBills] = useState([]);

  // Form State: Tenants
  const [tenantName, setTenantName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [initialKwh, setInitialKwh] = useState("");

  // Form State: Calculator
  const [calcTenantId, setCalcTenantId] = useState("");
  const [lastMonthKwh, setLastMonthKwh] = useState("");
  const [thisMonthKwh, setThisMonthKwh] = useState("");
  const [billingMonth, setBillingMonth] = useState("");

  // Rate Calculation Mode: 'meralco' (from utility bill) or 'direct' (direct rate per kWh)
  const [rateMode, setRateMode] = useState("meralco");
  const [billedKwh, setBilledKwh] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [directRate, setDirectRate] = useState("");

  // Modal States
  const [showInvoice, setShowInvoice] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // File input ref for restore
  const fileInputRef = useRef(null);

  // Initialize Billing Month
  useEffect(() => {
    const now = new Date();
    const formattedMonth = now.toLocaleDateString("en-PH", {
      month: "long",
      year: "numeric",
    });
    setBillingMonth(formattedMonth);
  }, []);

  // Show auto-dismiss alerts
  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Helper to format currency
  const formatPHP = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);

  // Helper to get a tenant's latest kilowatt meter reading
  const getTenantLatestKwh = (tenantId) => {
    const tenantReadings = allReadings.filter(r => r.tenantId === parseInt(tenantId));
    if (tenantReadings.length > 0) {
      return tenantReadings[tenantReadings.length - 1].currentReading;
    }
    return 0;
  };

  // Synchronize filtered bills whenever selected tenant or allBills change
  useEffect(() => {
    if (calcTenantId) {
      const filtered = allBills.filter(b => b.tenantId === parseInt(calcTenantId));
      setBills(filtered);
    } else {
      setBills([]);
    }
  }, [calcTenantId, allBills]);

  // Real-time calculations for live preview
  const liveCalculation = useMemo(() => {
    const last = parseFloat(lastMonthKwh) || 0;
    const current = parseFloat(thisMonthKwh) || 0;
    const consumptionKwh = Math.max(0, current - last);

    let effectiveRate = 0;
    if (rateMode === "meralco") {
      const mainKwh = parseFloat(billedKwh) || 0;
      const sales = parseFloat(totalSales) || 0;
      effectiveRate = mainKwh > 0 ? (sales / mainKwh) : 0;
    } else {
      effectiveRate = parseFloat(directRate) || 0;
    }

    const estimatedTotal = consumptionKwh * effectiveRate;
    const isHigherRate = effectiveRate >= 13.0; // Flag higher rate (above typical ₱12-13/kWh baseline)

    return {
      consumptionKwh,
      effectiveRate,
      estimatedTotal,
      isHigherRate,
    };
  }, [lastMonthKwh, thisMonthKwh, rateMode, billedKwh, totalSales, directRate]);

  // Register New Tenant
  const handleRegisterTenant = (e) => {
    e.preventDefault();
    if (!tenantName.trim() || !roomNumber.trim()) {
      triggerAlert("error", "Tenant name and room number are required.");
      return;
    }

    const newTenantId = Date.now();
    const newTenant = {
      id: newTenantId,
      name: tenantName.trim(),
      roomNumber: roomNumber.trim()
    };

    const updatedTenants = [...tenants, newTenant];
    setTenants(updatedTenants);
    localStorage.setItem("submeter_tenants", JSON.stringify(updatedTenants));

    // If starting meter reading was provided, log it as initial reading
    if (initialKwh && !isNaN(parseFloat(initialKwh))) {
      const startReading = {
        id: Date.now() + 1,
        tenantId: newTenantId,
        previousReading: 0,
        currentReading: parseFloat(initialKwh),
        readingDate: new Date().toISOString().substring(0, 10),
      };
      const updatedReadings = [...allReadings, startReading];
      setAllReadings(updatedReadings);
      localStorage.setItem("submeter_readings", JSON.stringify(updatedReadings));
    }

    setTenantName("");
    setRoomNumber("");
    setInitialKwh("");
    triggerAlert("success", `Tenant "${newTenant.name}" registered successfully!`);
  };

  // Delete Tenant
  const handleDeleteTenant = (id) => {
    if (!window.confirm("Delete this tenant profile, along with all their readings and generated bills?")) {
      return;
    }
    const updatedTenants = tenants.filter(t => t.id !== id);
    setTenants(updatedTenants);
    localStorage.setItem("submeter_tenants", JSON.stringify(updatedTenants));

    const updatedBills = allBills.filter(b => b.tenantId !== id);
    setAllBills(updatedBills);
    localStorage.setItem("submeter_bills", JSON.stringify(updatedBills));

    const updatedReadings = allReadings.filter(r => r.tenantId !== id);
    setAllReadings(updatedReadings);
    localStorage.setItem("submeter_readings", JSON.stringify(updatedReadings));

    if (calcTenantId === String(id)) {
      setCalcTenantId("");
      setLastMonthKwh("");
      setBills([]);
    }
    triggerAlert("success", "Tenant profile deleted.");
  };

  // When selected tenant to calculate changes
  const handleTenantSelection = (tenantId) => {
    setCalcTenantId(tenantId);
    setLastMonthKwh("");
    setThisMonthKwh("");

    if (!tenantId) return;

    // Load latest reading for this tenant
    const tenantReadings = allReadings.filter(r => r.tenantId === parseInt(tenantId));
    if (tenantReadings.length > 0) {
      const latestReading = tenantReadings[tenantReadings.length - 1];
      setLastMonthKwh(latestReading.currentReading);
    } else {
      setLastMonthKwh("0");
    }
  };

  // Calculate & Save Reading and Bill
  const handleCalculateAndSave = (e) => {
    e.preventDefault();
    if (!calcTenantId || lastMonthKwh === "" || thisMonthKwh === "" || !billingMonth) {
      triggerAlert("error", "Please fill in all calculator inputs.");
      return;
    }

    const last = parseFloat(lastMonthKwh);
    const current = parseFloat(thisMonthKwh);

    if (current < last) {
      triggerAlert("error", "Current month reading must be greater than or equal to last month reading.");
      return;
    }

    let ratePerKwh = 0;
    if (rateMode === "meralco") {
      const mainKwh = parseFloat(billedKwh);
      const sales = parseFloat(totalSales);
      if (!billedKwh || mainKwh <= 0) {
        triggerAlert("error", "Total billed kWh from utility bill must be greater than 0.");
        return;
      }
      if (!totalSales || sales <= 0) {
        triggerAlert("error", "Total sales amount must be greater than 0.");
        return;
      }
      ratePerKwh = sales / mainKwh;
    } else {
      const direct = parseFloat(directRate);
      if (!directRate || direct <= 0) {
        triggerAlert("error", "Please provide a valid electricity rate per kilowatt (₱/kWh).");
        return;
      }
      ratePerKwh = direct;
    }

    setLoading(true);
    try {
      const consumption = current - last;
      const totalAmount = consumption * ratePerKwh;
      const tenantIdNum = parseInt(calcTenantId);
      const selectedTenant = tenants.find(t => t.id === tenantIdNum);

      // 1. Save Reading
      const newReading = {
        id: Date.now(),
        tenantId: tenantIdNum,
        previousReading: last,
        currentReading: current,
        readingDate: new Date().toISOString().substring(0, 10),
      };
      const updatedReadings = [...allReadings, newReading];
      setAllReadings(updatedReadings);
      localStorage.setItem("submeter_readings", JSON.stringify(updatedReadings));

      // 2. Save Bill (with complete kilowatt and rate breakdown, fully backward compatible)
      const newBill = {
        id: Date.now() + 1,
        tenantId: tenantIdNum,
        tenantName: selectedTenant ? selectedTenant.name : "N/A",
        roomNumber: selectedTenant ? selectedTenant.roomNumber : "N/A",
        previousReading: last,
        currentReading: current,
        consumption: consumption, // Kilowatt (kWh) consumed
        ratePerUnit: ratePerKwh,   // Rate per kilowatt
        totalAmount: totalAmount,
        billingMonth: billingMonth.trim(),
        rateMode: rateMode,
        billedKwh: rateMode === "meralco" ? parseFloat(billedKwh) : null,
        totalSales: rateMode === "meralco" ? parseFloat(totalSales) : null,
        createdAt: new Date().toISOString(),
      };

      const updatedBills = [...allBills, newBill];
      setAllBills(updatedBills);
      localStorage.setItem("submeter_bills", JSON.stringify(updatedBills));

      triggerAlert("success", `Bill saved! ${consumption.toFixed(2)} kWh calculated at ₱${ratePerKwh.toFixed(4)}/kWh.`);
      setThisMonthKwh("");
      setLastMonthKwh(current); // Next month's previous reading is now this reading
    } catch (err) {
      triggerAlert("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete a specific bill
  const handleDeleteBill = (billId) => {
    if (!window.confirm("Delete this saved bill record?")) {
      return;
    }
    const updatedBills = allBills.filter(b => b.id !== billId);
    setAllBills(updatedBills);
    localStorage.setItem("submeter_bills", JSON.stringify(updatedBills));
    triggerAlert("success", "Bill record removed.");
  };

  // Open invoice modal
  const handleOpenInvoice = (bill) => {
    setActiveInvoice(bill);
    setShowInvoice(true);
  };

  // Export Data to JSON file (Backup)
  const handleExportBackup = () => {
    const backupData = {
      version: 2,
      exportDate: new Date().toISOString(),
      tenants,
      readings: allReadings,
      bills: allBills,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().substring(0, 10);
    link.href = url;
    link.download = `submeter_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerAlert("success", "Backup file downloaded successfully! Your data is safe.");
  };

  // Import Data from JSON file (Restore)
  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.tenants || !Array.isArray(imported.tenants)) {
          throw new Error("Invalid backup format: missing tenants array.");
        }

        if (!window.confirm(`Restore ${imported.tenants.length} tenants and their bills? This will safely merge or update your current data.`)) {
          return;
        }

        // Save imported data
        localStorage.setItem("submeter_tenants", JSON.stringify(imported.tenants));
        setTenants(imported.tenants);

        if (Array.isArray(imported.bills)) {
          localStorage.setItem("submeter_bills", JSON.stringify(imported.bills));
          setAllBills(imported.bills);
        }

        if (Array.isArray(imported.readings)) {
          localStorage.setItem("submeter_readings", JSON.stringify(imported.readings));
          setAllReadings(imported.readings);
        }

        setShowBackupModal(false);
        triggerAlert("success", "Data restored successfully!");
      } catch (err) {
        triggerAlert("error", `Failed to restore data: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  // KPI calculations
  const totalAllTimeKwh = useMemo(() => {
    return allBills.reduce((sum, b) => sum + (parseFloat(b.consumption) || 0), 0);
  }, [allBills]);

  const totalAllTimeSales = useMemo(() => {
    return allBills.reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);
  }, [allBills]);

  const latestRateDisplay = useMemo(() => {
    if (allBills.length > 0) {
      return allBills[allBills.length - 1].ratePerUnit;
    }
    return liveCalculation.effectiveRate > 0 ? liveCalculation.effectiveRate : 15.0;
  }, [allBills, liveCalculation.effectiveRate]);

  return (
    <div className="app-wrapper">
      <div className="calculator-container">
        
        {/* Header */}
        <header className="calc-header">
          <div className="calc-title">
            <h1>⚡ Submeter Billing Calculator</h1>
            <p>Register accounts, track kilowatt consumption, and calculate electricity bills.</p>
          </div>
          <div className="header-actions">
            <button 
              type="button" 
              className="btn-ghost" 
              onClick={() => setShowBackupModal(true)}
              title="Backup or restore your submeter data"
            >
              💾 Backup & Data
            </button>
            <div className="api-status">
              <span className={`status-dot ${isOnline ? "online" : "offline"}`}></span>
              Server: {isOnline ? "Online" : "Offline"}
            </div>
          </div>
        </header>

        {/* Alerts Banner */}
        {alert && (
          <div className={`alert-banner ${alert.type}`}>
            <span>{alert.type === "success" ? "✓" : "⚠"}</span>
            <p>{alert.message}</p>
          </div>
        )}

        {/* Global Loading Spinner */}
        {loading && <div className="spinner" />}

        {/* Quick KPI Overview Cards */}
        <div className="kpi-summary-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">👥</div>
            <div className="kpi-info">
              <span className="kpi-label">Active Tenants</span>
              <span className="kpi-value">{tenants.length}</span>
              <span className="kpi-sub">Registered accounts</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon yellow">⚡</div>
            <div className="kpi-info">
              <span className="kpi-label">Total Kilowatts Billed</span>
              <span className="kpi-value">{totalAllTimeKwh.toFixed(1)} <small style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>kWh</small></span>
              <span className="kpi-sub">Total submeter usage</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon purple">📈</div>
            <div className="kpi-info">
              <span className="kpi-label">Electricity Rate</span>
              <span className="kpi-value">₱{latestRateDisplay.toFixed(2)} <small style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/kWh</small></span>
              <span className="kpi-sub">{latestRateDisplay >= 13 ? "Higher rate in effect" : "Standard rate"}</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon emerald">💵</div>
            <div className="kpi-info">
              <span className="kpi-label">Total Billed Revenue</span>
              <span className="kpi-value">{formatPHP(totalAllTimeSales)}</span>
              <span className="kpi-sub">{allBills.length} invoices generated</span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid Setup */}
        <div className="calc-grid">
          
          {/* Column 1: Add User Profile */}
          <div className="section-box">
            <h2 className="section-title">
              <span>👤</span> 1. Register Tenant
            </h2>
            <form onSubmit={handleRegisterTenant}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Room / Unit No.</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Room 101"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Submeter Reading (kWh) <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>(Optional)</span></label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={initialKwh}
                  onChange={(e) => setInitialKwh(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Add Tenant Account
              </button>
            </form>

            {/* Quick Profiles Table with Kilowatt Reading Display */}
            <div className="table-responsive" style={{ maxHeight: "280px", overflowY: "auto" }}>
              {tenants.length === 0 ? (
                <div className="empty-state">No tenant accounts added yet.</div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Room</th>
                      <th>Latest Meter</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const latestKwh = getTenantLatestKwh(t.id);
                      return (
                        <tr
                          key={t.id}
                          className={`tenant-row ${calcTenantId === String(t.id) ? "active" : ""}`}
                          onClick={() => handleTenantSelection(String(t.id))}
                          title="Click to select this tenant for calculation"
                        >
                          <td><strong>{t.name}</strong></td>
                          <td><span className="badge badge-info">{t.roomNumber}</span></td>
                          <td>
                            <span className="kwh-badge">
                              ⚡ {latestKwh.toFixed(2)} kWh
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTenant(t.id);
                              }}
                              style={{ padding: "0.2rem 0.5rem" }}
                              title="Delete tenant"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Column 2: Calculator */}
          <div className="section-box">
            <h2 className="section-title">
              <span>🧮</span> 2. Calculate Bills
            </h2>
            <form onSubmit={handleCalculateAndSave}>
              <div className="form-group">
                <label className="form-label">Whose account will I calculate?</label>
                <select
                  className="form-control"
                  value={calcTenantId}
                  onChange={(e) => handleTenantSelection(e.target.value)}
                  required
                >
                  <option value="">-- Choose Tenant --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.roomNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Submeter Readings: Last Month vs This Month */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Last Month Reading (kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={lastMonthKwh}
                    onChange={(e) => setLastMonthKwh(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">This Month Reading (kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={thisMonthKwh}
                    onChange={(e) => setThisMonthKwh(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Rate Mode Selector: Utility Bill vs Direct Rate */}
              <div className="form-group">
                <label className="form-label">Electricity Rate Method</label>
                <div className="rate-mode-wrapper">
                  <button
                    type="button"
                    className={`rate-mode-tab ${rateMode === "meralco" ? "active" : ""}`}
                    onClick={() => setRateMode("meralco")}
                  >
                    🏢 Utility Bill (Meralco)
                  </button>
                  <button
                    type="button"
                    className={`rate-mode-tab ${rateMode === "direct" ? "active" : ""}`}
                    onClick={() => {
                      setRateMode("direct");
                      if (liveCalculation.effectiveRate > 0 && !directRate) {
                        setDirectRate(liveCalculation.effectiveRate.toFixed(4));
                      }
                    }}
                  >
                    ⚡ Direct Rate per kWh
                  </button>
                </div>
              </div>

              {rateMode === "meralco" ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Total Billed kWh (Meralco)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="e.g. 500"
                        value={billedKwh}
                        onChange={(e) => setBilledKwh(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Sales / Gross Amount (₱)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="e.g. 7500"
                        value={totalSales}
                        onChange={(e) => setTotalSales(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <p className="rate-hint">
                    Computes rate as: Total Amount ÷ Total Billed kWh
                  </p>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Electricity Rate per Kilowatt (₱/kWh)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    placeholder="e.g. 15.5000"
                    value={directRate}
                    onChange={(e) => setDirectRate(e.target.value)}
                    required
                  />
                  <p className="rate-hint">
                    Use this when electricity is higher today or when using a set kilowatt rate.
                  </p>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Billing Month</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. June 2026"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  required
                />
              </div>

              {/* Real-Time Live Calculation & Kilowatt Breakdown Box */}
              <div className="live-breakdown-box">
                <div className="live-breakdown-head">
                  <h4>⚡ Live Kilowatt & Bill Preview</h4>
                  {liveCalculation.isHigherRate && (
                    <span className="high-rate-pill">
                      🔥 Higher Rate: ₱{liveCalculation.effectiveRate.toFixed(2)}/kWh
                    </span>
                  )}
                </div>

                <div className="live-metrics-row">
                  <div className="live-metric-item">
                    <span className="live-metric-title">Kilowatt Consumed</span>
                    <span className="live-metric-num highlight-kwh">
                      {liveCalculation.consumptionKwh.toFixed(2)} <small>kWh</small>
                    </span>
                    <span className="live-metric-sub">
                      {thisMonthKwh && lastMonthKwh ? `(${thisMonthKwh} - ${lastMonthKwh})` : "Current - Last"}
                    </span>
                  </div>

                  <div className="live-metric-item">
                    <span className="live-metric-title">Electricity Rate</span>
                    <span className="live-metric-num">
                      ₱{liveCalculation.effectiveRate.toFixed(4)} <small>/kWh</small>
                    </span>
                    <span className="live-metric-sub">
                      {rateMode === "meralco" ? "From utility bill" : "Direct rate applied"}
                    </span>
                  </div>

                  <div className="live-metric-item">
                    <span className="live-metric-title">Estimated Total</span>
                    <span className="live-metric-num highlight-cost">
                      {formatPHP(liveCalculation.estimatedTotal)}
                    </span>
                    <span className="live-metric-sub">
                      {liveCalculation.consumptionKwh.toFixed(2)} kWh × ₱{liveCalculation.effectiveRate.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                Calculate & Save Invoice
              </button>
            </form>
          </div>

        </div>

        {/* History Section at the Bottom */}
        <div className="section-box" style={{ width: "100%" }}>
          <h2 className="section-title">
            <span>📋</span> 3. History for {tenants.find(t => String(t.id) === calcTenantId) ? `${tenants.find(t => String(t.id) === calcTenantId).name} (${tenants.find(t => String(t.id) === calcTenantId).roomNumber})` : "Selected Profile"}
          </h2>
          {!calcTenantId ? (
            <div className="empty-state">
              Please choose a tenant account above to review past calculations and invoices.
            </div>
          ) : bills.length === 0 ? (
            <div className="empty-state">
              No bills registered yet for this tenant. Log readings and press Calculate to generate one!
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Billing Month</th>
                    <th>Previous Reading</th>
                    <th>Current Reading</th>
                    <th>Kilowatts Used</th>
                    <th>Rate per kWh</th>
                    <th>Total Bill</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => {
                    const prevReadingVal = b.previousReading !== undefined ? `${b.previousReading} kWh` : "—";
                    const currReadingVal = b.currentReading !== undefined ? `${b.currentReading} kWh` : "—";
                    return (
                      <tr key={b.id}>
                        <td><strong>{b.billingMonth}</strong></td>
                        <td><span className="meter-history-tag">{prevReadingVal}</span></td>
                        <td><span className="meter-history-tag">{currReadingVal}</span></td>
                        <td>
                          <span className="kwh-badge">
                            ⚡ {Number(b.consumption).toFixed(2)} kWh
                          </span>
                        </td>
                        <td>
                          <span className="rate-badge">
                            ₱{Number(b.ratePerUnit).toFixed(4)}/kWh
                          </span>
                        </td>
                        <td><strong>{formatPHP(b.totalAmount)}</strong></td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenInvoice(b)}
                            style={{ marginRight: "0.5rem" }}
                          >
                            Print Receipt
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteBill(b.id)}
                            title="Delete this bill"
                            style={{ padding: "0.3rem 0.6rem" }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Invoice Modal Receipt Overlay */}
      {showInvoice && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-card">
            <header className="modal-header">
              <h3 className="modal-title">Submeter Electricity Receipt</h3>
              <button
                className="close-button"
                onClick={() => setShowInvoice(false)}
              >
                ×
              </button>
            </header>
            <div className="modal-body">
              <div className="invoice-sheet" id="invoice-sheet">
                
                <div className="invoice-header">
                  <div className="invoice-brand">
                    <h2>⚡ ELECTRICITY INVOICE</h2>
                    <p>Submeter Kilowatt Reading & Billing Statement</p>
                  </div>
                  <div className="invoice-meta">
                    <h3>BILL RECEIPT</h3>
                    <p><strong>Month:</strong> {activeInvoice.billingMonth}</p>
                    <p><strong>Invoice ID:</strong> #{activeInvoice.id}</p>
                  </div>
                </div>

                <div className="invoice-details-grid">
                  <div>
                    <h4 className="invoice-section-title">Tenant Details:</h4>
                    <p className="invoice-text">
                      <strong>Name:</strong> {activeInvoice.tenantName}<br />
                      <strong>Room Number:</strong> {tenants.find(t => t.id === activeInvoice.tenantId)?.roomNumber || activeInvoice.roomNumber || "N/A"}<br />
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h4 className="invoice-section-title">Billing Authority:</h4>
                    <p className="invoice-text">
                      <strong>Submeter Administrator</strong><br />
                      <strong>Date Billed:</strong> {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Submeter Meter Reading Breakdown Boxes */}
                <h4 className="invoice-section-title" style={{ marginTop: "1rem" }}>
                  Meter Reading Breakdown (Kilowatts)
                </h4>
                <div className="invoice-meter-boxes">
                  <div className="invoice-meter-card">
                    <div className="invoice-meter-label">Previous Reading</div>
                    <div className="invoice-meter-value">
                      {activeInvoice.previousReading !== undefined ? `${activeInvoice.previousReading} kWh` : "—"}
                    </div>
                  </div>
                  <div className="invoice-meter-card">
                    <div className="invoice-meter-label">Present Reading</div>
                    <div className="invoice-meter-value">
                      {activeInvoice.currentReading !== undefined ? `${activeInvoice.currentReading} kWh` : "—"}
                    </div>
                  </div>
                  <div className="invoice-meter-card featured">
                    <div className="invoice-meter-label">Kilowatts Consumed</div>
                    <div className="invoice-meter-value">
                      ⚡ {Number(activeInvoice.consumption).toFixed(2)} kWh
                    </div>
                  </div>
                </div>

                {/* Electricity Rate Notice if higher */}
                {activeInvoice.ratePerUnit >= 13 && (
                  <div className="invoice-note-box">
                    <strong>Notice on Current Electricity Rates:</strong> Electricity utility rates are higher for this billing period (₱{Number(activeInvoice.ratePerUnit).toFixed(4)}/kWh). Charges are based on exact kilowatt-hours consumed.
                  </div>
                )}

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Billing Item Breakdown</th>
                      <th className="text-right">Kilowatts</th>
                      <th className="text-right">Rate per kWh</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Calculated Submeter Electricity Usage</strong><br />
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          Charges based on verified kilowatt-hour (kWh) submeter consumption
                          {activeInvoice.billedKwh ? ` (Utility Reference: ${activeInvoice.billedKwh} kWh total billed)` : ""}
                        </span>
                      </td>
                      <td className="text-right">{Number(activeInvoice.consumption).toFixed(2)} kWh</td>
                      <td className="text-right">₱{Number(activeInvoice.ratePerUnit).toFixed(4)}</td>
                      <td className="text-right">{formatPHP(activeInvoice.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="invoice-total-section">
                  <div className="invoice-total-box">
                    <div className="invoice-total-row">
                      <span>Total Kilowatts:</span>
                      <span><strong>{Number(activeInvoice.consumption).toFixed(2)} kWh</strong></span>
                    </div>
                    <div className="invoice-total-row">
                      <span>Rate per Kilowatt:</span>
                      <span>₱{Number(activeInvoice.ratePerUnit).toFixed(4)}/kWh</span>
                    </div>
                    <div className="invoice-total-row">
                      <span>Balance Due:</span>
                      <span>{formatPHP(activeInvoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <footer className="invoice-footer">
                  <p>Thank you for your prompt payment!</p>
                  <p style={{ marginTop: "0.25rem", fontSize: "0.7rem" }}>
                    Generated electronically by Submeter Billing Manager • Kilowatt tracking verified
                  </p>
                </footer>

              </div>
            </div>
            <footer className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setShowInvoice(false)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                Print Receipt
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Backup & Restore Data Modal */}
      {showBackupModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <header className="modal-header">
              <h3 className="modal-title">💾 Backup & Restore Data</h3>
              <button
                className="close-button"
                onClick={() => setShowBackupModal(false)}
              >
                ×
              </button>
            </header>
            <div className="modal-body">
              <div className="backup-section">
                
                <div className="backup-card">
                  <h4>📥 Download Data Backup</h4>
                  <p>
                    Download a secure JSON backup of all your tenant profiles, kilowatt meter readings, and billing history to keep on your computer.
                  </p>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleExportBackup}
                  >
                    Download Backup File (.json)
                  </button>
                </div>

                <div className="backup-card">
                  <h4>📤 Restore from Backup</h4>
                  <p>
                    Load a previously saved backup file. This will restore all your tenants, past readings, and invoices safely.
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImportBackup}
                    style={{ display: "none" }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  >
                    Choose Backup File to Restore
                  </button>
                </div>

              </div>
            </div>
            <footer className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setShowBackupModal(false)}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;