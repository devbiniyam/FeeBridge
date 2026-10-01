import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { invoiceService } from '../services/api';
import PaymentModal from './PaymentModal';
import GenerateInvoicesModal from './GenerateInvoicesModal';
import CreateInstallmentPlanModal from './CreateInstallmentPlanModal';
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
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
  PlayCircle,
  Undo2
} from 'lucide-react';

export default function InvoicesList({ onNavigateBack }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'INSTALLMENTS'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [targetedInstallment, setTargetedInstallment] = useState(null);
  const [installmentModalInvoice, setInstallmentModalInvoice] = useState(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState({});
  const [autoPayRunning, setAutoPayRunning] = useState(false);
  const [autoPayResult, setAutoPayResult] = useState(null);

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

  const toggleExpandInvoice = (invoiceId) => {
    setExpandedInvoices((prev) => ({
      ...prev,
      [invoiceId]: !prev[invoiceId],
    }));
  };

  const handleRunAutoPay = async () => {
    if (!window.confirm('Execute Automated Due-Date Escrow Settlement? This will debit eligible parent wallets with Auto-Pay enabled to settle due tuition milestones.')) {
      return;
    }
    setAutoPayRunning(true);
    setAutoPayResult(null);
    try {
      const res = await invoiceService.runAutoPaySettlement();
      setAutoPayResult(res);
      await fetchInvoices();
    } catch (err) {
      alert(err.message || 'Auto-Pay batch settlement failed.');
    } finally {
      setAutoPayRunning(false);
    }
  };

  const handleCancelInstallmentPlan = async (invoiceId) => {
    if (!window.confirm('Cancel this installment milestone schedule and revert to standard lump-sum billing?')) {
      return;
    }
    try {
      await invoiceService.deleteInstallmentPlan(invoiceId);
      await fetchInvoices();
    } catch (err) {
      alert(err.message || 'Failed to cancel installment schedule.');
    }
  };

  const installmentCount = invoices.filter((i) => i.has_installments).length;

  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'INSTALLMENTS'
        ? inv.has_installments
        : inv.status === activeTab;

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
            <>
              <button
                type="button"
                className="btn-fintech-secondary btn-autopay-trigger"
                onClick={handleRunAutoPay}
                disabled={autoPayRunning}
                title="Execute automated escrow settlement batch across parent wallets"
              >
                <Zap size={16} className={autoPayRunning ? 'animate-pulse text-amber' : 'text-amber'} />
                {autoPayRunning ? 'Running Settlements...' : 'Run Auto-Pay Settlement'}
              </button>
              <button
                type="button"
                className="btn-fintech-primary"
                onClick={() => setIsGenerateModalOpen(true)}
              >
                <Sparkles size={16} /> Run Monthly Billing
              </button>
            </>
          )}

          <button type="button" className="btn-fintech-ghost" onClick={fetchInvoices} title="Reload Data">
            <RotateCcw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Auto-Pay Settlement Banner */}
      {autoPayResult && (
        <div className="autopay-result-banner">
          <div className="autopay-result-left">
            <div className="autopay-result-bubble">
              <Zap size={20} />
            </div>
            <div>
              <strong>Automated Escrow Settlement Completed</strong>
              <p>
                Successfully cleared <strong>{autoPayResult.settled_count}</strong> tuition milestones/invoices totaling{' '}
                <strong>{parseFloat(autoPayResult.total_amount_settled || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>.
                {autoPayResult.low_balance_count > 0 && (
                  <span className="text-amber">
                    {' '}({autoPayResult.low_balance_count} parent accounts issued low-balance alerts).
                  </span>
                )}
              </p>
            </div>
          </div>
          <button type="button" className="btn-banner-dismiss" onClick={() => setAutoPayResult(null)}>
            Dismiss
          </button>
        </div>
      )}

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
            className={`ledger-tab ${activeTab === 'INSTALLMENTS' ? 'ledger-tab-active' : ''}`}
            onClick={() => setActiveTab('INSTALLMENTS')}
          >
            <Layers size={13} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Milestones ({installmentCount})
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
                    <React.Fragment key={inv.id}>
                      <tr className="ledger-row">
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
                          <div className="student-title-row">
                            <strong className="student-cell-name">
                              {inv.student_name || `Student #${inv.student}`}
                            </strong>
                            {inv.has_installments && (
                              <button
                                type="button"
                                className="badge-milestones-summary"
                                onClick={() => toggleExpandInvoice(inv.id)}
                                title="Click to view installment milestone breakdown"
                              >
                                <Layers size={11} />
                                <span>{inv.paid_installments_count}/{inv.installments_count} Milestones</span>
                                {expandedInvoices[inv.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                            )}
                          </div>
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
                          ) : inv.has_installments ? (
                            <div className="action-buttons-group">
                              <button
                                type="button"
                                className="btn-table-milestones"
                                onClick={() => toggleExpandInvoice(inv.id)}
                                title="View milestone breakdown and pay installments"
                              >
                                <Layers size={13} /> {expandedInvoices[inv.id] ? 'Hide Plan' : 'Milestones'}
                              </button>
                              <button
                                type="button"
                                className="btn-table-pay"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setTargetedInstallment(null);
                                }}
                              >
                                <CreditCard size={13} /> Pay Full
                              </button>
                            </div>
                          ) : (
                            <div className="action-buttons-group">
                              <button
                                type="button"
                                className="btn-table-pay"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setTargetedInstallment(null);
                                }}
                              >
                                <CreditCard size={14} /> Pay Now
                              </button>
                              {amountPaid === 0 && (
                                <button
                                  type="button"
                                  className="btn-table-split"
                                  onClick={() => setInstallmentModalInvoice(inv)}
                                  title="Split tuition into 2 or 3 milestone payments"
                                >
                                  <Layers size={13} /> Split
                                </button>
                              )}
                            </div>
                          )
                        ) : inv.has_installments ? (
                          <button
                            type="button"
                            className="btn-table-milestones"
                            onClick={() => toggleExpandInvoice(inv.id)}
                          >
                            <Layers size={13} /> {expandedInvoices[inv.id] ? 'Hide' : `${inv.installments_count} Milestones`}
                          </button>
                        ) : !isFullyPaid && amountPaid === 0 ? (
                          <button
                            type="button"
                            className="btn-table-split"
                            onClick={() => setInstallmentModalInvoice(inv)}
                            title="Split tuition into milestones for parent"
                          >
                            <Layers size={13} /> Split Plan
                          </button>
                        ) : (
                          <span className="staff-view-pill">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedInvoices[inv.id] && inv.installments && (
                      <tr className="expanded-milestones-row">
                        <td colSpan="8">
                          <div className="milestones-nested-panel">
                            <div className="nested-panel-header">
                              <div className="panel-title-group">
                                <Layers size={16} className="text-purple" />
                                <strong>Tuition Installment Schedule ({inv.installments.length} Milestones)</strong>
                                <span className="panel-subtitle">Sequential due-date milestones with independent wallet and direct bank settlement</span>
                              </div>
                              {amountPaid === 0 && (
                                <button
                                  type="button"
                                  className="btn-cancel-schedule"
                                  onClick={() => handleCancelInstallmentPlan(inv.id)}
                                  title="Cancel schedule and revert to standard single invoice"
                                >
                                  <Undo2 size={13} /> Cancel Schedule
                                </button>
                              )}
                            </div>

                            <div className="milestones-cards-grid">
                              {inv.installments.map((inst) => {
                                const instDue = new Date(inst.due_date);
                                const isInstPaid = inst.status === 'PAID' || inst.is_paid;
                                const isInstOverdue = inst.status === 'OVERDUE';
                                const instRemaining = parseFloat(inst.balance_remaining || 0);

                                return (
                                  <div
                                    key={inst.id}
                                    className={`milestone-card ${isInstPaid ? 'card-milestone-paid' : isInstOverdue ? 'card-milestone-overdue' : ''}`}
                                  >
                                    <div className="milestone-card-top">
                                      <span className="milestone-badge-num">Milestone #{inst.installment_number}</span>
                                      <span className={`status-pill ${isInstPaid ? 'status-paid' : isInstOverdue ? 'status-overdue' : 'status-unpaid'}`}>
                                        {isInstPaid ? 'Cleared' : isInstOverdue ? 'Overdue' : 'Pending'}
                                      </span>
                                    </div>

                                    <h5 className="milestone-card-title">{inst.title}</h5>

                                    <div className="milestone-card-amounts">
                                      <div className="amount-col">
                                        <span className="micro-label">AMOUNT</span>
                                        <strong>{parseFloat(inst.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                                      </div>
                                      <div className="amount-col">
                                        <span className="micro-label">BALANCE DUE</span>
                                        <strong className={isInstPaid ? 'text-emerald' : 'text-amber'}>
                                          {instRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                                        </strong>
                                      </div>
                                    </div>

                                    <div className="milestone-card-due">
                                      <Calendar size={12} />
                                      <span>Due: {instDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>

                                    {isParent && !isInstPaid && (
                                      <button
                                        type="button"
                                        className="btn-pay-milestone-card"
                                        onClick={() => {
                                          setSelectedInvoice(inv);
                                          setTargetedInstallment(inst);
                                        }}
                                      >
                                        <CreditCard size={13} /> Settle Milestone
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
          targetedInstallment={targetedInstallment}
          onClose={() => {
            setSelectedInvoice(null);
            setTargetedInstallment(null);
          }}
          onPaymentSuccess={() => {
            fetchInvoices();
          }}
        />
      )}

      {/* Create Installment Plan Modal */}
      {installmentModalInvoice && (
        <CreateInstallmentPlanModal
          invoice={installmentModalInvoice}
          onClose={() => setInstallmentModalInvoice(null)}
          onSuccess={() => {
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
