"use client";

import type { AppData } from "@/lib/domain";
import { IndianRupee, Receipt, Percent, ShieldCheck } from "lucide-react";

interface PaymentsProps {
  data: AppData;
  activities: any[];
}

export default function Payments({ data, activities }: PaymentsProps) {
  const project = data.projects[0];
  const contractValue = project?.contractValue || 0;

  const netDue = (a: any) => Math.max(0, a.paymentValue + a.paymentValue * a.gstPct / 100 - a.paymentValue * a.retentionPct / 100);

  const totalGross = activities.reduce((s, a) => s + a.paymentValue, 0);
  const totalGst = activities.reduce((s, a) => s + a.paymentValue * a.gstPct / 100, 0);
  const totalRetention = activities.reduce((s, a) => s + a.paymentValue * a.retentionPct / 100, 0);
  const totalNet = activities.reduce((s, a) => s + netDue(a), 0);

  const paidActivities = activities.filter((a) => a.status === "PAID");
  const paidAmount = paidActivities.reduce((s, a) => s + netDue(a), 0);
  const pendingAmount = totalNet - paidAmount;

  return (
    <div className="animate-fade">
      <h2 className="page-title">Payments & Invoices</h2>
      <p className="page-description">Financial overview with GST, retention, and payment tracking</p>

      {/* KPI Row */}
      <div className="kpi-grid" style={{ marginBottom: "var(--sp-6)" }}>
        <div className="kpi-card">
          <div className="kpi-card-icon green"><IndianRupee size={20} /></div>
          <div className="kpi-card-label">Contract Value</div>
          <div className="kpi-card-value">₹{(contractValue / 100000).toFixed(1)}L</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon yellow"><Receipt size={20} /></div>
          <div className="kpi-card-label">Paid Amount</div>
          <div className="kpi-card-value">₹{(paidAmount / 100000).toFixed(1)}L</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon orange"><IndianRupee size={20} /></div>
          <div className="kpi-card-label">Pending Amount</div>
          <div className="kpi-card-value">₹{(pendingAmount / 100000).toFixed(1)}L</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon blue"><ShieldCheck size={20} /></div>
          <div className="kpi-card-label">Retention Held</div>
          <div className="kpi-card-value">₹{(totalRetention / 100000).toFixed(1)}L</div>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="card" style={{ marginBottom: "var(--sp-4)" }}>
        <h3>Payment Progress</h3>
        <div style={{ display: "flex", gap: "var(--sp-6)", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="progress progress-thick" style={{ marginBottom: "var(--sp-2)" }}>
              <span style={{
                width: `${contractValue > 0 ? (paidAmount / contractValue * 100) : 0}%`,
                background: "var(--success)",
              }} />
            </div>
            <div className="row">
              <span className="muted">₹{(paidAmount / 100000).toFixed(1)}L paid</span>
              <span className="muted">₹{(contractValue / 100000).toFixed(1)}L total</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--sp-6)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--success)" }}>
                {paidActivities.length}
              </div>
              <div className="muted">Paid</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--warning)" }}>
                {activities.length - paidActivities.length}
              </div>
              <div className="muted">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="card">
        <h3>Payment Breakdown</h3>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Base Value</th>
                <th>GST</th>
                <th>Retention</th>
                <th>Net Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => {
                const net = netDue(a);
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td>₹{a.paymentValue.toLocaleString("en-IN")}</td>
                    <td>
                      <span className="badge">{a.gstPct}%</span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: "var(--warning-badge)", color: "#B45309" }}>
                        {a.retentionPct}%
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{Math.round(net).toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`badge ${a.status}`}>
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}>
                <td>Total</td>
                <td>₹{totalGross.toLocaleString("en-IN")}</td>
                <td>₹{Math.round(totalGst).toLocaleString("en-IN")}</td>
                <td>₹{Math.round(totalRetention).toLocaleString("en-IN")}</td>
                <td>₹{Math.round(totalNet).toLocaleString("en-IN")}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="muted" style={{ marginTop: "var(--sp-3)" }}>
          Payments are settled outside the app (bank transfer, cheque, or cash). The client submits proof of payment on the Workflow screen, and the contractor confirms receipt before a stage closes.
        </p>
      </div>
    </div>
  );
}
