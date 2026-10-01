import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { walletService } from '../services/api';
import WalletDepositModal from './WalletDepositModal';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Receipt,
  Calendar,
  Clock,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Download,
  Filter,
  CheckCircle2,
  Cpu,
  Radio,
  ExternalLink,
  Printer
} from 'lucide-react';

export default function WalletView({ onNavigateBack, onNavigateToInvoices }) {
  const { user, refreshProfile } = useAuth();
  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTxTab, setActiveTxTab] = useState('ALL'); // 'ALL' | 'DEPOSIT' | 'DEDUCTION'
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState('1000.00');
  const [savingAutoPay, setSavingAutoPay] = useState(false);
  const [autoPaySuccessMsg, setAutoPaySuccessMsg] = useState('');

  const fetchWallet = async () => {
    setLoading(true);
    setError('');
    try {
      const [walletRes, txRes] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getTransactions(),
      ]);
      setWalletData(walletRes);
      setTransactions(txRes);
      setAutoPayEnabled(walletRes.auto_pay_enabled ?? false);
      if (walletRes.low_balance_threshold !== undefined && walletRes.low_balance_threshold !== null) {
        setLowBalanceThreshold(String(walletRes.low_balance_threshold));
      }
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'Could not fetch wallet data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoPay = async (newVal) => {
    setAutoPayEnabled(newVal);
    setSavingAutoPay(true);
    setAutoPaySuccessMsg('');
    try {
      const updated = await walletService.toggleAutoPay(newVal, lowBalanceThreshold);
      setWalletData(updated);
      setAutoPaySuccessMsg(
        newVal
          ? 'Auto-Pay Activated: Due tuition & milestone installments will automatically settle!'
          : 'Auto-Pay Paused: Invoices will require manual clearance.'
      );
      setTimeout(() => setAutoPaySuccessMsg(''), 4500);
    } catch (err) {
      alert(err.message || 'Failed to update Auto-Pay settings.');
      setAutoPayEnabled(!newVal);
    } finally {
      setSavingAutoPay(false);
    }
  };

  const handleSaveThreshold = async (e) => {
    if (e) e.preventDefault();
    setSavingAutoPay(true);
    setAutoPaySuccessMsg('');
    try {
      const updated = await walletService.toggleAutoPay(autoPayEnabled, lowBalanceThreshold);
      setWalletData(updated);
      setAutoPaySuccessMsg(`Low-balance threshold updated to ${parseFloat(lowBalanceThreshold).toLocaleString()} ETB.`);
      setTimeout(() => setAutoPaySuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update threshold.');
    } finally {
      setSavingAutoPay(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTxTab === 'ALL') return true;
    return tx.transaction_type === activeTxTab;
  });

  const currentBalance = parseFloat(walletData?.balance || user?.wallet_balance || 0);
  const totalDeposited = parseFloat(walletData?.total_deposited || 0);
  const totalDeducted = parseFloat(walletData?.total_deducted || 0);

  const depositCount = transactions.filter((t) => t.transaction_type === 'DEPOSIT').length;
  const deductionCount = transactions.filter((t) => t.transaction_type === 'DEDUCTION').length;

  const handleExportCSV = () => {
    if (!transactions.length) return;
    const headers = [
      'ID',
      'Type',
      'Amount (ETB)',
      'Date',
      'Funding Source',
      'Source Account',
      'Bank Reference',
      'Related Student',
      'Invoice Month'
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.transaction_type,
      t.amount,
      t.created_at,
      t.funding_source || (t.transaction_type === 'DEPOSIT' ? 'Direct Bank' : 'Wallet Escrow'),
      t.source_account || 'N/A',
      t.reference_number || (t.transaction_type === 'DEPOSIT' ? `DEP-${t.id}` : `RCP-${t.id}`),
      t.student_name || 'N/A',
      t.invoice_month || 'N/A',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FeeBridge_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFundingSourceBadge = (tx) => {
    const isDeposit = tx.transaction_type === 'DEPOSIT';
    const source = (tx.funding_source || (isDeposit ? 'CBE' : 'WALLET')).toUpperCase();
    const account = tx.source_account;

    const badgeMap = {
      CBE: { label: 'Commercial Bank of Ethiopia', color: '#6b21a8', bg: '#f3e8ff' },
      TELEBIRR: { label: 'Telebirr (Ethio telecom)', color: '#0284c7', bg: '#f0f9ff' },
      BOA: { label: 'Bank of Abyssinia', color: '#d97706', bg: '#fffbeb' },
      AWASH: { label: 'Awash Bank', color: '#0f766e', bg: '#f0fdfa' },
      DASHEN: { label: 'Dashen Bank', color: '#1e3a8a', bg: '#eff6ff' },
      COOP: { label: 'Coop Bank', color: '#ea580c', bg: '#fff7ed' },
      CARD: { label: 'Visa / Mastercard', color: '#4f46e5', bg: '#eef2ff' },
      CHAPA: { label: 'Chapa Gateway', color: '#059669', bg: '#ecfdf5' },
      WALLET: { label: 'Digital Escrow Wallet', color: '#059669', bg: '#ecfdf5' },
    };

    const info = badgeMap[source] || {
      label: isDeposit ? 'Direct Bank Transfer' : 'Escrow Wallet',
      color: '#475569',
      bg: '#f1f5f9'
    };

    return (
      <div className="funding-source-cell">
        <span
          className="channel-badge-pro"
          style={{ color: info.color, backgroundColor: info.bg, border: `1px solid ${info.color}30` }}
        >
          {info.label}
        </span>
        {account && (
          <span className="source-account-sub">
            {account.length > 8 ? `${account.slice(0, 4)}••••${account.slice(-4)}` : account}
          </span>
        )}
      </div>
    );
  };


  return (
    <div className="fintech-wallet-container">
      {/* Top Banner: Virtual Card Visualizer + Quick Actions */}
      <div className="wallet-card-and-actions-grid">
        {/* Virtual Card Component */}
        <div className="virtual-card-wrapper">
          <div className="virtual-card-surface">
            {/* Holographic background sheen */}
            <div className="virtual-card-sheen"></div>

            <div className="virtual-card-top">
              <div className="card-brand-badge">
                <span className="card-brand-text">FeeBridge</span>
                <span className="card-tier-pill">PLATINUM ESCROW</span>
              </div>
              <div className="card-chip-row">
                <div className="emv-chip">
                  <div className="chip-line"></div>
                  <div className="chip-line horizontal"></div>
                </div>
                <Radio size={20} className="contactless-icon" />
              </div>
            </div>

            <div className="virtual-card-number">
              <span>4829</span>
              <span>••••</span>
              <span>••••</span>
              <span>8421</span>
            </div>

            <div className="virtual-card-bottom">
              <div className="card-holder-group">
                <span className="card-field-label">CARDHOLDER</span>
                <span className="card-holder-name">
                  {user?.first_name} {user?.last_name}
                </span>
              </div>
              <div className="card-expiry-group">
                <span className="card-field-label">VALID THRU</span>
                <span className="card-expiry-date">12/29</span>
              </div>
              <div className="card-network-symbol">
                <div className="network-circle circle-emerald"></div>
                <div className="network-circle circle-amber"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Balance & Action Terminal */}
        <div className="balance-terminal-card">
          <div className="terminal-header">
            <div className="terminal-title-group">
              <span className="terminal-eyebrow">LIQUID TUITION BALANCE</span>
              <div className="terminal-balance-row">
                <h1 className="terminal-balance-num">
                  {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h1>
                <span className="terminal-currency">ETB</span>
              </div>
            </div>
            <div className="terminal-status-pill">
              <span className="terminal-live-dot"></span>
              <span>Active Account</span>
            </div>
          </div>

          <p className="terminal-desc">
            Funds in this digital escrow wallet are reserved for tuition settlement and can be cleared with 1-click or automated schedules.
          </p>

          {/* Quick Action Buttons */}
          <div className="terminal-actions-row">
            <button
              type="button"
              className="btn-fintech-primary"
              onClick={() => setIsDepositModalOpen(true)}
            >
              <PlusCircle size={16} /> Top-up Balance
            </button>
            <button
              type="button"
              className="btn-fintech-secondary"
              onClick={onNavigateToInvoices}
            >
              <Receipt size={16} /> Settle Invoices
            </button>
            <button
              type="button"
              className="btn-fintech-ghost"
              onClick={handleExportCSV}
              title="Download Statement (CSV)"
            >
              <Download size={16} /> Statement
            </button>
          </div>

          {/* Automated Escrow Settlement Module */}
          <div className="autopay-settings-card">
            <div className="autopay-card-header">
              <div className="autopay-header-text">
                <div className="autopay-title-row">
                  <ShieldCheck size={16} className={autoPayEnabled ? "text-emerald" : "text-muted"} />
                  <strong>Escrow Auto-Pay Guarantee</strong>
                  <span className={`status-pill ${autoPayEnabled ? "status-paid" : "status-unpaid"}`}>
                    {autoPayEnabled ? "Active Guarantee" : "Paused"}
                  </span>
                </div>
                <p className="autopay-explainer">
                  Automatically clear tuition invoices & milestone schedules from your escrow balance on their exact due dates.
                </p>
              </div>

              <label className="toggle-switch" title="Toggle Auto-Pay">
                <input
                  type="checkbox"
                  checked={autoPayEnabled}
                  disabled={savingAutoPay}
                  onChange={(e) => handleToggleAutoPay(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Threshold Configuration */}
            <form onSubmit={handleSaveThreshold} className="autopay-threshold-row">
              <div className="threshold-input-group">
                <label className="micro-label">LOW BALANCE ALERT THRESHOLD</label>
                <div className="threshold-field-wrapper">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    className="input-fintech threshold-input"
                    value={lowBalanceThreshold}
                    onChange={(e) => setLowBalanceThreshold(e.target.value)}
                    placeholder="1000"
                  />
                  <span className="threshold-unit">ETB</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn-save-threshold"
                disabled={savingAutoPay}
              >
                {savingAutoPay ? 'Saving...' : 'Set Alert Level'}
              </button>
            </form>

            {autoPaySuccessMsg && (
              <div className="autopay-toast-success">
                <CheckCircle2 size={14} />
                <span>{autoPaySuccessMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Velocity Cards */}
      <div className="velocity-metrics-grid">
        <div className="metric-box inflow-box">
          <div className="metric-box-top">
            <span className="metric-title">TOTAL DEPOSITED (INFLOW)</span>
            <div className="metric-icon-bubble bubble-emerald">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="metric-big-num text-emerald">
            +{totalDeposited.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
          </div>
          <div className="metric-sub-bar">
            <span className="metric-sub-text">{depositCount} deposit transactions completed</span>
          </div>
        </div>

        <div className="metric-box outflow-box">
          <div className="metric-box-top">
            <span className="metric-title">TUITION CLEARED (OUTFLOW)</span>
            <div className="metric-icon-bubble bubble-indigo">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="metric-big-num text-slate">
            -{totalDeducted.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
          </div>
          <div className="metric-sub-bar">
            <span className="metric-sub-text">{deductionCount} invoice fees fulfilled</span>
          </div>
        </div>

        <div className="metric-box net-box">
          <div className="metric-box-top">
            <span className="metric-title">NET AVAILABLE RESERVE</span>
            <div className="metric-icon-bubble bubble-mint">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="metric-big-num text-emerald">
            {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
          </div>
          <div className="metric-sub-bar">
            <span className="metric-sub-text">100% Available for instant clearance</span>
          </div>
        </div>
      </div>

      {/* Professional Transaction Ledger */}
      <div className="fintech-ledger-card">
        {/* Ledger Header & Tabs */}
        <div className="ledger-header-row">
          <div className="ledger-title-group">
            <h3>Transaction Ledger</h3>
            <span className="ledger-subtitle">Audited record of all deposits, tuition payments, and receipts</span>
          </div>

          <div className="ledger-tabs-group">
            <button
              type="button"
              className={`ledger-tab ${activeTxTab === 'ALL' ? 'ledger-tab-active' : ''}`}
              onClick={() => setActiveTxTab('ALL')}
            >
              All Activity ({transactions.length})
            </button>
            <button
              type="button"
              className={`ledger-tab ${activeTxTab === 'DEPOSIT' ? 'ledger-tab-active' : ''}`}
              onClick={() => setActiveTxTab('DEPOSIT')}
            >
              Deposits ({depositCount})
            </button>
            <button
              type="button"
              className={`ledger-tab ${activeTxTab === 'DEDUCTION' ? 'ledger-tab-active' : ''}`}
              onClick={() => setActiveTxTab('DEDUCTION')}
            >
              Tuition Payments ({deductionCount})
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading ledger entries...</p>
          </div>
        ) : error ? (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-ledger-state">
            <Wallet size={40} className="text-muted" />
            <h4>No Ledger Records Found</h4>
            <p>There are no transactions under this view yet.</p>
            <button
              type="button"
              className="btn-fintech-primary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setIsDepositModalOpen(true)}
            >
              <PlusCircle size={15} /> Make First Deposit
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="fintech-table">
              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>CHANNEL / METHOD</th>
                  <th>DATE & TIME</th>
                  <th>REFERENCE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT (ETB)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const isDeposit = tx.transaction_type === 'DEPOSIT';
                  const amt = parseFloat(tx.amount || 0);

                  return (
                    <tr key={tx.id} className="ledger-row">
                      {/* Description + Icon */}
                      <td>
                        <div className="ledger-tx-name-cell">
                          <div className={`ledger-type-circle ${isDeposit ? 'type-deposit' : 'type-deduct'}`}>
                            {isDeposit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                          </div>
                          <div>
                            <strong className="tx-cell-title">
                              {isDeposit ? 'Wallet Funds Deposit' : `Tuition Clearance`}
                            </strong>
                            {tx.student_name && (
                              <span className="tx-cell-sub">
                                Student: {tx.student_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Channel / Funding Origin */}
                      <td>
                        {getFundingSourceBadge(tx)}
                      </td>

                      {/* Date */}
                      <td>
                        <div className="date-cell">
                          <span>{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="time-sub">{new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Bank Reference */}
                      <td>
                        <code className="reference-code">
                          {tx.reference_number || (isDeposit ? `DEP-${tx.id.toString().padStart(6, '0')}` : `RCP-${tx.id.toString().padStart(6, '0')}`)}
                        </code>
                      </td>


                      {/* Status */}
                      <td>
                        <span className="status-pill status-settled">
                          <CheckCircle2 size={12} /> Settled
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ textAlign: 'right' }}>
                        <strong className={`ledger-amount ${isDeposit ? 'amt-positive' : 'amt-negative'}`}>
                          {isDeposit ? `+${amt.toFixed(2)}` : `-${amt.toFixed(2)}`}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <WalletDepositModal
          currentBalance={currentBalance}
          onClose={() => setIsDepositModalOpen(false)}
          onSuccess={() => {
            fetchWallet();
          }}
        />
      )}
    </div>
  );
}
