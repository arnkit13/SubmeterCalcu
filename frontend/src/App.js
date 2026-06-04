import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080/api";

function App() {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Data from Backend
  const [tenants, setTenants] = useState([]);
  const [bills, setBills] = useState([]);

  // Form State: Tenants
  const [tenantName, setTenantName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  // Form State: Calculator
  const [calcTenantId, setCalcTenantId] = useState("");
  const [lastMonthKwh, setLastMonthKwh] = useState("");
  const [thisMonthKwh, setThisMonthKwh] = useState("");
  const [billedKwh, setBilledKwh] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [billingMonth, setBillingMonth] = useState("");

  // Invoice Modal State
  const [showInvoice, setShowInvoice] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Initialize Billing Month and load initial data
  useEffect(() => {
    const now = new Date();
    const formattedMonth = now.toLocaleDateString("en-PH", {
      month: "long",
      year: "numeric",
    });
    setBillingMonth(formattedMonth);
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show auto-dismiss alerts
  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 6000);
  };

  // Fetch Tenants from Spring Boot API
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/tenants`);
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
        setIsOnline(true);
      } else {
        throw new Error("Failed to reach API server");
      }
    } catch (err) {
      setIsOnline(false);
      triggerAlert("error", "API Server Offline: Verify Spring Boot is running on port 8080.");
    } finally {
      setLoading(false);
    }
  };

  // Register New Tenant
  const handleRegisterTenant = async (e) => {
    e.preventDefault();
    if (!tenantName.trim() || !roomNumber.trim()) {
      triggerAlert("error", "Tenant name and room number are required.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tenantName, roomNumber }),
      });
      if (response.ok) {
        setTenantName("");
        setRoomNumber("");
        triggerAlert("success", "Tenant registered successfully!");
        fetchTenants();
      } else {
        const err = await response.json();
        throw new Error(err.message || "Failed to create tenant");
      }
    } catch (err) {
      triggerAlert("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async (id) => {
    if (!window.confirm("Delete this tenant profile, along with all their readings and generated bills?")) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/tenants/${id}`, { method: "DELETE" });
      if (response.ok) {
        triggerAlert("success", "Tenant profile deleted.");
        if (calcTenantId === String(id)) {
          setCalcTenantId("");
          setLastMonthKwh("");
          setBills([]);
        }
        fetchTenants();
      } else {
        throw new Error("Unable to delete tenant.");
      }
    } catch (err) {
      triggerAlert("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // When selected tenant to calculate changes
  const handleTenantSelection = async (tenantId) => {
    setCalcTenantId(tenantId);
    setLastMonthKwh("");
    setThisMonthKwh("");
    setBills([]);

    if (!tenantId) return;

    // 1. Prefill Last Month Reading by fetching latest reading from API
    try {
      const readingResponse = await fetch(`${API_BASE}/readings/tenant/${tenantId}/latest`);
      if (readingResponse.ok) {
        const readingData = await readingResponse.json();
        setLastMonthKwh(readingData.currentReading);
      } else if (readingResponse.status === 404) {
        setLastMonthKwh("0"); // start from 0 if no readings logged yet
      }
    } catch (err) {
      console.error("Latest reading fetch failed:", err);
      triggerAlert("error", "Unable to pull latest reading from database.");
    }

    // 2. Fetch past generated bills for this tenant
    try {
      const billsResponse = await fetch(`${API_BASE}/bills/tenant/${tenantId}`);
      if (billsResponse.ok) {
        const billsData = await billsResponse.json();
        setBills(billsData);
      }
    } catch (err) {
      console.error("Failed to load bills:", err);
    }
  };

  // Calculate & Save Reading and Bill
  const handleCalculateAndSave = async (e) => {
    e.preventDefault();
    if (!calcTenantId || lastMonthKwh === "" || thisMonthKwh === "" || !billedKwh || !totalSales || !billingMonth) {
      triggerAlert("error", "Please fill in all calculator inputs.");
      return;
    }

    const last = parseFloat(lastMonthKwh);
    const current = parseFloat(thisMonthKwh);
    const mainKwh = parseFloat(billedKwh);
    const sales = parseFloat(totalSales);

    if (current < last) {
      triggerAlert("error", "Current month reading must be greater than or equal to last month.");
      return;
    }
    if (mainKwh <= 0) {
      triggerAlert("error", "Total billed kWh must be greater than 0.");
      return;
    }

    setLoading(true);
    try {
      // Step A: Save the new Meter Reading log to database
      const readingRes = await fetch(`${API_BASE}/readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: parseInt(calcTenantId),
          previousReading: last,
          currentReading: current,
          readingDate: new Date().toISOString().substring(0, 10),
        }),
      });

      if (!readingRes.ok) {
        const err = await readingRes.json();
        throw new Error(err.message || "Failed to log meter reading");
      }

      // Step B: Calculate rate per kWh and Save generated Bill to database
      const ratePerKwh = sales / mainKwh;
      const billRes = await fetch(`${API_BASE}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: parseInt(calcTenantId),
          ratePerUnit: ratePerKwh,
          billingMonth: billingMonth.trim(),
        }),
      });

      if (billRes.ok) {
        triggerAlert("success", "Calculation saved and bill generated!");
        // Clear this month input
        setThisMonthKwh("");
        // Reload details for this selected tenant
        handleTenantSelection(calcTenantId);
      } else {
        const err = await billRes.json();
        throw new Error(err.message || "Failed to generate bill.");
      }
    } catch (err) {
      triggerAlert("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInvoice = (bill) => {
    setActiveInvoice(bill);
    setShowInvoice(true);
  };

  const formatPHP = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);

  return (
    <div className="app-wrapper">
      <div className="calculator-container">
        
        {/* Header */}
        <header className="calc-header">
          <div className="calc-title">
            <h1>⚡ Submeter Billing Calculator</h1>
            <p>Register accounts, calculate consumption, and generate receipts in one place.</p>
          </div>
          <div className="api-status">
            <span className={`status-dot ${isOnline ? "online" : "offline"}`}></span>
            Server: {isOnline ? "Online" : "Offline"}
          </div>
        </header>

        {/* Alerts Callout */}
        {alert && (
          <div className={`alert-banner ${alert.type}`}>
            <span>{alert.type === "success" ? "✓" : "⚠"}</span>
            <p>{alert.message}</p>
          </div>
        )}

        {/* Global Loading Spinner */}
        {loading && <div className="spinner" />}

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
              <button type="submit" className="btn btn-primary">
                Add Tenant Account
              </button>
            </form>

            {/* Quick Profiles Table */}
            <div className="table-responsive" style={{ maxHeight: "250px", overflowY: "auto" }}>
              {tenants.length === 0 ? (
                <div className="empty-state">No tenant accounts added yet.</div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Room</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr
                        key={t.id}
                        className={`tenant-row ${calcTenantId === String(t.id) ? "active" : ""}`}
                        onClick={() => handleTenantSelection(String(t.id))}
                      >
                        <td><strong>{t.name}</strong></td>
                        <td><span className="badge badge-info">{t.roomNumber}</span></td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid selecting row on delete
                              handleDeleteTenant(t.id);
                            }}
                            style={{ padding: "0.2rem 0.5rem" }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
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
                    <th>Consumption (kWh)</th>
                    <th>Calculated Rate per kWh</th>
                    <th>Gross Total Bill</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.billingMonth}</strong></td>
                      <td>{b.consumption} kWh</td>
                      <td>₱{b.ratePerUnit.toFixed(4)}/kWh</td>
                      <td><strong>{formatPHP(b.totalAmount)}</strong></td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenInvoice(b)}
                        >
                          Print Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
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
              <h3 className="modal-title">Submeter Receipt Preview</h3>
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
                    <h2>ELECTRICITY INVOICE</h2>
                    <p>Submeter billing calculation record</p>
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
                      <strong>Room Number:</strong> {tenants.find(t => t.id === activeInvoice.tenantId)?.roomNumber || "N/A"}<br />
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h4 className="invoice-section-title">Authority Reference:</h4>
                    <p className="invoice-text">
                      <strong>Submeter Administrator</strong><br />
                      <strong>Date Billed:</strong> {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Billing Item Breakdown</th>
                      <th className="text-right">Consumption</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Calculated Electricity Usage</strong><br />
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          Charges based on calculated kWh consumption
                        </span>
                      </td>
                      <td className="text-right">{activeInvoice.consumption} kWh</td>
                      <td className="text-right">₱{activeInvoice.ratePerUnit.toFixed(4)}/kWh</td>
                      <td className="text-right">{formatPHP(activeInvoice.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="invoice-total-section">
                  <div className="invoice-total-box">
                    <div className="invoice-total-row">
                      <span>Submeter Subtotal:</span>
                      <span>{formatPHP(activeInvoice.totalAmount)}</span>
                    </div>
                    <div className="invoice-total-row">
                      <span>Balance Due:</span>
                      <span>{formatPHP(activeInvoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <footer className="invoice-footer">
                  <p>Thank you for your prompt payment!</p>
                  <p style={{ marginTop: "0.25rem", fontSize: "0.7rem" }}>Generated electronically by Submeter Billing Manager</p>
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
    </div>
  );
}

export default App;