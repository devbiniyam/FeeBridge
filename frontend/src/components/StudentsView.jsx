import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentService } from '../services/api';
import AddStudentModal from './AddStudentModal';
import {
  Users,
  GraduationCap,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  User,
  Phone,
  Mail,
  Receipt,
  Calendar,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function StudentsView({ onNavigateBack, onNavigateToInvoices }) {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedGrade !== 'ALL') params.grade = selectedGrade;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await studentService.getStudents(params);
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedGrade]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  // Filter local students if search is typed without pressing enter
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      searchQuery === '' ||
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_phone?.includes(searchQuery);

    const matchGrade = selectedGrade === 'ALL' || String(s.grade) === selectedGrade;

    return matchSearch && matchGrade;
  });

  // Aggregates for parents
  const totalBilled = students.reduce((sum, s) => sum + parseFloat(s.total_invoiced || 0), 0);
  const totalPaid = students.reduce((sum, s) => sum + parseFloat(s.total_paid || 0), 0);
  const totalRemaining = students.reduce((sum, s) => sum + parseFloat(s.balance_remaining || 0), 0);

  const getStatusPill = (status) => {
    switch (status) {
      case 'CLEARED':
        return (
          <span className="status-pill status-paid">
            <CheckCircle2 size={12} /> All Fees Cleared
          </span>
        );
      case 'PENDING':
        return (
          <span className="status-pill status-partial">
            <Clock size={12} /> Tuition Due
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="status-pill status-overdue">
            <AlertCircle size={12} /> Overdue Fees
          </span>
        );
      default:
        return (
          <span className="status-pill status-neutral">
            <CheckCircle2 size={12} /> Registered
          </span>
        );
    }
  };

  return (
    <div className="fintech-students-container">
      {/* Top Header & Breadcrumb */}
      <div className="students-topbar-row">
        <div>
          <h2 className="fintech-page-title">
            {isParent ? 'My Enrolled Children & Billing Profiles' : 'Campus Student Roster & Enrollment'}
          </h2>
          <p className="fintech-page-sub">
            {isParent
              ? 'Educational directory of your children. Track grade levels, fee structures, and individual tuition clearance.'
              : `Institutional student directory for ${user?.school_name || 'campus'}. Manage enrollment records and fee accounts.`}
          </p>
        </div>

        <div className="students-header-actions">
          {!isParent && (
            <button
              type="button"
              className="btn-fintech-primary"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={16} /> Enroll New Student
            </button>
          )}

          <button
            type="button"
            className="btn-fintech-ghost"
            onClick={fetchStudents}
            title="Reload Student Records"
          >
            <RotateCcw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Parent Summary KPIs */}
      {isParent && (
        <div className="pipeline-kpi-bar">
          <div className="kpi-segment">
            <span className="kpi-label">ENROLLED CHILDREN</span>
            <strong className="kpi-value">{students.length}</strong>
            <span className="kpi-sub">Active schooling profiles</span>
          </div>

          <div className="kpi-divider"></div>

          <div className="kpi-segment">
            <span className="kpi-label">TOTAL BILLED (FAMILY)</span>
            <strong className="kpi-value">{totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
            <span className="kpi-sub">Across all terms</span>
          </div>

          <div className="kpi-divider"></div>

          <div className="kpi-segment">
            <span className="kpi-label">TOTAL SETTLED</span>
            <strong className="kpi-value text-emerald">{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
            <span className="kpi-sub">Cleared from wallet & banks</span>
          </div>

          <div className="kpi-divider"></div>

          <div className="kpi-segment">
            <span className="kpi-label">OUTSTANDING BALANCE</span>
            <strong className="kpi-value text-amber">{totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
            <span className="kpi-sub">Pending tuition clearance</span>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar (for Staff and Parents) */}
      <div className="students-filter-bar">
        <form onSubmit={handleSearchSubmit} className="students-search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder={isParent ? 'Search child name...' : 'Search student name, parent email, or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="students-search-input"
          />
        </form>

        <div className="students-grade-filter">
          <Filter size={14} className="text-muted" />
          <span className="filter-label">Grade:</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="grade-select"
          >
            <option value="ALL">All Grades</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={String(g)}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading student directory...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-ledger-state">
          <GraduationCap size={44} className="text-muted" />
          <h4>No Students Found</h4>
          <p>
            {isParent
              ? 'No enrolled children records found under your account.'
              : 'No students match your search or filter criteria in this campus.'}
          </p>
          {!isParent && (
            <button
              type="button"
              className="btn-fintech-primary"
              style={{ marginTop: '0.75rem' }}
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={15} /> Enroll First Student
            </button>
          )}
        </div>
      ) : isParent ? (
        /* ================= PARENT VIEW: RICH CHILDREN CARDS ================= */
        <div className="children-cards-grid">
          {filteredStudents.map((child) => {
            const billed = parseFloat(child.total_invoiced || 0);
            const paid = parseFloat(child.total_paid || 0);
            const remaining = parseFloat(child.balance_remaining || 0);
            const pctPaid = billed > 0 ? Math.round((paid / billed) * 100) : 100;

            const isFemale = child.gender === 'FEMALE';

            return (
              <div key={child.id} className="child-profile-card">
                {/* Card Top */}
                <div className="child-card-header">
                  <div className={`child-avatar ${isFemale ? 'avatar-female' : 'avatar-male'}`}>
                    <span>{child.full_name?.slice(0, 2).toUpperCase() || 'ST'}</span>
                  </div>

                  <div className="child-title-group">
                    <div className="child-name-row">
                      <h3>{child.full_name}</h3>
                      <span className="child-grade-badge">Grade {child.grade}-{child.section}</span>
                    </div>
                    <span className="child-school-name">
                      <Building size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {child.school_name || 'Assigned Campus'}
                    </span>
                  </div>

                  <div className="child-status-top">
                    {getStatusPill(child.tuition_status)}
                  </div>
                </div>

                {/* Demographics row */}
                <div className="child-demographics-row">
                  <div className="demographic-item">
                    <span className="demographic-label">Student ID</span>
                    <strong>STU-#{child.id.toString().padStart(5, '0')}</strong>
                  </div>
                  <div className="demographic-item">
                    <span className="demographic-label">Date of Birth</span>
                    <strong>{child.date_of_birth}</strong>
                  </div>
                  <div className="demographic-item">
                    <span className="demographic-label">Gender</span>
                    <strong>{child.gender}</strong>
                  </div>
                </div>

                {/* Tuition Clearance Progress Bar */}
                <div className="child-tuition-section">
                  <div className="tuition-track-header">
                    <span className="tuition-track-label">TUITION ALLOCATION PROGRESS</span>
                    <strong className="tuition-track-pct">{pctPaid}% Settled</strong>
                  </div>
                  <div className="kpi-progress-track">
                    <div className="kpi-progress-fill" style={{ width: `${pctPaid}%` }}></div>
                  </div>

                  <div className="child-finance-grid">
                    <div className="finance-box">
                      <span className="finance-label">Total Invoiced</span>
                      <strong>{billed.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    </div>
                    <div className="finance-box">
                      <span className="finance-label">Total Settled</span>
                      <strong className="text-emerald">{paid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</strong>
                    </div>
                    <div className="finance-box">
                      <span className="finance-label">Outstanding Due</span>
                      <strong className={remaining > 0 ? 'text-amber' : 'text-emerald'}>
                        {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="child-card-footer">
                  <button
                    type="button"
                    className="btn-child-invoices"
                    onClick={() => onNavigateToInvoices && onNavigateToInvoices(child.full_name)}
                  >
                    <Receipt size={15} /> View Child Invoices ({child.invoices_count || 0}) <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= STAFF VIEW: CAMPUS ROSTER DIRECTORY ================= */
        <div className="fintech-ledger-card">
          <div className="ledger-header-row">
            <div className="ledger-title-group">
              <h3>Enrolled Student Roster</h3>
              <span className="ledger-subtitle">
                Official directory of students enrolled in {user?.school_name || 'campus'} ({filteredStudents.length} Students)
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="fintech-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>GRADE & SECTION</th>
                  <th>GENDER</th>
                  <th>LINKED PARENT</th>
                  <th>CONTACT (PHONE / EMAIL)</th>
                  <th>INVOICES</th>
                  <th>BALANCE DUE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const remaining = parseFloat(student.balance_remaining || 0);

                  return (
                    <tr key={student.id} className="ledger-row">
                      {/* Student Name + ID */}
                      <td>
                        <div className="student-name-cell">
                          <div className={`student-avatar-mini ${student.gender === 'FEMALE' ? 'avatar-female' : 'avatar-male'}`}>
                            {student.full_name?.slice(0, 1) || 'S'}
                          </div>
                          <div>
                            <strong className="student-name-text">{student.full_name}</strong>
                            <span className="student-id-text">ID: #{student.id.toString().padStart(5, '0')}</span>
                          </div>
                        </div>
                      </td>

                      {/* Grade & Section */}
                      <td>
                        <span className="grade-pill-tag">
                          Grade {student.grade}-{student.section}
                        </span>
                      </td>

                      {/* Gender */}
                      <td>
                        <span className="text-muted font-sub text-xs">{student.gender}</span>
                      </td>

                      {/* Parent */}
                      <td>
                        <div className="parent-info-cell">
                          <strong className="parent-name-text">{student.parent_name || 'N/A'}</strong>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="parent-contact-cell">
                          {student.parent_phone && (
                            <span className="contact-chip">
                              <Phone size={11} /> {student.parent_phone}
                            </span>
                          )}
                          {student.parent_email && (
                            <span className="contact-chip">
                              <Mail size={11} /> {student.parent_email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Invoices Count */}
                      <td>
                        <span className="badge-invoices-count">
                          {student.invoices_count || 0} bills
                        </span>
                      </td>

                      {/* Balance Remaining */}
                      <td>
                        <strong className={remaining > 0 ? 'text-amber font-bold' : 'text-emerald'}>
                          {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                        </strong>
                      </td>

                      {/* Tuition Status */}
                      <td>
                        {getStatusPill(student.tuition_status)}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-table-view-invoices"
                          onClick={() => onNavigateToInvoices && onNavigateToInvoices(student.full_name)}
                          title="View Invoices for this Student"
                        >
                          <Receipt size={14} /> Invoices
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <AddStudentModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}
