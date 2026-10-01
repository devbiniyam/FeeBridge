import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentService } from '../services/api';
import {
  X,
  GraduationCap,
  User,
  Calendar,
  Layers,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  Sparkles
} from 'lucide-react';

export default function AddStudentModal({ onClose, onSuccess }) {
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('FEMALE');
  const [grade, setGrade] = useState('12');
  const [section, setSection] = useState('1');
  const [dateOfBirth, setDateOfBirth] = useState('2009-05-15');
  const [parentIdentifier, setParentIdentifier] = useState('tinsaye@gmail.com');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter the student\'s full name.');
      return;
    }
    if (!parentIdentifier.trim()) {
      setError('Please provide the parent\'s email address or registered phone number.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        gender: gender,
        grade: parseInt(grade, 10),
        section: section.trim(),
        date_of_birth: dateOfBirth,
        parent_identifier: parentIdentifier.trim(),
      };

      if (user?.school) {
        payload.school = user.school;
      }

      const res = await studentService.createStudent(payload);
      setSuccessData(res);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to enroll student. Please verify the parent account exists.');
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
            <div className="modal-icon-badge icon-teal">
              <GraduationCap size={22} />
            </div>
            <div>
              <h3>{successData ? 'Student Enrolled' : 'Enroll New Student'}</h3>
              <p className="modal-subtitle">
                {user?.school_name || 'Campus Academic Roster'} • Multi-Tenant Records
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
            <div className="receipt-view">
              <div className="receipt-success-banner">
                <div className="receipt-check-icon">
                  <CheckCircle2 size={36} />
                </div>
                <h4>Student Enrolled Successfully!</h4>
                <p>
                  <strong>{successData.full_name}</strong> is now registered in Grade {successData.grade}, Section {successData.section}.
                </p>
              </div>

              <div className="receipt-card">
                <div className="receipt-header-row">
                  <span className="receipt-brand">CAMPUS ENROLLMENT RECORD</span>
                  <span className="receipt-code">STU-#{successData.id.toString().padStart(6, '0')}</span>
                </div>

                <div className="receipt-grid">
                  <div className="receipt-item">
                    <span className="receipt-label">Student Name</span>
                    <span className="receipt-val font-bold">{successData.full_name}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Campus</span>
                    <span className="receipt-val">{successData.school_name || user?.school_name || 'Campus'}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Class Placement</span>
                    <span className="receipt-val">Grade {successData.grade} - Section {successData.section}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Gender</span>
                    <span className="receipt-val">{successData.gender}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Linked Parent Account</span>
                    <span className="receipt-val font-bold">{successData.parent_name || successData.parent_email}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Parent Contact</span>
                    <span className="receipt-val">{successData.parent_phone || successData.parent_email}</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Tuition Status</span>
                    <span className="receipt-val text-emerald font-bold">Active Account (Invoices Ready)</span>
                  </div>
                  <div className="receipt-item">
                    <span className="receipt-label">Date of Birth</span>
                    <span className="receipt-val">{successData.date_of_birth}</span>
                  </div>
                </div>
              </div>

              <div className="modal-actions-fintech" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-fintech-primary"
                  onClick={onClose}
                >
                  Done & View in Roster
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="enroll-form">
              <div className="form-row-grid">
                {/* Full Name */}
                <div className="form-group span-2">
                  <label className="form-label">Student Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Natnael Bekele"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {/* Gender */}
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select
                    className="form-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div className="form-group">
                  <label className="form-label">Date of Birth *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>

                {/* Grade */}
                <div className="form-group">
                  <label className="form-label">Grade Level *</label>
                  <select
                    className="form-select"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 1, 2, A, B"
                    maxLength={4}
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  />
                </div>

                {/* Parent Identifier */}
                <div className="form-group span-2">
                  <label className="form-label">Parent Account Identifier (Email or Phone) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. tinsaye@gmail.com or 0966338211"
                    value={parentIdentifier}
                    onChange={(e) => setParentIdentifier(e.target.value)}
                    required
                  />
                  <span className="input-hint">
                    Links this child to the parent's fee portal & digital wallet for tuition deduction.
                  </span>
                </div>
              </div>

              {error && (
                <div className="alert-error" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

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
                      <RefreshCw size={15} className="spinner" /> Enrolling Student...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Complete Enrollment
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
