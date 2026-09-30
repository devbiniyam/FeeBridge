import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { invoiceService } from '../services/api';
import PaymentModal from './PaymentModal';
import GenerateInvoicesModal from './GenerateInvoicesModal';
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Wallet,
  ArrowLeft,
  GraduationCap,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Plus,
  ArrowRight,
  Filter,
  Check,
  ChevronDown
} from 'lucide-react';

export default function InvoicesList({ onNavigateBack }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await invoiceService.getInvoices();
      setInvoices(data);
    } catch (err) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab =
      activeTab === 'ALL' ||
      inv.status === activeTab;

    const studentMatch = inv.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const schoolMatch = inv.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const monthMatch = inv.month?.includes(searchQuery) || false;

    return matchesTab && (searchQuery === '' || studentMatch || schoolMatch || monthMatch);
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_remaining || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const unpaidCount = invoices.filter((i) => i.status === 'UNPAID').length;
  const partialCount = invoices.filter((i) => i.status === 'PARTIALLY_PAID').length;
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;

  const isParent = user?.role === 'PARENT';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="status-pill status-paid">
            <CheckCircle2 size={12} /> Cleared
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="status-pill status-partial">
            <Clock size={12} /> Partially Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="status-pill status-overdue">
            <AlertCircle size={12} /> Overdue
          </span>
        );
      default:
        return (
          <span className="status-pill status-unpaid">
            <AlertCircle size={12} /> Unpaid
          </span>
        );
    }
  };

  return (
    <div className="fintech-invoices-container">
      {/* Top Breadcrumb & Controls */}
      <div className="invoices-topbar-row">
        <div>
          <h2 className="fintech-page-title">
            {isParent ? 'Tuition Billing & Invoices' : 'Campus Invoicing Management'}
          </h2>
          <p className="fintech-page-sub">
            {isParent
              ? 'Review active school fee schedules, verify payment allocations, and clear tuition online.'
              : `Institutional fee collection console for ${user?.school_name || 'campus'}.`}
          </p>
        </div>

        <div className="invoices-header-actions">
          {!isParent && (
            <button
              type="button"
              className="btn-fintech-primary"
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <Sparkles size={16} /> Run Monthly Billing
            </button>
          )}

          <button type="button" className="btn-fintech-ghost" onClick={fetchInvoices} title="Reload Data">
            <RotateCcw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Financial Pipeline KPI Bar */}
      <div className="pipeline-kpi-bar">
        <div className="kpi-segment">
          <span className="kpi-label">TOTAL INVOICED</span>
          <strong className="kpi-value">{totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
          <span className="kpi-sub">{invoices.length} invoices generated</span>
        </div>

        <div className="kpi-divider"></div>

        <div className="kpi-segment">
          <span className="kpi-label">TOTAL COLLECTED</span>
          <strong className="kpi-value text-emerald">{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
          <span className="kpi-sub">{paidCount} invoices cleared</span>
        </div>

        <div className="kpi-divider"></div>

        <div className="kpi-segment">
          <span className="kpi-label">OUTSTANDING DUE</span>
          <strong className="kpi-value text-amber">{totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
          <span className="kpi-sub">{unpaidCount + partialCount} pending payments</span>
        </div>

        <div className="kpi-divider"></div>

        <div className="kpi-segment kpi-progress-segment">
          <div className="kpi-progress-header">
            <span className="kpi-label">COLLECTION RATE</span>
            <strong className="kpi-rate-text">{collectionRate}%</strong>
          </div>
          <div className="kpi-progress-track">
            <div className="kpi-progress-fill" style={{ width: `${collectionRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="ledger-filter-controls">
        <div className="ledger-tabs-group">
          <button
            type="button"
            className={`ledger-tab ${activeTab === 'ALL' ? 'ledger-tab-active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            type="button"
            className={`ledger-tab ${activeTab === 'UNPAID' ? 'ledger-tab-active' : ''}`}
            onClick={() => setActiveTab('UNPAID')}
          >
            Unpaid ({unpaidCount})
          </button>
          <button
            type="button"
            className={`ledger-tab ${activeTab === 'PARTIALLY_PAID' ? 'ledger-tab-active' : ''}`}
            onClick={() => setActiveTab('PARTIALLY_PAID')}
          >
            Partially Paid ({partialCount})
          </button>
          <button
            type="button"
            className={`ledger-tab ${activeTab === 'PAID' ? 'ledger-tab-active' : ''}`}
            onClick={() => setActiveTab('PAID')}
          >
            Cleared / Paid ({paidCount})
          </button>
        </div>

        <div className="fintech-search-box search-inline">
          <Search size={15} className="fintech-search-icon" />
          <input
            type="text"
            placeholder="Filter by student name, grade, month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fintech-search-input"
          />
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading invoice records...</p>
        </div>
      ) : error ? (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-ledger-state">
          <Receipt size={44} className="text-muted" />
          <h4>No Invoices Found</h4>
          <p>
            {searchQuery
              ? `No invoices matched "${searchQuery}".`
              : !isParent
              ? 'No invoices generated yet. Click "Run Monthly Billing" to issue tuition fees.'
              : 'There are no invoices in this category.'}
          </p>
          {!isParent && (
            <button
              type="button"
              className="btn-fintech-primary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <Sparkles size={15} /> Run Monthly Billing
            </button>
          )}
        </div>
      ) : (
        <div className="fintech-ledger-card">
          <div className="table-responsive">
            <table className="fintech-table">
              <thead>
                <tr>
                  <th>INVOICE</th>
                  <th>STUDENT & CAMPUS</th>
                  <th>BILLING PERIOD</th>
                  <th>DUE DATE</th>
                  <th>STATUS</th>
                  <th>PAYMENT PROGRESS</th>
                  <th style={{ textAlign: 'right' }}>BALANCE DUE</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const amount = parseFloat(inv.amount || 0);
                  const amountPaid = parseFloat(inv.amount_paid || 0);
                  const balanceRemaining = parseFloat(inv.balance_remaining || 0);
                  const percentage = amount > 0 ? Math.min(100, Math.round((amountPaid / amount) * 100)) : 0;
                  const isFullyPaid = inv.status === 'PAID' || balanceRemaining <= 0;

                  return (
                    <tr key={inv.id} className="ledger-row">
                      {/* Invoice ID */}
                      <td>
                        <div className="inv-code-cell">
                          <code className="reference-code">
                            INV-{(inv.id).toString().padStart(5, '0')}
                          </code>
                        </div>
                      </td>

                      {/* Student & School */}
                      <td>
                        <div className="student-cell-group">
                          <strong className="student-cell-name">
                            {inv.student_name || `Student #${inv.student}`}
                          </strong>
                          <div className="student-cell-tags">
                            <span className="badge-grade">Grade {inv.student_grade || 'N/A'}-{inv.student_section || 'A'}</span>
                            {inv.school_name && (
                              <span className="school-sub-tag">
                                <Building size={11} /> {inv.school_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Billing Period */}
                      <td>
                        <div className="date-cell">
                          <span className="period-text">
                            {new Date(inv.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td>
                        <div className="date-cell">
                          <span>{new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {getStatusBadge(inv.status)}
                      </td>

                      {/* Payment Progress */}
                      <td>
                        <div className="progress-cell-group">
                          <div className="progress-bar-small">
                            <div
                              className={`progress-fill ${isFullyPaid ? 'fill-emerald' : 'fill-amber'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{percentage}% ({amountPaid.toFixed(0)} / {amount.toFixed(0)} ETB)</span>
                        </div>
                      </td>

                      {/* Balance Due */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="amount-cell-group">
                          <strong className={`balance-num ${isFullyPaid ? 'text-muted' : 'text-amber'}`}>
                            {balanceRemaining.toFixed(2)} ETB
                          </strong>
                          <span className="total-fee-sub">Total: {amount.toFixed(2)} ETB</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'center' }}>
                        {isParent ? (
                          isFullyPaid ? (
                            <span className="paid-check-tag">
                              <CheckCircle2 size={14} /> Settled
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-table-pay"
                              onClick={() => setSelectedInvoice(inv)}
                            >
                              <CreditCard size={14} /> Pay Now
                            </button>
                          )
                        ) : (
                          <span className="staff-view-pill">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settle Invoice Modal */}
      {selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPaymentSuccess={() => {
            fetchInvoices();
          }}
        />
      )}

      {/* Staff Batch Invoice Generator Modal */}
      {isGenerateModalOpen && (
        <GenerateInvoicesModal
          onClose={() => setIsGenerateModalOpen(false)}
          onSuccess={() => {
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
