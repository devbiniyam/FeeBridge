import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/api';
import {
  X,
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Printer,
  Smartphone,
  ShieldCheck,
  Receipt
} from 'lucide-react';

export default function PaymentModal({ invoice, onClose, onPaymentSuccess }) {
  const { user, refreshProfile } = useAuth();
  const [method, setMethod] = useState('WALLET'); // 'WALLET' | 'CHAPA'
  const [paymentType, setPaymentType] = useState('FULL'); // 'FULL' | 'PARTIAL'
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const balance = parseFloat(invoice.balance_remaining || invoice.amount || 0);
  const walletBalance = parseFloat(user?.wallet_balance || 0);

  const paymentAmount = paymentType === 'FULL' ? balance : parseFloat(customAmount || 0);
  const isWalletSufficient = walletBalance >= paymentAmount;

  const handleWalletPayment = async () => {
    setError('');
    if (paymentAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (paymentAmount > balance) {
      setError(`Amount cannot exceed the remaining balance (${balance.toFixed(2)} ETB).`);
      return;
    }
    if (!isWalletSufficient) {
      setError(`Insufficient wallet balance (${walletBalance.toFixed(2)} ETB). Please select Chapa / Telebirr or deposit funds.`);
      return;
    }

    setLoading(true);
    try {
      const receipt = await paymentService.payWithWallet(invoice.id, paymentAmount);
      setSuccessData(receipt);
      await refreshProfile();
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleChapaCheckout = async () => {
    setError('');
    if (paymentAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (paymentAmount > balance) {
      setError(`Amount cannot exceed the remaining balance (${balance.toFixed(2)} ETB).`);
      return;
    }

    setLoading(true);
    try {
      const checkoutRes = await paymentService.initializeCheckout(invoice.id, paymentAmount);
      if (checkoutRes.checkout_url) {
        window.open(checkoutRes.checkout_url, '_blank');
        setSuccessData({
          receipt_number: `PENDING-${checkoutRes.tx_ref?.slice(0, 8)}`,
          payment_id: checkoutRes.tx_ref,
          amount_paid: paymentAmount,
          method: 'CHAPA (Telebirr / Cards)',
          paid_at: new Date().toISOString(),
          isGatewayPending: true,
          tx_ref: checkoutRes.tx_ref,
        });
        await refreshProfile();
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize gateway checkout.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge">
              <Receipt size={22} />
            </div>
            <div>
              <h3>{successData ? 'Payment Receipt' : 'Tuition Fee Settle'}</h3>
              <p className="modal-subtitle">
                {invoice.student_name} • Grade {invoice.student_grade || invoice.grade}
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
            /* Receipt View */
            <div className="receipt-view">
              <div className="receipt-success-banner">
                <div className="receipt-check-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h4>Payment Successful!</h4>
                <p>Tuition payment has been recorded and confirmed.</p>
              </div>

              <div className="receipt-card">
                <div className="receipt-header-row">
                  <span className="receipt-brand">FeeBridge Official Receipt</span>
                  <span className="receipt-code">{successData.receipt_number}</span>
                </div>

                <div className="receipt-grid">
                  <div className="receipt-item">
                    <span className="receipt-label">Student</span>
                    <span className="receipt-val">{invoice.student_name}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">School</span>
                    <span className="receipt-val">{invoice.school_name || user?.school_name || 'Campus'}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Month</span>
                    <span className="receipt-val">
                      {new Date(invoice.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Payment Method</span>
                    <span className="receipt-val highlight-method">{successData.method || 'Digital Wallet'}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Amount Paid</span>
                    <span className="receipt-val highlight-amount">{parseFloat(successData.amount_paid).toFixed(2)} ETB</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Remaining Due</span>
                    <span className="receipt-val">
                      {successData.invoice_balance ? parseFloat(successData.invoice_balance).toFixed(2) : '0.00'} ETB
                    </span>
                  </div>
                </div>

                <div className="receipt-footer">
                  <span className="receipt-timestamp">
                    Timestamp: {new Date(successData.paid_at || Date.now()).toLocaleString()}
                  </span>
                  <span className="receipt-secure-tag">
                    <ShieldCheck size={13} /> Verified by FeeBridge Engine
                  </span>
                </div>
              </div>

              <div className="receipt-actions">
                <button type="button" className="btn-secondary" onClick={handlePrint}>
                  <Printer size={16} /> Print Receipt
                </button>
                <button type="button" className="btn-primary" onClick={onClose}>
                  Done & Back to Invoices
                </button>
              </div>
            </div>
          ) : (
            /* Settle Form View */
            <div className="settle-form-content">
              {error && (
                <div className="alert-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Invoice Summary Card */}
              <div className="invoice-summary-box">
                <div className="summary-col">
                  <span className="summary-label">Month Fee</span>
                  <span className="summary-val">
                    {new Date(invoice.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="summary-col">
                  <span className="summary-label">Total Fee</span>
                  <span className="summary-val">{parseFloat(invoice.amount).toFixed(2)} ETB</span>
                </div>
                <div className="summary-col highlight-due-col">
                  <span className="summary-label">Balance Due</span>
                  <span className="summary-val due-amount">{balance.toFixed(2)} ETB</span>
                </div>
              </div>

              {/* Amount Selection */}
              <div className="payment-amount-options">
                <label className="section-label">Select Amount to Pay</label>
                <div className="amount-pills">
                  <button
                    type="button"
                    className={`amount-pill ${paymentType === 'FULL' ? 'active-pill' : ''}`}
                    onClick={() => setPaymentType('FULL')}
                  >
                    <span>Full Amount</span>
                    <strong>{balance.toFixed(2)} ETB</strong>
                  </button>
                  <button
                    type="button"
                    className={`amount-pill ${paymentType === 'PARTIAL' ? 'active-pill' : ''}`}
                    onClick={() => setPaymentType('PARTIAL')}
                  >
                    <span>Custom / Partial</span>
                    <strong>Enter amount</strong>
                  </button>
                </div>

                {paymentType === 'PARTIAL' && (
                  <div className="form-group custom-amount-input-group">
                    <label>Amount (ETB)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={balance}
                      placeholder="e.g. 1000.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Payment Method Tabs */}
              <div className="payment-methods-box">
                <label className="section-label">Select Payment Method</label>
                <div className="method-selector">
                  <button
                    type="button"
                    className={`method-tab method-wallet ${method === 'WALLET' ? 'active-method' : ''}`}
                    onClick={() => setMethod('WALLET')}
                  >
                    <div className="method-tab-header">
                      <Wallet size={18} />
                      <span className="method-title">Digital Wallet</span>
                    </div>
                    <span className="method-balance">Balance: {walletBalance.toFixed(2)} ETB</span>
                  </button>

                  <button
                    type="button"
                    className={`method-tab method-chapa ${method === 'CHAPA' ? 'active-method' : ''}`}
                    onClick={() => setMethod('CHAPA')}
                  >
                    <div className="method-tab-header">
                      <Smartphone size={18} />
                      <span className="method-title">Telebirr / Cards</span>
                    </div>
                    <span className="method-balance">Via Chapa Gateway</span>
                  </button>
                </div>

                {/* Method Details */}
                {method === 'WALLET' ? (
                  <div className="method-preview wallet-preview">
                    <div className="preview-row">
                      <span>Current Wallet Balance:</span>
                      <strong>{walletBalance.toFixed(2)} ETB</strong>
                    </div>
                    <div className="preview-row">
                      <span>Payment Amount:</span>
                      <strong className="text-deduct">- {paymentAmount.toFixed(2)} ETB</strong>
                    </div>
                    <div className="preview-row total-row">
                      <span>New Wallet Balance:</span>
                      <strong>{(walletBalance - paymentAmount).toFixed(2)} ETB</strong>
                    </div>

                    {!isWalletSufficient && (
                      <div className="warning-note">
                        <AlertCircle size={15} />
                        <span>Insufficient balance. Switch to Telebirr or deposit funds first.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="method-preview chapa-preview">
                    <div className="chapa-brand-row">
                      <span className="gateway-badge">Chapa Secure Checkout</span>
                      <span className="gateway-methods">Telebirr • CBE Birr • Awash • Visa/Mastercard</span>
                    </div>
                    <p className="gateway-desc">
                      You will be redirected to complete your instant payment of{' '}
                      <strong>{paymentAmount.toFixed(2)} ETB</strong>. Your receipt will be issued automatically upon confirmation.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary btn-pay-now"
                  disabled={loading || (method === 'WALLET' && !isWalletSufficient) || paymentAmount <= 0}
                  onClick={method === 'WALLET' ? handleWalletPayment : handleChapaCheckout}
                >
                  {loading ? (
                    <span className="spinner-row">
                      <span className="spinner"></span> Processing...
                    </span>
                  ) : (
                    <span className="btn-content">
                      Pay {paymentAmount.toFixed(2)} ETB <ArrowRight size={17} />
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
