import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  FileText,
  DollarSign,
  Layers,
  Database,
  Download,
} from 'lucide-react';
import ChartRenderer from './ChartRenderer';

export default function DashboardView({ activeDataset, initialData }) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    fetchDashboard();
  }, [activeDataset, initialData]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      let sid = null;
      try { sid = localStorage.getItem('ai_data_analyst_session_id'); } catch { sid = null; }
      const url = activeDataset ? `/api/dashboard?table_name=${encodeURIComponent(activeDataset)}` : '/api/dashboard';
      const res = await fetch(url, { headers: sid ? { 'X-Session-Id': sid } : {} });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9aa0a6' }}>
        <span>Loading Executive Analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#9aa0a6' }}>
        No dataset loaded. Upload a CSV to view the dashboard.
      </div>
    );
  }

  const { kpis, quality_report, charts } = data;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1000px', margin: '0 auto', overflowY: 'auto' }}>
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f1f3f4' }}>
            Executive Overview: <code style={{ color: '#8ab4f8' }}>{data.table_name}</code>
          </h2>
          <p style={{ color: '#9aa0a6', fontSize: '0.88rem' }}>
            Deterministic statistical summary, completeness score, and automated distributions.
          </p>
        </div>

        <button
          onClick={() => window.open('/api/export-report', '_blank')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '12px',
            backgroundColor: '#1e1f20',
            border: '1px solid #3c4043',
            color: '#8ab4f8',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Download size={15} />
          <span>Download Report</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '28px',
      }}>
        <div style={{ backgroundColor: '#1e1f20', border: '1px solid #282a2c', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9aa0a6', fontSize: '0.82rem', marginBottom: '6px' }}>
            <span>TOTAL RECORDS</span>
            <Layers size={16} color="#8ab4f8" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#f1f3f4' }}>
            {kpis.total_rows.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#81c995', marginTop: '4px' }}>
            Active table loaded
          </div>
        </div>

        <div style={{ backgroundColor: '#1e1f20', border: '1px solid #282a2c', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9aa0a6', fontSize: '0.82rem', marginBottom: '6px' }}>
            <span>COMPLETENESS</span>
            <ShieldCheck size={16} color="#81c995" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#81c995' }}>
            {kpis.completeness_score}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9aa0a6', marginTop: '4px' }}>
            {quality_report.missing_cells} missing cells
          </div>
        </div>

        <div style={{ backgroundColor: '#1e1f20', border: '1px solid #282a2c', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9aa0a6', fontSize: '0.82rem', marginBottom: '6px' }}>
            <span>{(kpis.primary_metric || 'PRIMARY METRIC').toUpperCase()}</span>
            <DollarSign size={16} color="#c58af9" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#c58af9' }}>
            ${(kpis.primary_metric_total ?? kpis.total_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9aa0a6', marginTop: '4px' }}>
            Cumulative {(kpis.primary_metric || 'metric')}
          </div>
        </div>

        <div style={{ backgroundColor: '#1e1f20', border: '1px solid #282a2c', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9aa0a6', fontSize: '0.82rem', marginBottom: '6px' }}>
            <span>{(kpis.secondary_metric || 'SECONDARY METRIC').toUpperCase()}</span>
            <TrendingUp size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#38bdf8' }}>
            ${(kpis.secondary_metric_total ?? kpis.total_profit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9aa0a6', marginTop: '4px' }}>
            {(kpis.secondary_metric || 'Secondary')} aggregated
          </div>
        </div>
      </div>

      {/* Visual Distributions */}
      {charts && charts.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e3e3e3', marginBottom: '14px' }}>
            Automated Metric Breakdowns
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            {charts.map((c, idx) => (
              <div key={idx} style={{ backgroundColor: '#1e1f20', border: '1px solid #282a2c', borderRadius: '16px', padding: '18px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 500, color: '#c4c7c5', marginBottom: '12px' }}>
                  {c.title}
                </h4>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #3c4043', textAlign: 'left', color: '#9aa0a6' }}>
                        <th style={{ padding: '8px' }}>{c.x_key.toUpperCase()}</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>{c.y_key.toUpperCase()}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.data.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid #282a2c' }}>
                          <td style={{ padding: '8px', color: '#f1f3f4' }}>{row[c.x_key]}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#8ab4f8', fontWeight: 500 }}>
                            {typeof row[c.y_key] === 'number' ? Number(row[c.y_key]).toLocaleString(undefined, { minimumFractionDigits: 2 }) : String(row[c.y_key] ?? '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Quality & Hygiene Section */}
      <div style={{ backgroundColor: '#1e1f20', border: '1px solid #282a2c', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="#81c995" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f3f4' }}>
            Data Quality & Hygiene Audit
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#131314', padding: '12px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>DUPLICATE ROWS</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f1f3f4' }}>{quality_report.duplicate_rows}</div>
          </div>
          <div style={{ backgroundColor: '#131314', padding: '12px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>MISSING CELLS</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f1f3f4' }}>{quality_report.missing_cells}</div>
          </div>
          <div style={{ backgroundColor: '#131314', padding: '12px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>COLUMNS ANALYZED</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f1f3f4' }}>{quality_report.column_profiles.length}</div>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.8rem', color: '#9aa0a6', display: 'block', marginBottom: '8px' }}>
            HEALTH FINDINGS:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {quality_report.quality_issues.map((issue, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#c4c7c5',
                backgroundColor: '#17181a',
                padding: '8px 12px',
                borderRadius: '8px',
              }}>
                <AlertTriangle size={14} color="#fdd663" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
