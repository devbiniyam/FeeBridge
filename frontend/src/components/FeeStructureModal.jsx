import React, { useState } from 'react';
import {
  X,
  CreditCard,
  GraduationCap,
  Calculator,
  AlertCircle,
  Save,
  Plus
} from 'lucide-react';
import { feeStructureService } from '../services/api';

export default function FeeStructureModal({
  structure = null,
  existingGrades = [],
  onClose,
  onSuccess
}) {
  const isEditing = !!structure?.id;

  // Find first unconfigured grade if creating new without preselected grade
  const defaultGrade = () => {
    if (structure?.grade) return structure.grade;
    for (let g = 1; g <= 12; g++) {
      if (!existingGrades.includes(g)) return g;
    }
    return 1;
  };

  const [grade, setGrade] = useState(defaultGrade());
  const [amount, setAmount] = useState(
    structure?.amount ? parseFloat(structure.amount) : 3500
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const annualEstimate = (parseFloat(amount) || 0) * 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please specify a valid tuition amount greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await feeStructureService.updateFeeStructure(structure.id, {
          amount: parsedAmount.toFixed(2),
        });
      } else {
        await feeStructureService.createFeeStructure({
          grade: parseInt(grade, 10),
          amount: parsedAmount.toFixed(2),
        });
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save fee structure.');
    } finally {
      setLoading(false);
    }
  };

  const PRESETS = [2500, 3000, 3500, 4000, 4500, 5000];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog-fintech fee-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge icon-indigo">
              <CreditCard size={22} />
            </div>
            <div>
              <h3>
                {isEditing
                  ? `Edit Grade ${structure.grade} Tuition Rate`
                  : structure?.grade
                  ? `Set Grade ${structure.grade} Tuition Rate`
                  : 'Configure Grade Tuition Rate'}
              </h3>
              <p className="modal-subtitle">
                Set standard monthly billing fee applied during automated batch invoice generation.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {error && (
            <div className="modal-error-banner" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="settle-form-content">
            {/* Grade Selector */}
            <div className="form-group">
              <label>Target Academic Grade</label>
              {isEditing ? (
                <div className="readonly-grade-pill">
                  <GraduationCap size={18} />
                  <strong>Grade {structure.grade}</strong>
                  <span className="badge-configured">Configured Rate</span>
                </div>
              ) : (
                <select
                  className="select-input"
                  value={grade}
                  onChange={(e) => setGrade(parseInt(e.target.value, 10))}
                  required
                >
                  {[...Array(12).keys()].map((i) => {
                    const g = i + 1;
                    const alreadyConfigured = existingGrades.includes(g);
                    return (
                      <option key={g} value={g} disabled={alreadyConfigured && g !== structure?.grade}>
                        Grade {g} {alreadyConfigured ? '(Already Configured)' : ''}
                      </option>
                    );
                  })}
                </select>
              )}
              <span className="field-hint" style={{ marginTop: '0.35rem', display: 'block' }}>
                {isEditing
                  ? 'Grade level is fixed for this fee structure entry.'
                  : 'Select which academic grade to establish the monthly fee rate for.'}
              </span>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <label>Monthly Tuition Amount (ETB)</label>
              <div className="input-currency-wrapper">
                <span className="currency-prefix">ETB</span>
                <input
                  type="number"
                  step="50"
                  min="100"
                  max="500000"
                  className="input-with-prefix"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 3.25rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1.05rem',
                    fontWeight: '700'
                  }}
                  placeholder="3500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="amount-presets-row" style={{ marginTop: '0.65rem' }}>
                <span className="presets-label">Quick Presets:</span>
                <div className="presets-chips">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`preset-chip ${parseFloat(amount) === p ? 'chip-active' : ''}`}
                      onClick={() => setAmount(p)}
                    >
                      {p.toLocaleString()} ETB
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Breakdown Card */}
            <div className="fee-projection-card">
              <div className="projection-header">
                <Calculator size={16} />
                <span>Tuition Billing Forecast</span>
              </div>
              <div className="projection-grid">
                <div className="projection-item">
                  <span className="proj-label">Monthly Rate / Student</span>
                  <strong className="proj-val text-primary">
                    {(parseFloat(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </strong>
                </div>
                <div className="projection-item">
                  <span className="proj-label">Annual Tuition (10 Months)</span>
                  <strong className="proj-val text-emerald">
                    {annualEstimate.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </strong>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !amount || parseFloat(amount) <= 0}
              >
                {loading ? (
                  <span>Saving...</span>
                ) : isEditing ? (
                  <>
                    <Save size={15} />
                    <span>Update Tuition Rate</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Save Fee Structure</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
