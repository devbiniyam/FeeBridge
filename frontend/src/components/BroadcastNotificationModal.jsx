import React, { useState } from 'react';
import {
  X,
  Megaphone,
  Users,
  GraduationCap,
  Mail,
  AlertCircle,
  CheckCircle2,
  Send,
  Bell,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { notificationService } from '../services/api';

export default function BroadcastNotificationModal({ onClose, onSuccess }) {
  const [audienceType, setAudienceType] = useState('ALL_PARENTS'); // 'ALL_PARENTS' | 'GRADE' | 'INDIVIDUAL'
  const [grade, setGrade] = useState('10');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [notificationType, setNotificationType] = useState('GENERAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter a message for the announcement.');
      return;
    }
    if (audienceType === 'INDIVIDUAL' && !recipientEmail.trim()) {
      setError('Please enter the recipient parent email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        audience_type: audienceType,
        grade: audienceType === 'GRADE' ? parseInt(grade, 10) : undefined,
        recipient_email: audienceType === 'INDIVIDUAL' ? recipientEmail.trim() : undefined,
        notification_type: notificationType,
        title: title.trim(),
        message: message.trim(),
      };

      const result = await notificationService.broadcast(payload);
      setSuccessResult(result);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess(result);
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch broadcast.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog-fintech broadcast-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-badge icon-indigo">
              <Megaphone size={22} />
            </div>
            <div>
              <h3>Campus Broadcast & Announcements</h3>
              <p className="modal-subtitle">
                Dispatch official notifications and billing communications to student parents.
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

        <div className="modal-body">
          {error && (
            <div className="modal-error-banner" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

        {successResult && (
          <div className="modal-success-banner">
            <CheckCircle2 size={16} />
            <span>{successResult.detail || 'Broadcast dispatched successfully!'}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form-fintech">
          {/* Audience Selection */}
          <div className="form-group-fintech">
            <label className="form-label-fintech">Target Audience</label>
            <div className="audience-pill-selector">
              <button
                type="button"
                className={`audience-pill ${audienceType === 'ALL_PARENTS' ? 'pill-active' : ''}`}
                onClick={() => setAudienceType('ALL_PARENTS')}
              >
                <Users size={14} />
                <span>All Parents</span>
              </button>
              <button
                type="button"
                className={`audience-pill ${audienceType === 'GRADE' ? 'pill-active' : ''}`}
                onClick={() => setAudienceType('GRADE')}
              >
                <GraduationCap size={14} />
                <span>By Grade</span>
              </button>
              <button
                type="button"
                className={`audience-pill ${audienceType === 'INDIVIDUAL' ? 'pill-active' : ''}`}
                onClick={() => setAudienceType('INDIVIDUAL')}
              >
                <Mail size={14} />
                <span>Individual Parent</span>
              </button>
            </div>
          </div>

          {/* Conditional Target Inputs */}
          {audienceType === 'GRADE' && (
            <div className="form-group-fintech">
              <label className="form-label-fintech">Target Grade Level</label>
              <select
                className="input-fintech"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {[...Array(12).keys()].map((i) => (
                  <option key={i + 1} value={i + 1}>
                    Grade {i + 1}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                All parents with active students enrolled in Grade {grade} will receive this notice.
              </span>
            </div>
          )}

          {audienceType === 'INDIVIDUAL' && (
            <div className="form-group-fintech">
              <label className="form-label-fintech">Parent Email Address</label>
              <input
                type="email"
                className="input-fintech"
                placeholder="e.g. tinsaye@gmail.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
              <span className="field-hint">
                Directly sends notification to this parent's portal account.
              </span>
            </div>
          )}

          {/* Notification Category */}
          <div className="form-group-fintech">
            <label className="form-label-fintech">Notification Category</label>
            <div className="notif-category-grid">
              <label className={`notif-type-card ${notificationType === 'GENERAL' ? 'type-card-active' : ''}`}>
                <input
                  type="radio"
                  name="notificationType"
                  value="GENERAL"
                  checked={notificationType === 'GENERAL'}
                  onChange={() => setNotificationType('GENERAL')}
                />
                <div className="type-card-content">
                  <Megaphone size={16} className="type-icon-blue" />
                  <div>
                    <strong>Campus Announcement</strong>
                    <span>General notices, updates & calendar events</span>
                  </div>
                </div>
              </label>

              <label className={`notif-type-card ${notificationType === 'DUE_REMINDER' ? 'type-card-active' : ''}`}>
                <input
                  type="radio"
                  name="notificationType"
                  value="DUE_REMINDER"
                  checked={notificationType === 'DUE_REMINDER'}
                  onChange={() => setNotificationType('DUE_REMINDER')}
                />
                <div className="type-card-content">
                  <Clock size={16} className="type-icon-amber" />
                  <div>
                    <strong>Due Reminder</strong>
                    <span>Approaching fee deadlines and payments</span>
                  </div>
                </div>
              </label>

              <label className={`notif-type-card ${notificationType === 'OVERDUE_ALERT' ? 'type-card-active' : ''}`}>
                <input
                  type="radio"
                  name="notificationType"
                  value="OVERDUE_ALERT"
                  checked={notificationType === 'OVERDUE_ALERT'}
                  onChange={() => setNotificationType('OVERDUE_ALERT')}
                />
                <div className="type-card-content">
                  <AlertTriangle size={16} className="type-icon-rose" />
                  <div>
                    <strong>Delinquency / Overdue Alert</strong>
                    <span>Urgent balance settlement warnings</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Subject / Title */}
          <div className="form-group-fintech">
            <label className="form-label-fintech">Subject / Heading (Optional)</label>
            <input
              type="text"
              className="input-fintech"
              placeholder="e.g., Campus Schedule Notice, Semester Tuition Due"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>

          {/* Message Content */}
          <div className="form-group-fintech">
            <div className="label-with-count">
              <label className="form-label-fintech">Message Body</label>
              <span className="char-count">{message.length}/500</span>
            </div>
            <textarea
              className="textarea-fintech"
              placeholder="Write your campus notification message here..."
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          {/* Live Preview Box */}
          {message.trim() && (
            <div className="notif-live-preview-box">
              <div className="preview-label">Parent Preview:</div>
              <div className="preview-bubble">
                <Bell size={14} className="preview-bell" />
                <div className="preview-text">
                  {title.trim() && <strong>[{title.trim()}] </strong>}
                  <span>{message.trim()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions-fintech">
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
              className="btn-fintech-primary btn-dispatch-broadcast"
              disabled={loading || !message.trim()}
            >
              {loading ? (
                <>
                  <div className="btn-spinner-sm" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Dispatch Broadcast</span>
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
