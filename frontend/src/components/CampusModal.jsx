import React, { useState } from 'react';
import {
  X,
  Building,
  Hash,
  MapPin,
  Phone,
  Save,
  Plus,
  AlertCircle
} from 'lucide-react';
import { schoolService } from '../services/api';

export default function CampusModal({
  campus = null,
  onClose,
  onSuccess
}) {
  const isEditing = !!campus?.id;

  const [name, setName] = useState(campus?.name || '');
  const [uniqueCode, setUniqueCode] = useState(campus?.unique_code || '');
  const [address, setAddress] = useState(campus?.address || '');
  const [phoneNumber, setPhoneNumber] = useState(campus?.phone_number || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a school or campus name.');
      return;
    }
    if (!uniqueCode.trim()) {
      setError('Please provide a unique campus tenant code.');
      return;
    }
    if (!address.trim()) {
      setError('Please provide a campus address or location.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        unique_code: uniqueCode.trim().toUpperCase(),
        address: address.trim(),
        phone_number: phoneNumber.trim(),
      };

      if (isEditing) {
        await schoolService.updateSchool(campus.id, payload);
      } else {
        await schoolService.createSchool(payload);
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save campus.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog-fintech"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge icon-purple">
              <Building size={22} />
            </div>
            <div>
              <h3>{isEditing ? `Edit ${campus.name}` : 'Onboard New Campus'}</h3>
              <p className="modal-subtitle">
                {isEditing
                  ? 'Update campus institutional profile and contact credentials.'
                  : 'Register a new institutional school tenant on the FeeBridge platform.'}
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
            <div className="modal-error-banner" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form id="campus-form" onSubmit={handleSubmit} className="modal-form-grid">
            {/* Campus Name */}
            <div className="form-group-full">
              <label className="form-label-fintech">
                Campus / School Name <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <Building size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-input-fintech with-icon-left"
                  placeholder="e.g. Hawassa Model Academy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Unique Tenant Code */}
            <div className="form-group-half">
              <label className="form-label-fintech">
                Tenant Code <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <Hash size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-input-fintech with-icon-left uppercase-input"
                  placeholder="e.g. HMA-01"
                  value={uniqueCode}
                  onChange={(e) => setUniqueCode(e.target.value)}
                  required
                />
              </div>
              <span className="input-hint">Unique identifier for campus isolation</span>
            </div>

            {/* Phone Number */}
            <div className="form-group-half">
              <label className="form-label-fintech">
                Contact Phone <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <Phone size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-input-fintech with-icon-left"
                  placeholder="e.g. +251911223344"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Physical Address */}
            <div className="form-group-full">
              <label className="form-label-fintech">
                Physical Address & City <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <MapPin size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-input-fintech with-icon-left"
                  placeholder="e.g. Hawassa City, Sidama Region"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
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
            form="campus-form"
            className="btn-fintech-primary"
            disabled={loading}
          >
            {loading ? (
              <span>Saving...</span>
            ) : isEditing ? (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Onboard Campus</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
