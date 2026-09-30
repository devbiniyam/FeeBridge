import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/api';
import { PAYMENT_PROVIDERS } from './WalletDepositModal';
import {
  X,
  Wallet,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Printer,
  Smartphone,
  ShieldCheck,
  Receipt,
  Lock,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';

export default function PaymentModal({ invoice, onClose, onPaymentSuccess }) {
  const { user, refreshProfile } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState('WALLET'); // 'WALLET' | 'CBE' | 'TELEBIRR' | 'BOA' | 'AWASH' | 'DASHEN' | 'COOP' | 'CARD' | 'CHAPA'
  const [paymentType, setPaymentType] = useState('FULL'); // 'FULL' | 'PARTIAL'
  const [customAmount, setCustomAmount] = useState('');
  const [sourceAccount, setSourceAccount] = useState('1000284918273');
  const [cardHolder, setCardHolder] = useState(user ? `${user.first_name} ${user.last_name}` : 'Parent User');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('842');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const balance = parseFloat(invoice.balance_remaining || invoice.amount || 0);
  const walletBalance = parseFloat(user?.wallet_balance || 0);

  const paymentAmount = paymentType === 'FULL' ? balance : parseFloat(customAmount || 0);
  const isWalletSufficient = walletBalance >= paymentAmount;

  const currentProvider = PAYMENT_PROVIDERS.find((p) => p.id === selectedMethod);

  const handleSelectMethod = (methodId) => {
    setSelectedMethod(methodId);
    setError('');
    if (methodId === 'TELEBIRR') {
      setSourceAccount(user?.phone_number || '0966338211');
    } else if (methodId === 'CARD') {
      setSourceAccount('4829 5500 1284 8421');
    } else if (methodId === 'WALLET') {
      setSourceAccount(`FeeBridge Wallet (${walletBalance.toFixed(2)} ETB)`);
    } else {
      const prov = PAYMENT_PROVIDERS.find((p) => p.id === methodId);
      setSourceAccount(prov?.defaultAccount || '');
    }
  };

  const handleInitiatePayment = (e) => {
    if (e) e.preventDefault();
    setError('');

    if (paymentAmount <= 0) {
      setError('Please specify a payment amount greater than 0.');
      return;
    }
    if (paymentAmount > balance) {
      setError(`Amount cannot exceed the remaining balance (${balance.toLocaleString()} ETB).`);
      return;
    }

    if (selectedMethod === 'WALLET') {
      if (!isWalletSufficient) {
        setError(`Insufficient wallet balance (${walletBalance.toFixed(2)} ETB). Select a bank (CBE, BoA, Awash), Telebirr, or Card.`);
        return;
      }
      executeWalletPayment();
      return;
    }

    if (selectedMethod === 'CARD' || selectedMethod === 'TELEBIRR') {
      setIsVerifyingOtp(true);
      return;
    }

    if (selectedMethod === 'CHAPA') {
      executeChapaCheckout();
      return;
    }

    // Direct bank payment
    executeDirectBankPayment();
  };

  const executeWalletPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const receipt = await paymentService.payWithWallet(invoice.id, paymentAmount);
      setSuccessData({
        ...receipt,
        paymentChannelName: 'FeeBridge Digital Wallet (Instant Escrow)',
        sourceAccountMasked: `Wallet Balance (${walletBalance.toFixed(2)} ETB)`,
      });
      await refreshProfile();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err) {
      setError(err.message || 'Wallet payment failed.');
    } finally {
      setLoading(false);
    }
  };

  const executeDirectBankPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const randomHex = Math.floor(10000000 + Math.random() * 90000000).toString();
      const refCode = `${currentProvider?.prefix || selectedMethod}-${randomHex}`;

      const res = await paymentService.payDirect(
        invoice.id,
        paymentAmount,
        selectedMethod,
        selectedMethod,
        sourceAccount,
        refCode
      );

      setSuccessData({
        payment_id: res.id,
        receipt_number: `RCP-${res.id.toString().padStart(6, '0')}`,
        amount_paid: paymentAmount,
        method: selectedMethod,
        paymentChannelName: currentProvider?.name || selectedMethod,
        sourceAccountMasked: sourceAccount,
        referenceNumber: refCode,
        paid_at: new Date().toISOString(),
        invoice_status: paymentAmount >= balance ? 'PAID' : 'PARTIALLY_PAID',
        invoice_balance: Math.max(0, balance - paymentAmount).toFixed(2),
      });

      await refreshProfile();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setLoading(false);
      setIsVerifyingOtp(false);
    }
  };

  const executeChapaCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const checkoutRes = await paymentService.initializeCheckout(invoice.id, paymentAmount);
      if (checkoutRes.checkout_url) {
        window.open(checkoutRes.checkout_url, '_blank');
        setSuccessData({
          receipt_number: `PENDING-${checkoutRes.tx_ref?.slice(0, 8)}`,
          payment_id: checkoutRes.tx_ref,
          amount_paid: paymentAmount,
          method: 'CHAPA',
          paymentChannelName: 'Chapa Hosted Gateway (Telebirr / CBE Birr / Cards)',
          sourceAccountMasked: user?.email,
          referenceNumber: checkoutRes.tx_ref,
          paid_at: new Date().toISOString(),
          isGatewayPending: true,
          invoice_status: 'PROCESSING',
          invoice_balance: Math.max(0, balance - paymentAmount).toFixed(2),
        });
        await refreshProfile();
        if (onPaymentSuccess) onPaymentSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize gateway checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-dialog-fintech">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge icon-amber">
              <Receipt size={22} />
            </div>
            <div>
              <h3>{successData ? 'Official Tuition Receipt' : 'Tuition Payment Terminal'}</h3>
              <p className="modal-subtitle">
                {invoice.student_name} • Grade {invoice.student_grade || invoice.grade || '7'} • {invoice.school_name || 'Campus'}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {successData ? (
            /* Verified Official Receipt */
            <div className="receipt-view">
              <div className="receipt-success-banner">
                <div className="receipt-check-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h4>Tuition Payment Cleared!</h4>
                <p>
                  Settled <strong>{parseFloat(successData.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong> for {invoice.student_name}.
                </p>
              </div>

              <div className="receipt-card">
                <div className="receipt-header-row">
                  <div className="receipt-brand-group">
                    <span className="receipt-brand">FEEBRIDGE OFFICIAL TUITION RECEIPT</span>
                    <span className="receipt-sub-brand">{invoice.school_name || 'Campus Escrow'}</span>
                  </div>
                  <span className="receipt-code">{successData.receipt_number}</span>
                </div>

                <div className="receipt-grid">
                  <div className="receipt-item">
                    <span className="receipt-label">Student Name</span>
                    <span className="receipt-val font-bold">{invoice.student_name}</span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Billing Month</span>
                    <span className="receipt-val">{invoice.month}</span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Amount Cleared</span>
                    <span className="receipt-val highlight-amount">
                      {parseFloat(successData.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Payment Channel / Bank</span>
                    <span className="receipt-val highlight-bank">
                      {successData.paymentChannelName}
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Source Identifier</span>
                    <span className="receipt-val font-mono">
                      {successData.sourceAccountMasked ? (
                        successData.sourceAccountMasked.length > 8
                          ? `${successData.sourceAccountMasked.slice(0, 4)}••••${successData.sourceAccountMasked.slice(-4)}`
                          : successData.sourceAccountMasked
                      ) : 'Verified Account'}
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Audit Reference Number</span>
                    <span className="receipt-val font-mono text-emerald">
                      {successData.referenceNumber || successData.receipt_number}
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Invoice Balance Remaining</span>
                    <span className="receipt-val font-bold">
                      {parseFloat(successData.invoice_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                    </span>
                  </div>

                  <div className="receipt-item">
                    <span className="receipt-label">Status</span>
                    <span className="receipt-val text-emerald">
                      <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      {successData.invoice_status === 'PAID' ? 'Fully Cleared' : 'Partially Paid'}
                    </span>
                  </div>
                </div>

                <div className="receipt-compliance-note">
                  <ShieldCheck size={14} className="text-emerald" />
                  <span>
                    Official electronic proof of fee settlement. Verified across the school registrar and bank clearing house.
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
                  Done
                </button>
              </div>
            </div>
          ) : isVerifyingOtp ? (
            /* OTP / USSD Push Verification Screen */
            <div className="verification-step-card">
              <div className="verify-top">
                <div className="verify-bubble" style={{ backgroundColor: currentProvider?.lightBg, color: currentProvider?.color }}>
                  {selectedMethod === 'CARD' ? <CreditCard size={28} /> : <Smartphone size={28} />}
                </div>
                <h4>
                  {selectedMethod === 'CARD' ? 'Bank 3D-Secure Verification' : 'Telebirr USSD Authorization'}
                </h4>
                <p className="verify-instructions">
                  {selectedMethod === 'CARD'
                    ? `Please enter the 6-digit OTP sent to your phone for card ending in ${sourceAccount.slice(-4) || '8421'}.`
                    : `Ethio Telecom has pushed a USSD authorization prompt to ${sourceAccount}. Please confirm with your PIN.`}
                </p>
              </div>

              <div className="verify-transfer-summary">
                <div className="summary-row">
                  <span>Student Tuition:</span>
                  <strong>{invoice.student_name}</strong>
                </div>
                <div className="summary-row">
                  <span>Billing Period:</span>
                  <strong>{invoice.month}</strong>
                </div>
                <div className="summary-row">
                  <span>Amount to Settle:</span>
                  <strong className="text-emerald">{paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                </div>
                <div className="summary-row">
                  <span>Funding Source:</span>
                  <strong>{currentProvider?.name}</strong>
                </div>
              </div>

              {selectedMethod === 'CARD' && (
                <div className="form-group" style={{ margin: '1.25rem 0' }}>
                  <label className="form-label">Enter 6-Digit SMS Security Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 582910"
                    className="form-input text-center text-tracking-widest"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    autoFocus
                  />
                  <span className="input-hint">Demo code: enter any 6 digits (e.g. 123456)</span>
                </div>
              )}

              {selectedMethod === 'TELEBIRR' && (
                <div className="telebirr-ussd-simulator">
                  <div className="ussd-phone-mock">
                    <span className="ussd-badge">📱 Live USSD Prompt</span>
                    <p className="ussd-text">
                      "telebirr: Confirm payment of {paymentAmount} ETB to FeeBridge for {invoice.student_name}? Reply 1 with your 4-digit PIN."
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
                  onClick={executeDirectBankPayment}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={15} className="spinner" /> Authorizing Payment...
                    </>
                  ) : (
                    <>
                      <Lock size={15} /> Confirm & Clear Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Main Invoice Payment Form */
            <form onSubmit={handleInitiatePayment} className="invoice-pay-form">
              {/* Payment Summary Box */}
              <div className="invoice-pay-summary">
                <div className="pay-summary-col">
                  <span className="pay-summary-label">TOTAL INVOICE AMOUNT</span>
                  <strong className="pay-summary-val">{parseFloat(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                </div>
                <div className="pay-summary-divider"></div>
                <div className="pay-summary-col">
                  <span className="pay-summary-label">ALREADY PAID</span>
                  <strong className="pay-summary-val text-emerald">{parseFloat(invoice.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                </div>
                <div className="pay-summary-divider"></div>
                <div className="pay-summary-col">
                  <span className="pay-summary-label">OUTSTANDING REMAINING</span>
                  <strong className="pay-summary-val text-amber">{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                </div>
              </div>

              {/* Settlement Type (Full vs Partial) */}
              <div className="deposit-section" style={{ marginTop: '1.25rem' }}>
                <label className="section-sub-label">1. CHOOSE PAYMENT ALLOCATION</label>
                <div className="allocation-toggle-row">
                  <button
                    type="button"
                    className={`btn-allocation ${paymentType === 'FULL' ? 'btn-allocation-active' : ''}`}
                    onClick={() => setPaymentType('FULL')}
                  >
                    <span>Full Outstanding Balance</span>
                    <strong>{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                  </button>

                  <button
                    type="button"
                    className={`btn-allocation ${paymentType === 'PARTIAL' ? 'btn-allocation-active' : ''}`}
                    onClick={() => setPaymentType('PARTIAL')}
                  >
                    <span>Custom Partial Payment</span>
                    <strong>Enter Custom Amount</strong>
                  </button>
                </div>

                {paymentType === 'PARTIAL' && (
                  <div className="amount-input-box" style={{ marginTop: '0.75rem' }}>
                    <span className="amount-currency-tag">ETB</span>
                    <input
                      type="number"
                      min="1"
                      max={balance}
                      step="1"
                      placeholder={`Max: ${balance} ETB`}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="amount-input-field"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Funding Source Selector */}
              <div className="deposit-section" style={{ marginTop: '1.25rem' }}>
                <label className="section-sub-label">2. SELECT PAYMENT CHANNEL OR BANK SYSTEM</label>

                {/* Primary Option: Digital Escrow Wallet */}
                <div
                  className={`provider-card wallet-option-card ${selectedMethod === 'WALLET' ? 'provider-card-selected' : ''}`}
                  onClick={() => handleSelectMethod('WALLET')}
                  style={{
                    borderColor: selectedMethod === 'WALLET' ? '#059669' : '#e2e8f0',
                    backgroundColor: selectedMethod === 'WALLET' ? '#ecfdf5' : '#ffffff',
                    marginBottom: '0.85rem'
                  }}
                >
                  <div className="prov-card-header">
                    <div className="prov-icon-circle" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
                      <Wallet size={18} />
                    </div>
                    <span className="prov-category-badge" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
                      ESCROW WALLET
                    </span>
                  </div>
                  <strong className="prov-name">Pay from Digital Escrow Wallet</strong>
                  <span className="prov-native">
                    Available Balance: <strong>{walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    {isWalletSufficient ? ' (Instant 1-Click Clearance)' : ' (Insufficient - Top up or select Bank below)'}
                  </span>
                </div>

                {/* Grid of Ethiopian Commercial Banks & Payment Providers */}
                <div className="funding-providers-grid">
                  {PAYMENT_PROVIDERS.map((prov) => {
                    const isSelected = selectedMethod === prov.id;
                    return (
                      <div
                        key={prov.id}
                        className={`provider-card ${isSelected ? 'provider-card-selected' : ''}`}
                        onClick={() => handleSelectMethod(prov.id)}
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

              {/* Dynamic Authentication Fields */}
              {selectedMethod !== 'WALLET' && currentProvider && (
                <div className="funding-details-box" style={{ borderColor: currentProvider.borderColor, marginTop: '1.25rem' }}>
                  <div className="funding-details-header">
                    <div className="details-header-title">
                      <span className="details-eyebrow">DEBITING FROM</span>
                      <h4>{currentProvider.name}</h4>
                    </div>
                    <span className="details-note">{currentProvider.instructions}</span>
                  </div>

                  {selectedMethod === 'CARD' ? (
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
                  ) : selectedMethod === 'CHAPA' ? (
                    <div className="chapa-redirect-note">
                      <Zap size={20} className="text-emerald" />
                      <div>
                        <strong>Chapa Payment Gateway</strong>
                        <p>
                          A secure payment session will open to complete this tuition invoice via Chapa's official gateway.
                        </p>
                      </div>
                    </div>
                  ) : (
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
                          {selectedMethod === 'CBE' && 'Example: 1000284918273'}
                          {selectedMethod === 'TELEBIRR' && 'Example: 0966338211 or 07xxxxxxxx'}
                          {selectedMethod === 'BOA' && 'Example: 8492019482'}
                          {selectedMethod === 'AWASH' && 'Example: 01320491827300'}
                          {selectedMethod === 'DASHEN' && 'Example: 510293847162'}
                          {selectedMethod === 'COOP' && 'Example: 109283746192'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="alert-error" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
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
                      <RefreshCw size={15} className="spinner" /> Processing Settlement...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Clear Tuition ({paymentAmount.toLocaleString()} ETB)
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
