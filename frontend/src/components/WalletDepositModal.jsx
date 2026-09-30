import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { walletService } from '../services/api';
import {
  X,
  Wallet,
  Smartphone,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  RefreshCw,
  Printer,
  ChevronRight,
  Info
} from 'lucide-react';

// Ethiopian Banking & Payment Systems Ecosystem
export const PAYMENT_PROVIDERS = [
  {
    id: 'CBE',
    name: 'Commercial Bank of Ethiopia',
    shortName: 'CBE',
    nativeName: 'የኢትዮጵያ ንግድ ባንክ',
    category: 'BANK',
    color: '#6b21a8',
    lightBg: '#f3e8ff',
    borderColor: '#d8b4fe',
    accountLabel: '13-digit CBE Account Number',
    accountPlaceholder: '1000xxxxxxxx (13 digits)',
    defaultAccount: '1000284918273',
    instructions: 'Direct account debit via CBE Internet Banking / CBE Birr switch.',
    prefix: 'CBE-FT'
  },
  {
    id: 'TELEBIRR',
    name: 'telebirr (Ethio telecom)',
    shortName: 'Telebirr',
    nativeName: 'ቴሌብር • Ethio Telecom',
    category: 'MOBILE',
    color: '#0284c7',
    lightBg: '#f0f9ff',
    borderColor: '#bae6fd',
    accountLabel: 'Telebirr Registered Phone Number',
    accountPlaceholder: '09xxxxxxxx or 07xxxxxxxx',
    defaultAccount: '0966338211',
    instructions: 'Instant USSD Push prompt (*127#) sent to your mobile phone.',
    prefix: 'TB'
  },
  {
    id: 'BOA',
    name: 'Bank of Abyssinia',
    shortName: 'BoA',
    nativeName: 'የአቢሲኒያ ባንክ • Apollo',
    category: 'BANK',
    color: '#d97706',
    lightBg: '#fffbeb',
    borderColor: '#fde68a',
    accountLabel: 'BoA Account Number',
    accountPlaceholder: '8 to 16-digit BoA Account',
    defaultAccount: '8492019482',
    instructions: 'Debit from Bank of Abyssinia checking/savings account.',
    prefix: 'BOA'
  },
  {
    id: 'AWASH',
    name: 'Awash Bank',
    shortName: 'Awash',
    nativeName: 'አዋሽ ባንክ • Awash Birr',
    category: 'BANK',
    color: '#0f766e',
    lightBg: '#f0fdfa',
    borderColor: '#99f6e4',
    accountLabel: 'Awash Account or Awash Birr Mobile',
    accountPlaceholder: '01xxxxxxxxxx or Mobile 09xxxxxxxx',
    defaultAccount: '01320491827300',
    instructions: 'Awash Online / Awash Birr automated settlement.',
    prefix: 'AW'
  },
  {
    id: 'DASHEN',
    name: 'Dashen Bank (Amole)',
    shortName: 'Dashen',
    nativeName: 'ዳሽን ባንክ • Amole',
    category: 'BANK',
    color: '#1e3a8a',
    lightBg: '#eff6ff',
    borderColor: '#bfdbfe',
    accountLabel: 'Dashen Account or Amole Mobile',
    accountPlaceholder: '51xxxxxxxxxx or 09xxxxxxxx',
    defaultAccount: '510293847162',
    instructions: 'Direct deduction from Dashen Bank / Amole wallet.',
    prefix: 'DSH'
  },
  {
    id: 'COOP',
    name: 'Cooperative Bank of Oromia',
    shortName: 'Coop Bank',
    nativeName: 'Baankii Hojii Gamtaa Oromiyaa (Coopay)',
    category: 'BANK',
    color: '#ea580c',
    lightBg: '#fff7ed',
    borderColor: '#fed7aa',
    accountLabel: 'Coopay-Ebirr Account or Phone',
    accountPlaceholder: '10xxxxxxxxxxxx or 09xxxxxxxx',
    defaultAccount: '109283746192',
    instructions: 'Coopay-Ebirr instant tuition clearance.',
    prefix: 'COP'
  },
  {
    id: 'CARD',
    name: 'Visa & Mastercard Debit/Credit',
    shortName: 'Bank Cards',
    nativeName: 'Local & International Payment Cards',
    category: 'CARD',
    color: '#4f46e5',
    lightBg: '#eef2ff',
    borderColor: '#c7d2fe',
    accountLabel: '16-Digit Card Number',
    accountPlaceholder: '4829 •••• •••• 8421',
    defaultAccount: '4829 5500 1284 8421',
    instructions: 'Processed securely with 3D-Secure Bank OTP verification.',
    prefix: 'CARD'
  },
  {
    id: 'CHAPA',
    name: 'Chapa Unified Online Gateway',
    shortName: 'Chapa',
    nativeName: 'Chapa Financial Technologies',
    category: 'GATEWAY',
    color: '#059669',
    lightBg: '#ecfdf5',
    borderColor: '#a7f3d0',
    accountLabel: 'Email / Phone for Gateway Receipt',
    accountPlaceholder: 'parent@example.com / 09xxxxxxxx',
    defaultAccount: '',
    instructions: 'Opens Chapa hosted checkout (Telebirr, CBE Birr, Cards).',
    prefix: 'CHP'
  }
];

