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
  Plus
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

  // Filter invoices based on status tab and search query
  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab =
      activeTab === 'ALL' ||
      inv.status === activeTab;

    const studentMatch = inv.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const schoolMatch = inv.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const monthMatch = inv.month?.includes(searchQuery) || false;

    return matchesTab && (searchQuery === '' || studentMatch || schoolMatch || monthMatch);
  });

  // Calculate high-level financial summary
  const totalBilled = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_remaining || 0), 0);

  const unpaidCount = invoices.filter((i) => i.status === 'UNPAID').length;
  const partialCount = invoices.filter((i) => i.status === 'PARTIALLY_PAID').length;
  const paidCount = invoices.filter((i) => i.status === 'PAID').length;

  const isParent = user?.role === 'PARENT';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="status-badge status-paid">
            <CheckCircle2 size={13} /> Fully Paid
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="status-badge status-partial">
            <Clock size={13} /> Partially Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="status-badge status-overdue">
            <AlertCircle size={13} /> Overdue
          </span>
        );
      default:
        return (
          <span className="status-badge status-unpaid">
            <AlertCircle size={13} /> Unpaid
          </span>
        );
    }
  };

  return (
    <div className="invoices-page">
      {/* Top Breadcrumb & Actions */}
      <div className="page-header-row">
        <button type="button" className="btn-back" onClick={onNavigateBack}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="page-actions-group">
          {!isParent && (
            <button
              type="button"
              className="btn-generate-invoices"
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <Sparkles size={16} />
              <span>Generate Monthly Invoices</span>
            </button>
          )}

          <button type="button" className="btn-refresh" onClick={fetchInvoices} title="Reload Invoices">
            <RotateCcw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="invoices-header-banner">
        <div className="header-text-group">
          <div className="header-tag">
            <Receipt size={14} /> Fee Invoicing Hub
          </div>
          <h2>School Fee Invoices</h2>
          <p>
            {isParent
              ? 'Review monthly tuition schedules, check remaining balances, and settle fees via Digital Wallet or Telebirr.'
              : `Campus Invoicing Oversight for ${user?.school_name || 'your institution'}. Run monthly billing runs and track collection rates.`}
          </p>
        </div>

        {isParent && user?.wallet_balance !== undefined ? (
          <div className="quick-wallet-pill">
            <Wallet size={18} className="text-emerald" />
            <div>
              <span className="pill-label">Wallet Available</span>
              <strong className="pill-balance">{parseFloat(user.wallet_balance).toFixed(2)} ETB</strong>
            </div>
          </div>
        ) : (
          !isParent && (
            <button
              type="button"
              className="btn-banner-generate"
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <Building size={20} />
              <div className="btn-banner-texts">
                <span className="btn-banner-sub">Staff Billing Engine</span>
                <strong>Run Monthly Invoicing</strong>
              </div>
            </button>
          )
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="stats-summary-grid">
        <div className="stat-card stat-billed">
          <div className="stat-label">Total Invoiced</div>
          <div className="stat-value">{totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</div>
          <div className="stat-sub">{invoices.length} total invoice records</div>
        </div>

        <div className="stat-card stat-paid">
          <div className="stat-label">Total Collected / Paid</div>
          <div className="stat-value text-emerald">{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</div>
          <div className="stat-sub">{paidCount} cleared invoices</div>
        </div>

        <div className="stat-card stat-due">
          <div className="stat-label">Outstanding Balance</div>
          <div className="stat-value text-amber">{totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</div>
          <div className="stat-sub">{unpaidCount + partialCount} pending payments</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-controls-card">
        <div className="tabs-row">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'ALL' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Invoices <span className="tab-counter">{invoices.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'UNPAID' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('UNPAID')}
          >
            Unpaid <span className="tab-counter count-unpaid">{unpaidCount}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'PARTIALLY_PAID' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('PARTIALLY_PAID')}
          >
            Partially Paid <span className="tab-counter count-partial">{partialCount}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'PAID' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('PAID')}
          >
            Paid <span className="tab-counter count-paid">{paidCount}</span>
          </button>
        </div>

        <div className="search-wrapper">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Search student, grade, or month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Invoices List Display */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Fetching invoices...</p>
        </div>
      ) : error ? (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-state-card">
          <Receipt size={48} className="empty-icon" />
          <h3>No Invoices Found</h3>
          <p>
            {searchQuery
              ? `No invoices matched "${searchQuery}". Try adjusting your search term.`
              : !isParent
              ? 'No invoices found for this period. Click "Generate Monthly Invoices" to create billing records for enrolled students.'
              : 'There are no invoices currently registered under this category.'}
          </p>
          {!isParent && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <Sparkles size={16} /> Generate Invoices Now
            </button>
          )}
        </div>
      ) : (
        <div className="invoices-grid">
          {filteredInvoices.map((inv) => {
            const amount = parseFloat(inv.amount || 0);
            const amountPaid = parseFloat(inv.amount_paid || 0);
            const balanceRemaining = parseFloat(inv.balance_remaining || 0);
            const percentage = amount > 0 ? Math.min(100, Math.round((amountPaid / amount) * 100)) : 0;
            const isFullyPaid = inv.status === 'PAID' || balanceRemaining <= 0;

            return (
              <div key={inv.id} className={`invoice-card invoice-card-${inv.status.toLowerCase()}`}>
                {/* Invoice Card Top Header */}
                <div className="inv-top">
                  <div className="student-profile-badge">
                    <div className="student-avatar">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <h4 className="student-name">{inv.student_name || `Student #${inv.student}`}</h4>
                      <div className="student-meta">
                        <span>Grade {inv.student_grade || 'N/A'}-{inv.student_section || 'A'}</span>
                        {inv.school_name && (
                          <span className="school-pill">
                            <Building size={11} /> {inv.school_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>{getStatusBadge(inv.status)}</div>
                </div>

                {/* Billing Month & Dates */}
                <div className="inv-dates-row">
                  <div className="date-item">
                    <Calendar size={14} />
                    <span>
                      Month:{' '}
                      <strong>
                        {new Date(inv.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </strong>
                    </span>
                  </div>
                  <div className="date-item">
                    <Clock size={14} />
                    <span>
                      Due: <strong>{new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                  <div className="progress-labels">
                    <span>Payment Progress</span>
                    <strong>{percentage}% Paid</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${isFullyPaid ? 'fill-emerald' : 'fill-amber'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Fee Figures */}
                <div className="inv-amounts-grid">
                  <div className="amount-col">
                    <span className="amt-label">Total Fee</span>
                    <span className="amt-val">{amount.toFixed(2)} ETB</span>
                  </div>
                  <div className="amount-col">
                    <span className="amt-label">Paid So Far</span>
                    <span className="amt-val text-emerald">{amountPaid.toFixed(2)} ETB</span>
                  </div>
                  <div className="amount-col highlight-due">
                    <span className="amt-label">Balance Remaining</span>
                    <span className="amt-val due-val">{balanceRemaining.toFixed(2)} ETB</span>
                  </div>
                </div>

                {/* Card Action */}
                <div className="inv-card-footer">
                  {isParent ? (
                    isFullyPaid ? (
                      <div className="paid-tag-pill">
                        <CheckCircle2 size={16} /> Cleared • No Balance Due
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-pay-card"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <CreditCard size={16} /> Pay Invoice
                      </button>
                    )
                  ) : (
                    <div className="staff-info-tag">
                      Invoice #{inv.id} • {inv.status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal for Parents */}
      {selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPaymentSuccess={() => {
            fetchInvoices();
          }}
        />
      )}

      {/* Generate Invoices Modal for Staff/Admin */}
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
