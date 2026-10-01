import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Building,
  Mail,
  Phone,
  Lock,
  User,
  Save,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { staffService } from '../services/api';

export default function StaffProvisionModal({
  staff = null,
  campuses = [],
  onClose,
  onSuccess
}) {
  const isEditing = !!staff?.id;

  const [firstName, setFirstName] = useState(staff?.first_name || '');
  const [lastName, setLastName] = useState(staff?.last_name || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(staff?.phone_number || '');
  const [gender, setGender] = useState(staff?.gender || 'MALE');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState(staff?.school || (campuses[0]?.id ? String(campuses[0].id) : ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide operator first and last name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide operator email address.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please provide operator contact phone number.');
      return;
    }
    if (!schoolId) {
      setError('Please select an assigned campus.');
      return;
    }
    if (!isEditing && (!password || password.length < 8)) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await staffService.updateStaff(staff.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          gender: gender,
          school: parseInt(schoolId, 10),
        });
      } else {
        await staffService.createStaff({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber.trim(),
          gender: gender,
          password: password,
          role: 'STAFF',
          school: parseInt(schoolId, 10),
        });
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to save staff member.');
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
            <div className="modal-icon-badge icon-teal">
              <UserCheck size={22} />
            </div>
            <div>
              <h3>
                {isEditing
                  ? `Edit Staff Operator: ${staff.first_name} ${staff.last_name}`
                  : 'Provision Campus Staff Operator'}
              </h3>
              <p className="modal-subtitle">
                {isEditing
                  ? 'Reassign campus tenancy or modify operator billing profile.'
                  : 'Create a new campus bursar or operator authorized to manage school fees.'}
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

          <form id="staff-form" onSubmit={handleSubmit} className="modal-form-grid">
            {/* Assigned Campus */}
            <div className="form-group-full">
              <label className="form-label-fintech">
                Assigned Campus / Tenancy <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <Building size={16} className="input-icon-left text-muted" />
                <select
                  className="form-select-fintech with-icon-left"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  required
                >
                  <option value="">Select Campus...</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.unique_code})
                    </option>
                  ))}
                </select>
              </div>
              <span className="input-hint">Operator permissions and student data are strictly scoped to this campus</span>
            </div>

            {/* First Name & Last Name */}
            <div className="form-group-half">
              <label className="form-label-fintech">
                First Name <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <User size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-input-fintech with-icon-left"
                  placeholder="e.g. Abebe"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-half">
              <label className="form-label-fintech">
                Last Name <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <User size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-input-fintech with-icon-left"
                  placeholder="e.g. Kebede"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group-half">
              <label className="form-label-fintech">
                Email Address <span className="text-rose">*</span>
              </label>
              <div className="form-input-wrap">
                <Mail size={16} className="input-icon-left text-muted" />
                <input
                  type="email"
                  className="form-input-fintech with-icon-left"
                  placeholder="e.g. staff@campus.edu.et"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEditing}
                  required
                />
              </div>
              {isEditing && <span className="input-hint">Email identifier cannot be changed</span>}
            </div>

            {/* Contact Phone */}
            <div className="form-group-half">
              <label className="form-label-fintech">
                Phone Number <span className="text-rose">*</span>
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

            {/* Gender & Password */}
            <div className="form-group-half">
              <label className="form-label-fintech">Gender</label>
              <select
                className="form-select-fintech"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            {!isEditing && (
              <div className="form-group-half">
                <label className="form-label-fintech">
                  Initial Password <span className="text-rose">*</span>
                </label>
                <div className="form-input-wrap">
                  <Lock size={16} className="input-icon-left text-muted" />
                  <input
                    type="password"
                    className="form-input-fintech with-icon-left"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
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
            form="staff-form"
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
                <UserPlus size={16} />
                <span>Provision Operator</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
