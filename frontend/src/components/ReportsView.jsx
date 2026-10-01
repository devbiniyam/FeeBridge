import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportService } from '../services/api';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Wallet,
  CreditCard,
  Building,
  GraduationCap,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Copy,
  Check,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  Sparkles,
  PieChart
} from 'lucide-react';

export default function ReportsView({ onNavigateBack, onNavigateToInvoices }) {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';

  // Active Tab: 'overview' | 'grades' | 'channels' | 'ledger'
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [summaryData, setSummaryData] = useState(null);
  const [gradeData, setGradeData] = useState([]);
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters for ledger
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Copy feedback state
  const [copiedId, setCopiedId] = useState(null);

  // Fetch all reports
  const fetchAllReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, gradeRes, ledgerRes] = await Promise.all([
        reportService.getFinancialSummary(),
        reportService.getGradeBreakdown(),
        reportService.getAuditLedger({
          search: searchTerm,
          method: selectedMethod,
          from_date: fromDate,
          to_date: toDate,
        }),
      ]);

      setSummaryData(summaryRes);
      setGradeData(gradeRes.grades || []);
      setLedgerData(ledgerRes.ledger || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'Failed to load financial reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedMethod, fromDate, toDate]);

  useEffect(() => {
    fetchAllReports();
  }, [fetchAllReports]);

  // Debounced search / filter reload for ledger
  const handleFilterSubmit = (e) => {
    e?.preventDefault();
    fetchAllReports();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedMethod('');
    setFromDate('');
    setToDate('');
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // CSV Export Generation
  const handleExportCSV = () => {
    if (!ledgerData || ledgerData.length === 0) {
      alert('No ledger records available to export.');
      return;
    }

    const headers = [
      'Receipt Number',
      'Reference Number',
      'Settlement Date',
      'Student Name',
      'Grade',
      'Campus',
      'Payer Name',
      'Payer Email',
      'Payment Method',
      'Funding Source',
      'Amount (ETB)',
      'Invoice Month',
      'Invoice Status'
    ];

    const rows = ledgerData.map((item) => [
      `"${item.receipt_number || ''}"`,
      `"${item.reference_number || ''}"`,
      `"${item.paid_at ? new Date(item.paid_at).toLocaleString() : ''}"`,
      `"${item.student_name || ''}"`,
      `"${item.student_grade ? `Grade ${item.student_grade}` : 'N/A'}"`,
      `"${item.school_name || ''}"`,
      `"${item.parent_name || ''}"`,
      `"${item.parent_email || ''}"`,
      `"${item.method_label || item.method || ''}"`,
      `"${item.funding_source || ''}"`,
      item.amount || '0.00',
      `"${item.invoice_month || ''}"`,
      `"${item.invoice_status || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `FeeBridge_Audit_Ledger_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  // Helper values
  const totalBilled = parseFloat(summaryData?.total_billed || 0);
  const totalCollected = parseFloat(summaryData?.total_collected || 0);
  const totalOutstanding = parseFloat(summaryData?.total_outstanding || 0);
  const collectionRate = summaryData?.collection_rate_percentage || 0;
  const invoicesBreakdown = summaryData?.invoices_breakdown || { total: 0, paid: 0, partially_paid: 0, unpaid: 0, overdue: 0 };
  const paymentMethods = summaryData?.payment_methods_breakdown || [];
  const monthlyTrends = summaryData?.monthly_trends || [];

  return (
    <div className="reports-view-container">
      {/* Top Header & Actions */}
      <div className="reports-header-section">
        <div className="reports-title-block">
          <div className="reports-badge-row">
            <span className="fintech-badge badge-primary">
              <BarChart3 size={13} /> {isParent ? 'Family Statement' : 'Institutional Ledger'}
            </span>
            <span className="fintech-badge badge-emerald">
              <TrendingUp size={13} /> Real-Time Settlement Engine
            </span>
            <span className="fintech-badge badge-indigo">
              <Building size={13} /> {user?.school_name || 'FeeBridge Core'}
            </span>
          </div>
          <h1 className="reports-main-heading">
            {isParent ? 'Tuition Financial Statement & Payment Audit' : 'Financial Analytics & Audit Ledger Console'}
          </h1>
          <p className="reports-sub-heading">
            {isParent
              ? 'Complete multi-student tuition ledger, verified digital payment receipts, and settlement history.'
              : 'Institutional revenue reconciliation, grade-by-grade fee collection efficiency, and itemized audit records.'}
          </p>
        </div>

        <div className="reports-actions-group">
          <button
            type="button"
            className="btn-fintech-secondary"
            onClick={fetchAllReports}
            disabled={loading}
            title="Refresh All Analytics"
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn-fintech-secondary"
            onClick={handleExportCSV}
            title="Export Itemized Audit Ledger to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="btn-fintech-primary"
            onClick={handlePrintStatement}
            title="Print Official Statement"
          >
            <Printer size={15} />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert-fintech-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" className="btn-alert-dismiss" onClick={fetchAllReports}>
            Retry
          </button>
        </div>
      )}

      {/* Printable Official Header (Hidden on screen, visible during print) */}
      <div className="printable-statement-header">
        <div className="print-brand-row">
          <div>
            <h2 className="print-school-title">{user?.school_name || 'FeeBridge Educational Institution'}</h2>
            <p className="print-school-sub">Official Tuition Settlement Statement & Audit Ledger</p>
          </div>
          <div className="print-meta-box">
            <div><strong>Statement Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div><strong>Generated For:</strong> {user?.first_name} {user?.last_name} ({user?.role})</div>
            <div><strong>Campus Tenancy:</strong> {user?.school_name || 'All Campuses'}</div>
          </div>
        </div>
        <hr className="print-divider" />
      </div>

      {/* High-Level KPI Summary Cards */}
      <div className="fintech-kpi-grid reports-kpi-grid">
        {/* KPI 1: Invoiced Volume */}
        <div className="fintech-kpi-card kpi-card-billing">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">TOTAL TUITION INVOICED</span>
            <div className="kpi-icon-pill icon-pill-amber">
              <Receipt size={18} />
            </div>
          </div>
          <div className="kpi-big-value">
            <span className="kpi-currency">ETB</span>
            <strong>{totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">
              Across <strong>{invoicesBreakdown.total}</strong> generated invoice{invoicesBreakdown.total === 1 ? '' : 's'}
            </span>
            <span className="kpi-tag-subtle">Billed</span>
          </div>
        </div>

        {/* KPI 2: Collections Settled */}
        <div className="fintech-kpi-card kpi-card-wallet">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">COLLECTIONS SETTLED</span>
            <div className="kpi-icon-pill icon-pill-emerald">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-big-value text-emerald">
            <span className="kpi-currency">ETB</span>
            <strong>{totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">
              Cleared into campus treasury / escrow
            </span>
            <span className="kpi-badge-live">Settled</span>
          </div>
        </div>

        {/* KPI 3: Outstanding Arrears */}
        <div className="fintech-kpi-card kpi-card-gateway">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">OUTSTANDING BALANCE</span>
            <div className="kpi-icon-pill icon-pill-rose">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-big-value text-amber">
            <span className="kpi-currency">ETB</span>
            <strong>{totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">
              {invoicesBreakdown.unpaid + invoicesBreakdown.overdue} pending invoice{invoicesBreakdown.unpaid + invoicesBreakdown.overdue === 1 ? '' : 's'}
            </span>
            {invoicesBreakdown.overdue > 0 && (
              <span className="kpi-badge-overdue">{invoicesBreakdown.overdue} Overdue</span>
            )}
          </div>
        </div>

        {/* KPI 4: Collection Rate Gauge */}
        <div className="fintech-kpi-card kpi-card-efficiency">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">COLLECTION EFFICIENCY</span>
            <div className="kpi-icon-pill icon-pill-indigo">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="kpi-big-value">
            <strong className="rate-number">{collectionRate}%</strong>
            <span className="rate-label">of target</span>
          </div>
          <div className="kpi-progress-bar-container">
            <div
              className={`kpi-progress-fill ${
                collectionRate >= 75
                  ? 'fill-emerald'
                  : collectionRate >= 40
                  ? 'fill-amber'
                  : 'fill-rose'
              }`}
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">
              {invoicesBreakdown.paid} paid • {invoicesBreakdown.partially_paid} partial
            </span>
            <span className="kpi-badge-live">
              {collectionRate >= 75 ? 'Optimal' : collectionRate >= 40 ? 'Moderate' : 'Attention'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="reports-tab-nav">
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'overview' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <PieChart size={16} />
          <span>Executive Overview</span>
        </button>

        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'grades' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          <GraduationCap size={16} />
          <span>{isParent ? 'Student Billing Summary' : 'Multi-Grade Revenue'}</span>
          <span className="tab-pill-count">{gradeData.length}</span>
        </button>

        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'channels' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          <CreditCard size={16} />
          <span>Payment Channels & Rails</span>
          <span className="tab-pill-count">{paymentMethods.length}</span>
        </button>

        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'ledger' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <FileSpreadsheet size={16} />
          <span>Settlement Audit Ledger</span>
          <span className="tab-pill-count">{ledgerData.length}</span>
        </button>
      </div>

      {/* Loading state indicator */}
      {loading && !summaryData && (
        <div className="reports-loading-box">
          <div className="spinner-large"></div>
          <p>Compiling institutional reports & settlement ledgers...</p>
        </div>
      )}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && summaryData && (
        <div className="tab-pane-content">
          <div className="overview-dual-grid">
            {/* Left Card: Invoice Settlement Status Distribution */}
            <div className="fintech-card overview-card">
              <div className="fintech-card-header">
                <div>
                  <h3 className="card-title">Tuition Settlement Status</h3>
                  <p className="card-subtitle">Distribution of generated school fees across settlement phases</p>
                </div>
                <div className="status-ratio-badge">
                  {invoicesBreakdown.total > 0
                    ? `${Math.round((invoicesBreakdown.paid / invoicesBreakdown.total) * 100)}% Cleared`
                    : 'No Invoices'}
                </div>
              </div>

              <div className="fintech-card-body">
                {/* Visual Ratio Progress Bar */}
                <div className="multi-segment-bar">
                  {invoicesBreakdown.total > 0 ? (
                    <>
                      <div
                        className="segment-bar-fill fill-emerald"
                        style={{ width: `${(invoicesBreakdown.paid / invoicesBreakdown.total) * 100}%` }}
                        title={`Paid: ${invoicesBreakdown.paid}`}
                      />
                      <div
                        className="segment-bar-fill fill-cyan"
                        style={{ width: `${(invoicesBreakdown.partially_paid / invoicesBreakdown.total) * 100}%` }}
                        title={`Partially Paid: ${invoicesBreakdown.partially_paid}`}
                      />
                      <div
                        className="segment-bar-fill fill-amber"
                        style={{ width: `${(invoicesBreakdown.unpaid / invoicesBreakdown.total) * 100}%` }}
                        title={`Unpaid: ${invoicesBreakdown.unpaid}`}
                      />
                      <div
                        className="segment-bar-fill fill-rose"
                        style={{ width: `${(invoicesBreakdown.overdue / invoicesBreakdown.total) * 100}%` }}
                        title={`Overdue: ${invoicesBreakdown.overdue}`}
                      />
                    </>
                  ) : (
                    <div className="segment-bar-fill fill-empty" style={{ width: '100%' }} />
                  )}
                </div>

                {/* Status Metric Rows */}
                <div className="status-metrics-list">
                  <div className="metric-row">
                    <div className="metric-row-left">
                      <span className="status-dot dot-emerald"></span>
                      <span className="metric-name">Fully Paid & Cleared</span>
                    </div>
                    <div className="metric-row-right">
                      <strong>{invoicesBreakdown.paid}</strong>
                      <span className="text-muted">
                        ({invoicesBreakdown.total > 0 ? Math.round((invoicesBreakdown.paid / invoicesBreakdown.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-row-left">
                      <span className="status-dot dot-cyan"></span>
                      <span className="metric-name">Partially Paid</span>
                    </div>
                    <div className="metric-row-right">
                      <strong>{invoicesBreakdown.partially_paid}</strong>
                      <span className="text-muted">
                        ({invoicesBreakdown.total > 0 ? Math.round((invoicesBreakdown.partially_paid / invoicesBreakdown.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-row-left">
                      <span className="status-dot dot-amber"></span>
                      <span className="metric-name">Unpaid Pending Dues</span>
                    </div>
                    <div className="metric-row-right">
                      <strong>{invoicesBreakdown.unpaid}</strong>
                      <span className="text-muted">
                        ({invoicesBreakdown.total > 0 ? Math.round((invoicesBreakdown.unpaid / invoicesBreakdown.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>

                  <div className="metric-row">
                    <div className="metric-row-left">
                      <span className="status-dot dot-rose"></span>
                      <span className="metric-name">Overdue Arrears</span>
                    </div>
                    <div className="metric-row-right">
                      <strong className="text-rose">{invoicesBreakdown.overdue}</strong>
                      <span className="text-muted">
                        ({invoicesBreakdown.total > 0 ? Math.round((invoicesBreakdown.overdue / invoicesBreakdown.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overview-card-cta">
                  <button
                    type="button"
                    className="btn-fintech-outline w-full"
                    onClick={onNavigateToInvoices}
                  >
                    <span>View All Invoices in Billing Console</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Card: Monthly Billing vs Collection Trends */}
            <div className="fintech-card overview-card">
              <div className="fintech-card-header">
                <div>
                  <h3 className="card-title">Monthly Revenue Cycles</h3>
                  <p className="card-subtitle">Invoiced amounts versus settled collections across academic months</p>
                </div>
                <span className="badge-fintech-subtle">
                  {monthlyTrends.length} Active Cycle{monthlyTrends.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="fintech-card-body">
                {monthlyTrends.length === 0 ? (
                  <div className="reports-empty-state">
                    <Calendar size={32} className="text-muted" />
                    <h4>No monthly billing cycles detected</h4>
                    <p>Generate monthly invoices from the billing console to start tracking multi-period trends.</p>
                  </div>
                ) : (
                  <div className="monthly-cycles-list">
                    {monthlyTrends.map((cycle, idx) => {
                      const billed = parseFloat(cycle.billed || 0);
                      const collected = parseFloat(cycle.collected || 0);
                      const rate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
                      return (
                        <div key={idx} className="monthly-cycle-row">
                          <div className="cycle-header-row">
                            <div className="cycle-title-group">
                              <Calendar size={15} className="text-muted" />
                              <strong className="cycle-month-name">{cycle.month_str}</strong>
                              <span className="cycle-count-badge">{cycle.count} invoice{cycle.count === 1 ? '' : 's'}</span>
                            </div>
                            <div className="cycle-efficiency-pill">
                              <span className={`pill-rate ${rate >= 75 ? 'text-emerald' : rate >= 40 ? 'text-amber' : 'text-rose'}`}>
                                {rate}% Cleared
                              </span>
                            </div>
                          </div>

                          {/* Mini Progress bar */}
                          <div className="cycle-bar-track">
                            <div
                              className={`cycle-bar-fill ${rate >= 75 ? 'fill-emerald' : rate >= 40 ? 'fill-amber' : 'fill-rose'}`}
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>

                          <div className="cycle-figures-row">
                            <div className="figure-col">
                              <span className="figure-label">Total Invoiced</span>
                              <span className="figure-val">{billed.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</span>
                            </div>
                            <div className="figure-col text-right">
                              <span className="figure-label">Total Collected</span>
                              <span className="figure-val text-emerald font-semibold">
                                {collected.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRADE BREAKDOWN */}
      {activeTab === 'grades' && (
        <div className="tab-pane-content">
          <div className="fintech-card">
            <div className="fintech-card-header">
              <div>
                <h3 className="card-title">
                  {isParent ? 'Student & Grade Tuition Performance' : 'Multi-Grade Institutional Breakdown'}
                </h3>
                <p className="card-subtitle">
                  {isParent
                    ? 'Breakdown of billed tuition, settled payments, and pending dues for each enrolled child.'
                    : 'Targeted revenue metrics, enrolled rosters, and collection efficiency across Grade 1 through 12.'}
                </p>
              </div>
              <span className="badge-fintech-subtle">{gradeData.length} Grades Analyzed</span>
            </div>

            <div className="fintech-card-body p-0">
              {gradeData.length === 0 ? (
                <div className="reports-empty-state">
                  <GraduationCap size={36} className="text-muted" />
                  <h4>No active grade records found</h4>
                  <p>Enrolled students and generated invoices will automatically populate this multi-grade table.</p>
                </div>
              ) : (
                <div className="reports-table-responsive">
                  <table className="reports-data-table">
                    <thead>
                      <tr>
                        <th>Grade</th>
                        <th>Students</th>
                        <th>Invoices</th>
                        <th>Total Invoiced</th>
                        <th>Settled Revenue</th>
                        <th>Outstanding Arrears</th>
                        <th style={{ width: '220px' }}>Collection Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradeData.map((g) => {
                        const rate = g.collection_rate_percentage || 0;
                        const billed = parseFloat(g.total_billed || 0);
                        const collected = parseFloat(g.total_collected || 0);
                        const outstanding = parseFloat(g.total_outstanding || 0);

                        return (
                          <tr key={g.grade}>
                            <td>
                              <div className="grade-badge-cell">
                                <span className="grade-pill-tag">Grade {g.grade}</span>
                              </div>
                            </td>
                            <td>
                              <span className="cell-count-text">
                                {g.students_count} student{g.students_count === 1 ? '' : 's'}
                              </span>
                            </td>
                            <td>
                              <span className="cell-count-text">
                                {g.paid_invoices} / {g.total_invoices} paid
                              </span>
                            </td>
                            <td>
                              <span className="cell-amount-billed">
                                {billed.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                              </span>
                            </td>
                            <td>
                              <span className="cell-amount-collected text-emerald">
                                {collected.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                              </span>
                            </td>
                            <td>
                              <span className={`cell-amount-outstanding ${outstanding > 0 ? 'text-amber' : 'text-muted'}`}>
                                {outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                              </span>
                            </td>
                            <td>
                              <div className="efficiency-cell-stack">
                                <div className="efficiency-text-row">
                                  <strong className={rate >= 75 ? 'text-emerald' : rate >= 40 ? 'text-amber' : 'text-rose'}>
                                    {rate}%
                                  </strong>
                                  <span className="efficiency-sub-label">
                                    {rate >= 75 ? 'Optimal' : rate >= 40 ? 'Moderate' : 'Under Target'}
                                  </span>
                                </div>
                                <div className="efficiency-progress-track">
                                  <div
                                    className={`efficiency-progress-fill ${
                                      rate >= 75 ? 'fill-emerald' : rate >= 40 ? 'fill-amber' : 'fill-rose'
                                    }`}
                                    style={{ width: `${Math.min(rate, 100)}%` }}
                                  />
                                </div>
                              </div>
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
        </div>
      )}

      {/* TAB 3: PAYMENT CHANNELS & RAILS */}
      {activeTab === 'channels' && (
        <div className="tab-pane-content">
          <div className="fintech-card">
            <div className="fintech-card-header">
              <div>
                <h3 className="card-title">Ethiopian Banking & Payment Rails Distribution</h3>
                <p className="card-subtitle">
                  Volume settled through CBE Birr, Telebirr, Digital Escrow Wallet, and Commercial Bank channels
                </p>
              </div>
              <div className="channels-total-pill">
                <span>Total Settled Volume:</span>
                <strong>{totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
              </div>
            </div>

            <div className="fintech-card-body">
              {paymentMethods.length === 0 ? (
                <div className="reports-empty-state">
                  <CreditCard size={36} className="text-muted" />
                  <h4>No settled payments recorded yet</h4>
                  <p>When tuition payments are completed via CBE, Telebirr, or Wallet, rails data will display here.</p>
                </div>
              ) : (
                <div className="payment-rails-grid">
                  {paymentMethods.map((pm, idx) => {
                    const amt = parseFloat(pm.total_amount || 0);
                    const pct = pm.percentage || 0;

                    // Rail styling helper
                    const getRailTheme = (code) => {
                      switch (code) {
                        case 'CBE':
                          return { border: 'border-purple', badge: 'badge-purple', iconColor: 'text-purple' };
                        case 'TELEBIRR':
                          return { border: 'border-teal', badge: 'badge-teal', iconColor: 'text-teal' };
                        case 'WALLET':
                          return { border: 'border-emerald', badge: 'badge-emerald', iconColor: 'text-emerald' };
                        case 'BOA':
                          return { border: 'border-amber', badge: 'badge-amber', iconColor: 'text-amber' };
                        case 'AWASH':
                          return { border: 'border-cyan', badge: 'badge-cyan', iconColor: 'text-cyan' };
                        case 'DASHEN':
                          return { border: 'border-indigo', badge: 'badge-indigo', iconColor: 'text-indigo' };
                        default:
                          return { border: 'border-primary', badge: 'badge-primary', iconColor: 'text-primary' };
                      }
                    };

                    const theme = getRailTheme(pm.method);

                    return (
                      <div key={idx} className={`rail-channel-card ${theme.border}`}>
                        <div className="rail-card-top">
                          <div className="rail-title-group">
                            <div className="rail-icon-box">
                              {pm.method === 'WALLET' ? (
                                <Wallet size={20} className={theme.iconColor} />
                              ) : (
                                <CreditCard size={20} className={theme.iconColor} />
                              )}
                            </div>
                            <div>
                              <h4 className="rail-label">{pm.label}</h4>
                              <span className="rail-code-pill">{pm.method} RAIL</span>
                            </div>
                          </div>
                          <span className={`rail-percentage-badge ${theme.badge}`}>{pct}% Share</span>
                        </div>

                        <div className="rail-amount-row">
                          <span className="rail-currency">ETB</span>
                          <strong className="rail-amount-value">
                            {amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* Progress Bar of Volume */}
                        <div className="rail-volume-track">
                          <div
                            className={`rail-volume-fill ${theme.badge.replace('badge-', 'fill-')}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        <div className="rail-card-footer">
                          <span className="rail-footer-text">
                            <strong>{pm.count}</strong> settled transaction{pm.count === 1 ? '' : 's'}
                          </span>
                          <span className="rail-instant-tag">Instant Verification</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTLEMENT AUDIT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="tab-pane-content">
          <div className="fintech-card">
            {/* Ledger Toolbar & Filters */}
            <div className="ledger-toolbar-section">
              <div className="toolbar-header-row">
                <div>
                  <h3 className="card-title">Settlement Audit Ledger</h3>
                  <p className="card-subtitle">
                    Itemized transaction records with bank references, receipt numbers, and payer details
                  </p>
                </div>
                <div className="ledger-counter-badge">
                  <CheckCircle2 size={14} className="text-emerald" />
                  <span>{ledgerData.length} Cleared Settlements</span>
                </div>
              </div>

              {/* Filter Row */}
              <form className="ledger-filters-form" onSubmit={handleFilterSubmit}>
                <div className="filters-grid">
                  {/* Search Input */}
                  <div className="filter-input-wrap search-wrap">
                    <Search size={15} className="input-icon-muted" />
                    <input
                      type="text"
                      className="form-input-fintech"
                      placeholder="Search student, parent, receipt or ref #..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Payment Method Select */}
                  <div className="filter-input-wrap">
                    <Filter size={15} className="input-icon-muted" />
                    <select
                      className="form-select-fintech"
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                    >
                      <option value="">All Payment Rails</option>
                      <option value="CBE">CBE Birr / CBE Direct</option>
                      <option value="TELEBIRR">Telebirr SuperApp</option>
                      <option value="WALLET">FeeBridge Escrow Wallet</option>
                      <option value="BOA">Bank of Abyssinia</option>
                      <option value="AWASH">Awash Bank</option>
                      <option value="DASHEN">Dashen Bank / Amole</option>
                      <option value="CARD">Visa / Mastercard</option>
                    </select>
                  </div>

                  {/* Date Range: From */}
                  <div className="filter-input-wrap">
                    <Calendar size={15} className="input-icon-muted" />
                    <input
                      type="date"
                      className="form-input-fintech"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      title="From Date"
                    />
                  </div>

                  {/* Date Range: To */}
                  <div className="filter-input-wrap">
                    <Calendar size={15} className="input-icon-muted" />
                    <input
                      type="date"
                      className="form-input-fintech"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      title="To Date"
                    />
                  </div>

                  {/* Submit & Reset Buttons */}
                  <div className="filter-buttons-wrap">
                    <button type="submit" className="btn-fintech-primary filter-submit-btn">
                      Apply Filters
                    </button>
                    {(searchTerm || selectedMethod || fromDate || toDate) && (
                      <button
                        type="button"
                        className="btn-fintech-secondary"
                        onClick={handleResetFilters}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Ledger Table */}
            <div className="fintech-card-body p-0">
              {ledgerData.length === 0 ? (
                <div className="reports-empty-state">
                  <Search size={36} className="text-muted" />
                  <h4>No audit ledger records match your criteria</h4>
                  <p>Try clearing filters or adjusting your date range to view all cleared payments.</p>
                  {(searchTerm || selectedMethod || fromDate || toDate) && (
                    <button
                      type="button"
                      className="btn-fintech-secondary mt-3"
                      onClick={handleResetFilters}
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="reports-table-responsive">
                  <table className="reports-data-table ledger-table">
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Settlement Date</th>
                        <th>Student & Grade</th>
                        <th>Payer / Parent</th>
                        <th>Channel & Reference</th>
                        <th>Amount Settled</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.map((row) => {
                        const paidDate = row.paid_at
                          ? new Date(row.paid_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A';

                        const isCopied = copiedId === row.id;

                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="receipt-cell">
                                <span className="receipt-number-tag">{row.receipt_number}</span>
                                <button
                                  type="button"
                                  className="btn-copy-chip"
                                  onClick={() => handleCopyText(row.receipt_number, row.id)}
                                  title="Copy Receipt Number"
                                >
                                  {isCopied ? <Check size={12} className="text-emerald" /> : <Copy size={12} />}
                                </button>
                              </div>
                            </td>
                            <td>
                              <div className="date-time-cell">
                                <span className="date-text">{paidDate}</span>
                                {row.invoice_month && (
                                  <span className="cycle-sub-text">Cycle: {row.invoice_month}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="student-profile-cell">
                                <strong className="student-name">{row.student_name}</strong>
                                <span className="student-grade-badge">
                                  {row.student_grade ? `Grade ${row.student_grade}` : 'Student'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="payer-profile-cell">
                                <span className="payer-name">{row.parent_name || 'Authorized Payer'}</span>
                                {row.parent_email && (
                                  <span className="payer-email">{row.parent_email}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="rail-reference-cell">
                                <span className="method-pill-small">
                                  {row.method_label || row.method}
                                </span>
                                <span className="ref-number-text" title={row.reference_number}>
                                  Ref: {row.reference_number || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="amount-cell">
                                <span className="amount-number-bold">
                                  {parseFloat(row.amount || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  ETB
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className="settlement-status-badge">
                                <CheckCircle2 size={13} className="text-emerald" />
                                <span>Settled</span>
                              </div>
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
        </div>
      )}
    </div>
  );
}