export default function WalletDepositModal({ currentBalance, onClose, onSuccess }) {
  const { user, refreshProfile } = useAuth();
  const presets = [500, 1000, 2500, 5000, 10000];

  const [amount, setAmount] = useState('2500');
  const [selectedProviderId, setSelectedProviderId] = useState('CBE');
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'BANK' | 'MOBILE' | 'CARD'
  const [sourceAccount, setSourceAccount] = useState('1000284918273');
  const [cardHolder, setCardHolder] = useState(user ? `${user.first_name} ${user.last_name}` : 'Tinsaye T');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('842');
  const [customRef, setCustomRef] = useState('');

  // 3D Secure / OTP Simulation step
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const numAmount = parseFloat(amount || 0);
  const currentBal = parseFloat(currentBalance || 0);
  const projectedBalance = currentBal + numAmount;

  const currentProvider = PAYMENT_PROVIDERS.find((p) => p.id === selectedProviderId) || PAYMENT_PROVIDERS[0];

  const handleSelectProvider = (prov) => {
    setSelectedProviderId(prov.id);
    if (prov.id === 'TELEBIRR') {
      setSourceAccount(user?.phone_number || '0966338211');
    } else if (prov.id === 'CARD') {
      setSourceAccount('4829 5500 1284 8421');
    } else if (prov.id === 'CHAPA') {
      setSourceAccount(user?.email || '');
    } else {
      setSourceAccount(prov.defaultAccount || '');
    }
    setError('');
  };

  const handleInitiateDeposit = (e) => {
    if (e) e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError('Please specify a deposit amount greater than 0.');
      return;
    }

    if (!sourceAccount && selectedProviderId !== 'CHAPA') {
      setError(`Please enter your ${currentProvider.accountLabel}.`);
      return;
    }

    // If Card or Telebirr or Bank, show bank authorization step
    if (selectedProviderId === 'CARD' || selectedProviderId === 'TELEBIRR') {
      setIsVerifyingOtp(true);
      return;
    }

    // Direct bank transfer confirmation
    executeDeposit();
  };

  const executeDeposit = async () => {
    setLoading(true);
    setError('');
    try {
      if (selectedProviderId === 'CHAPA') {
        // Initialize real Chapa checkout
        const checkoutRes = await walletService.initializeDepositCheckout(numAmount);
        if (checkoutRes.checkout_url) {
          window.open(checkoutRes.checkout_url, '_blank');
          setSuccessData({
            amount: numAmount,
            newBalance: projectedBalance,
            provider: currentProvider,
            sourceAccount: sourceAccount || user?.email,
            referenceNumber: checkoutRes.tx_ref,
            timestamp: new Date().toISOString(),
            isPendingGateway: true,
          });
          await refreshProfile();
          if (onSuccess) onSuccess();
        }
      } else {
        // Direct debit / mobile settlement
        const randomHex = Math.floor(10000000 + Math.random() * 90000000).toString();
        const refCode = customRef || `${currentProvider.prefix}-${randomHex}`;

        const res = await walletService.deposit(
          numAmount,
          selectedProviderId,
          sourceAccount,
          refCode
        );

        setSuccessData({
          amount: numAmount,
          newBalance: projectedBalance,
          provider: currentProvider,
          sourceAccount: sourceAccount,
          referenceNumber: res.reference_number || refCode,
          timestamp: new Date().toISOString(),
        });

        await refreshProfile();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Deposit could not be processed.');
      setIsVerifyingOtp(false);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = PAYMENT_PROVIDERS.filter((p) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'BANK') return p.category === 'BANK';
    if (filterCategory === 'MOBILE') return p.category === 'MOBILE';
    if (filterCategory === 'CARD') return p.category === 'CARD' || p.category === 'GATEWAY';
    return true;
  });

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-dialog-fintech">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge icon-emerald">
              <Wallet size={22} />
            </div>
            <div>
              <h3>{successData ? 'Tuition Deposit Cleared' : 'Deposit Funds to Escrow'}</h3>
              <p className="modal-subtitle">
                Current Escrow Balance: <strong>{currentBal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {successData ? (
            /* Bank-Grade Verified Receipt */
            <div className="receipt-view">
              <div className="receipt-success-banner">
                <div className="receipt-check-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h4>Funds Transferred & Credited!</h4>
                <p>
                  Debited from <strong>{successData.provider.name}</strong> and locked into FeeBridge Escrow.
                </p>
              </div>

              <div className="receipt-card">
                <div className="receipt-header-row">
                  <div className="receipt-brand-group">
                    <span className="receipt-brand">FEEBRIDGE OFFICIAL ESCROW RECEIPT</span>
                    <span className="receipt-sub-brand">National Tuition Settlement System</span>
                  </div>
                  <span className="receipt-code">{successData.referenceNumber}</span>
                </div>

                <div className="receipt-grid">
                  <div className="receipt-item">
                    <span className="receipt-label">Amount Transferred</span>
                    <span className="receipt-val highlight-amount">
                      +{parseFloat(successData.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Originating Institution</span>
                    <span className="receipt-val highlight-bank">
                      {successData.provider.name}
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Source Account / Identifier</span>
                    <span className="receipt-val font-mono">
                      {successData.sourceAccount ? (
                        successData.sourceAccount.length > 6
                          ? `${successData.sourceAccount.slice(0, 4)}••••${successData.sourceAccount.slice(-4)}`
                          : successData.sourceAccount
                      ) : 'Verified Account'}
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Bank Reference ID</span>
                    <span className="receipt-val font-mono text-emerald">
                      {successData.referenceNumber}
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Destination Account</span>
                    <span className="receipt-val">FeeBridge Escrow (Family Tuition)</span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Updated Escrow Balance</span>
                    <span className="receipt-val text-emerald font-bold">
                      {parseFloat(successData.newBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Authorization Status</span>
                    <span className="receipt-val text-emerald">
                      <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Authorized & Cleared
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Settlement Date</span>
                    <span className="receipt-val">
                      {new Date(successData.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="receipt-compliance-note">
                  <ShieldCheck size={14} className="text-emerald" />
                  <span>
                    Secured by National Bank of Ethiopia compliance regulations. All deposits are protected and dedicated to child tuition.
                  </span>
                </div>
              </div>

              <div className="modal-actions-fintech" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-fintech-secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <button
                  type="button"
                  className="btn-fintech-primary"
                  onClick={onClose}
                >
                  Done & View Balance
                </button>
              </div>
            </div>
          ) : isVerifyingOtp ? (
            /* OTP / USSD Push Verification Screen */
            <div className="verification-step-card">
              <div className="verify-top">
                <div className="verify-bubble" style={{ backgroundColor: currentProvider.lightBg, color: currentProvider.color }}>
                  {selectedProviderId === 'CARD' ? <CreditCard size={28} /> : <Smartphone size={28} />}
                </div>
                <h4>
                  {selectedProviderId === 'CARD' ? 'Bank 3D-Secure Verification' : 'Telebirr USSD Authorization'}
                </h4>
                <p className="verify-instructions">
                  {selectedProviderId === 'CARD'
                    ? `A one-time security code (OTP) was sent to your registered phone for card ending in ${sourceAccount.slice(-4) || '8421'}.`
                    : `Ethio Telecom push authorization prompt has been dispatched to ${sourceAccount}. Please confirm with your PIN.`}
                </p>
              </div>

              <div className="verify-transfer-summary">
                <div className="summary-row">
                  <span>Debiting Institution:</span>
                  <strong>{currentProvider.name}</strong>
                </div>
                <div className="summary-row">
                  <span>Amount to Transfer:</span>
                  <strong className="text-emerald">{numAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                </div>
                <div className="summary-row">
                  <span>Crediting Account:</span>
                  <strong>FeeBridge Escrow Wallet</strong>
                </div>
              </div>

              {selectedProviderId === 'CARD' && (
                <div className="form-group" style={{ margin: '1.25rem 0' }}>
                  <label className="form-label">
                    Enter 6-Digit SMS OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 582910"
                    className="form-input text-center text-tracking-widest"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    autoFocus
                  />
                  <span className="input-hint">Demo verification: enter any 6 digits (e.g. 123456)</span>
                </div>
              )}

              {selectedProviderId === 'TELEBIRR' && (
                <div className="telebirr-ussd-simulator">
                  <div className="ussd-phone-mock">
                    <span className="ussd-badge">📱 Live USSD Prompt</span>
                    <p className="ussd-text">
                      "telebirr: Confirm payment of {numAmount} ETB to FeeBridge Escrow? Reply 1 with your 4-digit PIN."
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert-error" style={{ margin: '0.75rem 0' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="modal-actions-fintech">
                <button
                  type="button"
                  className="btn-fintech-secondary"
                  disabled={loading}
                  onClick={() => setIsVerifyingOtp(false)}
                >
                  Change Method
                </button>
                <button
                  type="button"
                  className="btn-fintech-primary"
                  disabled={loading}
                  onClick={executeDeposit}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="spinner" /> Authorizing Transfer...
                    </>
                  ) : (
                    <>
                      <Lock size={15} /> Confirm & Credit Escrow
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Step 1 & 2: Amount & Funding Source Selection Form */
            <form onSubmit={handleInitiateDeposit} className="deposit-form">
              {/* Amount Selection */}
              <div className="deposit-section">
                <label className="section-sub-label">1. SPECIFY DEPOSIT AMOUNT (ETB)</label>
                <div className="preset-chips-row">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`preset-chip ${amount === String(preset) ? 'preset-chip-active' : ''}`}
                      onClick={() => setAmount(String(preset))}
                    >
                      +{preset.toLocaleString()} ETB
                    </button>
                  ))}
                </div>

                <div className="amount-input-box">
                  <span className="amount-currency-tag">ETB</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="amount-input-field"
                    required
                  />
                </div>
                <div className="projected-balance-row">
                  <span>Projected Escrow Balance:</span>
                  <strong>{projectedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                </div>
              </div>

              {/* Funding Source Selector */}
              <div className="deposit-section" style={{ marginTop: '1.25rem' }}>
                <div className="funding-section-header">
                  <label className="section-sub-label">2. SELECT FUNDING SOURCE (WHERE DOES THE MONEY COME FROM?)</label>
                  {/* Category Filter Tabs */}
                  <div className="funding-filter-tabs">
                    <button
                      type="button"
                      className={`filter-tab ${filterCategory === 'ALL' ? 'filter-tab-active' : ''}`}
                      onClick={() => setFilterCategory('ALL')}
                    >
                      All ({PAYMENT_PROVIDERS.length})
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${filterCategory === 'BANK' ? 'filter-tab-active' : ''}`}
                      onClick={() => setFilterCategory('BANK')}
                    >
                      Banks (5)
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${filterCategory === 'MOBILE' ? 'filter-tab-active' : ''}`}
                      onClick={() => setFilterCategory('MOBILE')}
                    >
                      Mobile Money
                    </button>
                    <button
                      type="button"
                      className={`filter-tab ${filterCategory === 'CARD' ? 'filter-tab-active' : ''}`}
                      onClick={() => setFilterCategory('CARD')}
                    >
                      Cards & Chapa
                    </button>
                  </div>
                </div>

                {/* Provider Cards Grid */}
                <div className="funding-providers-grid">
                  {filteredProviders.map((prov) => {
                    const isSelected = prov.id === selectedProviderId;
                    return (
                      <div
                        key={prov.id}
                        className={`provider-card ${isSelected ? 'provider-card-selected' : ''}`}
                        onClick={() => handleSelectProvider(prov)}
                        style={{
                          borderColor: isSelected ? prov.color : '#e2e8f0',
                          backgroundColor: isSelected ? prov.lightBg : '#ffffff'
                        }}
                      >
                        <div className="prov-card-header">
                          <div
                            className="prov-icon-circle"
                            style={{ backgroundColor: prov.lightBg, color: prov.color }}
                          >
                            {prov.category === 'BANK' && <Building size={16} />}
                            {prov.category === 'MOBILE' && <Smartphone size={16} />}
                            {prov.category === 'CARD' && <CreditCard size={16} />}
                            {prov.category === 'GATEWAY' && <Zap size={16} />}
                          </div>
                          <span
                            className="prov-category-badge"
                            style={{ color: prov.color, backgroundColor: prov.lightBg }}
                          >
                            {prov.category}
                          </span>
                        </div>
                        <strong className="prov-name">{prov.name}</strong>
                        <span className="prov-native">{prov.nativeName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Account / Authentication Details */}
              <div className="funding-details-box" style={{ borderColor: currentProvider.borderColor }}>
                <div className="funding-details-header">
                  <div className="details-header-title">
                    <span className="details-eyebrow">DEBITING FROM</span>
                    <h4>{currentProvider.name}</h4>
                  </div>
                  <span className="details-note">{currentProvider.instructions}</span>
                </div>

                {selectedProviderId === 'CARD' ? (
                  /* Full Card Details */
                  <div className="card-fields-grid">
                    <div className="form-group span-2">
                      <label className="form-label">Cardholder Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Name on card"
                        required
                      />
                    </div>

                    <div className="form-group span-2">
                      <label className="form-label">16-Digit Card Number</label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        value={sourceAccount}
                        onChange={(e) => setSourceAccount(e.target.value)}
                        placeholder="4829 •••• •••• 8421"
                        maxLength={19}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expiration Date</label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Security CVV</label>
                      <input
                        type="password"
                        className="form-input font-mono"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="3 digits"
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>
                ) : selectedProviderId === 'CHAPA' ? (
                  /* Chapa Online Redirect Explanation */
                  <div className="chapa-redirect-note">
                    <Zap size={20} className="text-emerald" />
                    <div>
                      <strong>Chapa Unified Gateway</strong>
                      <p>
                        You will be directed to Chapa's official SSL checkout window to complete payment with Telebirr, CBE Birr, or Visa/Mastercard.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Bank Account or Mobile Number */
                  <div className="account-fields-grid">
                    <div className="form-group">
                      <label className="form-label">{currentProvider.accountLabel}</label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder={currentProvider.accountPlaceholder}
                        value={sourceAccount}
                        onChange={(e) => setSourceAccount(e.target.value)}
                        required
                      />
                      <span className="input-hint">
                        {selectedProviderId === 'CBE' && 'Example: 1000284918273'}
                        {selectedProviderId === 'TELEBIRR' && 'Example: 0966338211 or 07xxxxxxxx'}
                        {selectedProviderId === 'BOA' && 'Example: 8492019482'}
                        {selectedProviderId === 'AWASH' && 'Example: 01320491827300'}
                        {selectedProviderId === 'DASHEN' && 'Example: 510293847162'}
                        {selectedProviderId === 'COOP' && 'Example: 109283746192'}
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Transfer Reference / Slip (Optional)</label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder={`Auto-generated e.g. ${currentProvider.prefix}-XXXXXXXX`}
                        value={customRef}
                        onChange={(e) => setCustomRef(e.target.value)}
                      />
                      <span className="input-hint">Leave blank to auto-generate official audit code</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="alert-error" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-actions-fintech" style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-fintech-secondary"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-fintech-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="spinner" /> Debiting & Crediting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Authorize Deposit of {numAmount > 0 ? `${numAmount.toLocaleString()} ETB` : ''}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
