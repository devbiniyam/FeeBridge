import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { invoiceService } from '../services/api';
import {
  X,
  Building,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Info,
  Users
} from 'lucide-react';

export default function GenerateInvoicesModal({ onClose, onSuccess }) {
  const { user } = useAuth();

  // Compute default upcoming month (e.g. next month)
  const getDefaultMonth = () => {
    const now = new Date();
    // Default to next month for upcoming billing
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const getDefaultDueDate = (monthStr) => {
    if (!monthStr) return '';
    return `${monthStr}-10`;
  };

  const [month, setMonth] = useState(getDefaultMonth());
  const [dueDate, setDueDate] = useState(getDefaultDueDate(getDefaultMonth()));
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    setDueDate(getDefaultDueDate(newMonth));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!month || !dueDate) {
      setError('Please select both the billing month and the payment due date.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        month: `${month}-01`,
        due_date: dueDate,
      };
      if (grade) {
        payload.grade = parseInt(grade, 10);
      }

      const res = await invoiceService.generateBatchInvoices(payload);
      setResult(res);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Invoice generation run failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge icon-amber">
              <Building size={22} />
            </div>
            <div>
              <h3>{result ? 'Invoice Run Results' : 'Generate Monthly Invoices'}</h3>
              <p className="modal-subtitle">
                {user?.school_name ? `Campus: ${user.school_name}` : 'Campus Billing Engine'}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {result ? (
            /* Results Screen */
            <div className="gen-results-view">
              <div className="receipt-success-banner">
                <div className="receipt-check-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h4>Billing Run Completed</h4>
                <p>
                  Processed {result.total_students} active students for{' '}
                  <strong>{new Date(result.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>.
                </p>
              </div>

              <div className="gen-metrics-row">
                <div className="metric-pill metric-created">
                  <CheckCircle2 size={16} />
                  <span>
                    <strong>{result.created_count}</strong> Invoices Created
                  </span>
                </div>
                <div className="metric-pill metric-skipped">
                  <Clock size={16} />
                  <span>
                    <strong>{result.skipped_count}</strong> Skipped
                  </span>
                </div>
              </div>

              {result.created && result.created.length > 0 && (
                <div className="gen-list-box">
                  <span className="gen-list-title">Newly Issued Invoices</span>
                  <div className="gen-scroll-list">
                    {result.created.map((item, idx) => (
                      <div key={idx} className="gen-list-item">
                        <div className="gen-item-left">
                          <Users size={14} className="text-emerald" />
                          <strong>{item.student_name}</strong>
                          <span className="badge-grade">Grade {item.grade}</span>
                        </div>
                        <span className="gen-item-amount">{parseFloat(item.amount).toFixed(2)} ETB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.skipped && result.skipped.length > 0 && (
                <div className="gen-list-box skipped-box">
                  <span className="gen-list-title">Skipped Students (No Duplicate Billed)</span>
                  <div className="gen-scroll-list">
                    {result.skipped.map((item, idx) => (
                      <div key={idx} className="gen-list-item">
                        <div className="gen-item-left">
                          <AlertCircle size={14} className="text-amber" />
                          <span>{item.student_name} (Grade {item.grade})</span>
                        </div>
                        <span className="gen-reason-tag">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={onClose}>
                  Done & View Invoices
                </button>
              </div>
            </div>
          ) : (
            /* Run Configuration Form */
            <form onSubmit={handleSubmit} className="settle-form-content">
              {error && (
                <div className="alert-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="info-callout">
                <Info size={18} className="info-icon" />
                <p>
                  FeeBridge will automatically look up all active students in your campus, apply their grade fee rate, and create unpaid invoices with notifications to parents.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="gen-month">Billing Month</label>
                <div className="input-icon-wrapper">
                  <Calendar className="input-icon" size={18} />
                  <input
                    id="gen-month"
                    type="month"
                    value={month}
                    onChange={handleMonthChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="gen-due-date">Payment Due Date</label>
                <div className="input-icon-wrapper">
                  <Clock className="input-icon" size={18} />
                  <input
                    id="gen-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="gen-grade">Target Grade Scope</label>
                <div className="input-icon-wrapper">
                  <Layers className="input-icon" size={18} />
                  <select
                    id="gen-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="select-input"
                    style={{ paddingLeft: '2.5rem' }}
                  >
                    <option value="">All Grades (Campus Wide)</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>
              </div>

              <div className="idempotency-note">
                <Sparkles size={14} className="text-amber" />
                <span>
                  <strong>Duplicate Protection:</strong> Any student who already has an invoice for the selected month will be safely skipped.
                </span>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <span className="spinner-row">
                      <span className="spinner"></span> Generating Invoices...
                    </span>
                  ) : (
                    <span className="btn-content">
                      <Building size={16} /> Run Invoice Generation <ArrowRight size={16} />
                    </span>
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
