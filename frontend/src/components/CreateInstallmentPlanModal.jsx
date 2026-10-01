import React, { useState } from 'react';
import { invoiceService } from '../services/api';
import {
  X,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function CreateInstallmentPlanModal({ invoice, onClose, onSuccess }) {
  const [planType, setPlanType] = useState('2_PART'); // '2_PART' | '3_PART' | 'CUSTOM'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = parseFloat(invoice.amount || 0);
  const invoiceDueDate = invoice.due_date ? new Date(invoice.due_date) : new Date();

  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const initialDue1 = invoice.due_date || new Date().toISOString().slice(0, 10);
  const initialDue2 = addDays(invoiceDueDate, 30);
  const initialDue3 = addDays(invoiceDueDate, 60);

  const [customMilestones, setCustomMilestones] = useState([
    { title: 'Milestone 1 (Deposit)', amount: (totalAmount * 0.5).toFixed(2), due_date: initialDue1 },
    { title: 'Milestone 2 (Settlement)', amount: (totalAmount * 0.5).toFixed(2), due_date: initialDue2 },
  ]);

  const part2_amt1 = (totalAmount / 2).toFixed(2);
  const part2_amt2 = (totalAmount - parseFloat(part2_amt1)).toFixed(2);

  const part3_amt1 = (totalAmount * 0.4).toFixed(2);
  const part3_amt2 = (totalAmount * 0.3).toFixed(2);
  const part3_amt3 = (totalAmount - parseFloat(part3_amt1) - parseFloat(part3_amt2)).toFixed(2);

  const handleCustomAmountChange = (index, val) => {
    const updated = [...customMilestones];
    updated[index].amount = val;
    setCustomMilestones(updated);
  };

  const handleCustomDateChange = (index, val) => {
    const updated = [...customMilestones];
    updated[index].due_date = val;
    setCustomMilestones(updated);
  };

  const handleCustomTitleChange = (index, val) => {
    const updated = [...customMilestones];
    updated[index].title = val;
    setCustomMilestones(updated);
  };

  const addCustomMilestone = () => {
    if (customMilestones.length >= 5) return;
    const nextIdx = customMilestones.length + 1;
    setCustomMilestones([
      ...customMilestones,
      {
        title: `Milestone ${nextIdx}`,
        amount: '0.00',
        due_date: addDays(invoiceDueDate, nextIdx * 30),
      }
    ]);
  };

  const removeCustomMilestone = (index) => {
    if (customMilestones.length <= 2) return;
    setCustomMilestones(customMilestones.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let payload = { plan_type: planType };

      if (planType === 'CUSTOM') {
        const sumCustom = customMilestones.reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);
        if (Math.abs(sumCustom - totalAmount) > 0.05) {
          throw new Error(`Milestone sum (${sumCustom.toFixed(2)} ETB) must match total invoice amount (${totalAmount.toFixed(2)} ETB).`);
        }
        payload.installments = customMilestones.map(m => ({
          title: m.title,
          amount: parseFloat(m.amount),
          due_date: m.due_date,
        }));
      }

      await invoiceService.createInstallmentPlan(invoice.id, payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to activate installment plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-installment-dialog">
        <div className="modal-header">
          <div className="modal-header-icon-title">
            <div className="modal-icon-bubble bubble-purple">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="modal-title">Split Tuition into Milestones</h3>
              <p className="modal-sub">
                Convert invoice <code className="inv-badge">INV-{(invoice.id).toString().padStart(5, '0')}</code> ({invoice.student_name}) into flexible structured installments.
              </p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="installment-summary-banner">
              <div>
                <span className="banner-eyebrow">TOTAL TUITION FEE</span>
                <strong className="banner-amount">{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
              </div>
              <div className="banner-details">
                <span className="banner-student">{invoice.student_name}</span>
                <span className="banner-meta">Grade {invoice.student_grade || 'N/A'} • {invoice.school_name}</span>
              </div>
            </div>

            <label className="input-label" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
              Select Installment Schedule Structure
            </label>
            <div className="installment-plans-grid">
              <div
                className={`installment-plan-card ${planType === '2_PART' ? 'plan-card-active' : ''}`}
                onClick={() => setPlanType('2_PART')}
              >
                <div className="plan-card-header">
                  <span className="plan-badge">2-Part Split</span>
                  {planType === '2_PART' && <CheckCircle2 size={16} className="text-emerald" />}
                </div>
                <h4 className="plan-title">Bi-Monthly (50% / 50%)</h4>
                <p className="plan-desc">Split into 2 equal halves. First due immediately, second due in 30 days.</p>
                <div className="plan-breakdown-preview">
                  <div className="preview-row">
                    <span>1. Deposit:</span>
                    <strong>{parseFloat(part2_amt1).toLocaleString()} ETB</strong>
                  </div>
                  <div className="preview-row">
                    <span>2. Mid-term:</span>
                    <strong>{parseFloat(part2_amt2).toLocaleString()} ETB</strong>
                  </div>
                </div>
              </div>

              <div
                className={`installment-plan-card ${planType === '3_PART' ? 'plan-card-active' : ''}`}
                onClick={() => setPlanType('3_PART')}
              >
                <div className="plan-card-header">
                  <span className="plan-badge">3-Part Split</span>
                  {planType === '3_PART' && <CheckCircle2 size={16} className="text-emerald" />}
                </div>
                <h4 className="plan-title">Trimester (40% / 30% / 30%)</h4>
                <p className="plan-desc">Gradual 3-step schedule. 40% deposit, followed by two 30% milestones.</p>
                <div className="plan-breakdown-preview">
                  <div className="preview-row">
                    <span>1. 40% First:</span>
                    <strong>{parseFloat(part3_amt1).toLocaleString()} ETB</strong>
                  </div>
                  <div className="preview-row">
                    <span>2. 30% Month 2:</span>
                    <strong>{parseFloat(part3_amt2).toLocaleString()} ETB</strong>
                  </div>
                  <div className="preview-row">
                    <span>3. 30% Final:</span>
                    <strong>{parseFloat(part3_amt3).toLocaleString()} ETB</strong>
                  </div>
                </div>
              </div>

              <div
                className={`installment-plan-card ${planType === 'CUSTOM' ? 'plan-card-active' : ''}`}
                onClick={() => setPlanType('CUSTOM')}
              >
                <div className="plan-card-header">
                  <span className="plan-badge">Custom</span>
                  {planType === 'CUSTOM' && <CheckCircle2 size={16} className="text-emerald" />}
                </div>
                <h4 className="plan-title">Custom Milestones</h4>
                <p className="plan-desc">Define custom milestone amounts and dates tailored to family budget.</p>
                <div className="plan-breakdown-preview">
                  <div className="preview-row">
                    <span>Flexible:</span>
                    <strong>Up to 5 parts</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="milestones-timeline-preview">
              <h5 className="timeline-heading">
                <Clock size={15} /> Scheduled Milestone Timeline
              </h5>

              {planType === '2_PART' && (
                <div className="milestones-steps-list">
                  <div className="milestone-step-item">
                    <div className="step-number">1</div>
                    <div className="step-info">
                      <strong className="step-title">Milestone 1 of 2 (50%)</strong>
                      <span className="step-due"><Calendar size={12} /> Due: {initialDue1}</span>
                    </div>
                    <div className="step-amount">
                      <strong>{parseFloat(part2_amt1).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    </div>
                  </div>

                  <div className="milestone-step-item">
                    <div className="step-number">2</div>
                    <div className="step-info">
                      <strong className="step-title">Milestone 2 of 2 (50%)</strong>
                      <span className="step-due"><Calendar size={12} /> Due: {initialDue2} (+30 days)</span>
                    </div>
                    <div className="step-amount">
                      <strong>{parseFloat(part2_amt2).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    </div>
                  </div>
                </div>
              )}

              {planType === '3_PART' && (
                <div className="milestones-steps-list">
                  <div className="milestone-step-item">
                    <div className="step-number">1</div>
                    <div className="step-info">
                      <strong className="step-title">Milestone 1 of 3 (40%)</strong>
                      <span className="step-due"><Calendar size={12} /> Due: {initialDue1}</span>
                    </div>
                    <div className="step-amount">
                      <strong>{parseFloat(part3_amt1).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    </div>
                  </div>

                  <div className="milestone-step-item">
                    <div className="step-number">2</div>
                    <div className="step-info">
                      <strong className="step-title">Milestone 2 of 3 (30%)</strong>
                      <span className="step-due"><Calendar size={12} /> Due: {initialDue2} (+30 days)</span>
                    </div>
                    <div className="step-amount">
                      <strong>{parseFloat(part3_amt2).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    </div>
                  </div>

                  <div className="milestone-step-item">
                    <div className="step-number">3</div>
                    <div className="step-info">
                      <strong className="step-title">Milestone 3 of 3 (30%)</strong>
                      <span className="step-due"><Calendar size={12} /> Due: {initialDue3} (+60 days)</span>
                    </div>
                    <div className="step-amount">
                      <strong>{parseFloat(part3_amt3).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    </div>
                  </div>
                </div>
              )}

              {planType === 'CUSTOM' && (
                <div className="custom-milestones-builder">
                  {customMilestones.map((m, idx) => (
                    <div key={idx} className="custom-milestone-row">
                      <div className="custom-input-group">
                        <label className="mini-label">Title</label>
                        <input
                          type="text"
                          className="input-fintech mini-input"
                          value={m.title}
                          onChange={(e) => handleCustomTitleChange(idx, e.target.value)}
                        />
                      </div>
                      <div className="custom-input-group" style={{ width: '130px' }}>
                        <label className="mini-label">Amount (ETB)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input-fintech mini-input"
                          value={m.amount}
                          onChange={(e) => handleCustomAmountChange(idx, e.target.value)}
                        />
                      </div>
                      <div className="custom-input-group" style={{ width: '145px' }}>
                        <label className="mini-label">Due Date</label>
                        <input
                          type="date"
                          className="input-fintech mini-input"
                          value={m.due_date}
                          onChange={(e) => handleCustomDateChange(idx, e.target.value)}
                        />
                      </div>
                      {customMilestones.length > 2 && (
                        <button
                          type="button"
                          className="btn-remove-step"
                          onClick={() => removeCustomMilestone(idx)}
                          title="Remove milestone"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  {customMilestones.length < 5 && (
                    <button
                      type="button"
                      className="btn-add-step"
                      onClick={addCustomMilestone}
                    >
                      + Add Milestone Step
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="escrow-milestone-notice">
              <ShieldCheck size={16} className="text-emerald" />
              <span>
                Each milestone can be cleared independently via Wallet Escrow or direct banking. Automated Due-Date settlement will clear milestones sequentially.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-fintech-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-fintech-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner-small"></div> Activating Plan...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Confirm Installment Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
