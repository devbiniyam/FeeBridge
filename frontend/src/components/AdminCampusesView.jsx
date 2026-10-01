import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { schoolService, staffService } from '../services/api';
import CampusModal from './CampusModal';
import StaffProvisionModal from './StaffProvisionModal';
import {
  Building,
  Users,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
  Plus,
  UserPlus,
  RefreshCw,
  Edit2,
  Phone,
  MapPin,
  Hash,
  GraduationCap,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export default function AdminCampusesView({ onNavigateBack, onNavigateToInvoices, onNavigateToReports }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Active tab: 'campuses' | 'staff'
  const [activeTab, setActiveTab] = useState('campuses');

  // Data states
  const [campuses, setCampuses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & filter states
  const [campusSearch, setCampusSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffSchool, setSelectedStaffSchool] = useState('');

  // Modals state
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Fetch all campuses and staff
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campusesRes, staffRes] = await Promise.all([
        schoolService.getSchools(),
        staffService.getStaffList(),
      ]);
      setCampuses(campusesRes || []);
      setStaffList(staffRes || []);
    } catch (err) {
      console.error('Failed to load campuses or staff:', err);
      setError(err.message || 'Failed to load institutional administration data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Telemetry Aggregates
  const totalCampusesCount = campuses.length;
  const totalStaffCount = staffList.length;
  const totalStudentsCount = useMemo(() => {
    return campuses.reduce((sum, c) => sum + (c.student_count || 0), 0);
  }, [campuses]);

  const totalBilledSystem = useMemo(() => {
    return campuses.reduce((sum, c) => sum + parseFloat(c.total_billed || 0), 0);
  }, [campuses]);

  const totalCollectedSystem = useMemo(() => {
    return campuses.reduce((sum, c) => sum + parseFloat(c.total_collected || 0), 0);
  }, [campuses]);

  const systemCollectionRate = totalBilledSystem > 0
    ? Math.round((totalCollectedSystem / totalBilledSystem) * 100)
    : 0;

  // Filtered Campuses
  const filteredCampuses = useMemo(() => {
    if (!campusSearch.trim()) return campuses;
    const query = campusSearch.toLowerCase();
    return campuses.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.unique_code.toLowerCase().includes(query) ||
        (c.address && c.address.toLowerCase().includes(query))
    );
  }, [campuses, campusSearch]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSchool = selectedStaffSchool
        ? String(s.school) === String(selectedStaffSchool)
        : true;
      const query = staffSearch.toLowerCase();
      const matchesQuery = query
        ? (s.first_name && s.first_name.toLowerCase().includes(query)) ||
          (s.last_name && s.last_name.toLowerCase().includes(query)) ||
          (s.email && s.email.toLowerCase().includes(query)) ||
          (s.phone_number && s.phone_number.includes(query)) ||
          (s.school_name && s.school_name.toLowerCase().includes(query))
        : true;
      return matchesSchool && matchesQuery;
    });
  }, [staffList, selectedStaffSchool, staffSearch]);

  // Handlers
  const handleOpenCreateCampus = () => {
    setEditingCampus(null);
    setIsCampusModalOpen(true);
  };

  const handleOpenEditCampus = (campus) => {
    setEditingCampus(campus);
    setIsCampusModalOpen(true);
  };

  const handleOpenCreateStaff = () => {
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff) => {
    setEditingStaff(staff);
    setIsStaffModalOpen(true);
  };

  const handleManageCampusStaff = (campusId) => {
    setSelectedStaffSchool(String(campusId));
    setActiveTab('staff');
  };

  return (
    <div className="admin-campuses-view-container">
      {/* Top Header & Telemetry Controls */}
      <div className="admin-header-section">
        <div className="admin-title-block">
          <div className="admin-badge-row">
            <span className="fintech-badge badge-primary">
              <ShieldCheck size={13} /> Central Administration Console
            </span>
            <span className="fintech-badge badge-emerald">
              <Building size={13} /> Multi-Tenant Architecture
            </span>
            <span className="fintech-badge badge-indigo">
              <TrendingUp size={13} /> Institutional Telemetry
            </span>
          </div>
          <h1 className="admin-main-heading">Institutional Campuses & Tenant Governance</h1>
          <p className="admin-sub-heading">
            Centralized administration for registered school tenants, bursar operators, nationwide enrollment rosters, and fee settlement oversight.
          </p>
        </div>

        <div className="admin-actions-group">
          <button
            type="button"
            className="btn-fintech-secondary"
            onClick={fetchData}
            disabled={loading}
            title="Refresh All Campus Data"
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn-fintech-secondary"
            onClick={handleOpenCreateStaff}
            title="Provision a new campus bursar or operator"
          >
            <UserPlus size={15} />
            <span>Provision Staff</span>
          </button>

          <button
            type="button"
            className="btn-fintech-primary"
            onClick={handleOpenCreateCampus}
            title="Onboard a new institutional school tenant"
          >
            <Plus size={15} />
            <span>Onboard Campus</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert-fintech-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" className="btn-alert-dismiss" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* High-Impact Platform Telemetry Bar */}
      <div className="fintech-kpi-grid admin-kpi-grid">
        {/* KPI 1: Total Campuses */}
        <div className="fintech-kpi-card kpi-card-school">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">REGISTERED CAMPUSES</span>
            <div className="kpi-icon-pill icon-pill-purple">
              <Building size={18} />
            </div>
          </div>
          <div className="kpi-big-value">
            <strong>{totalCampusesCount}</strong>
            <span className="kpi-sub-heading" style={{ marginLeft: '0.5rem' }}>Active Tenants</span>
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">Isolated multi-tenant schemas</span>
            <span className="kpi-badge-live">Online</span>
          </div>
        </div>

        {/* KPI 2: Bursar Operators */}
        <div className="fintech-kpi-card kpi-card-security">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">BURSAR OPERATORS</span>
            <div className="kpi-icon-pill icon-pill-cyan">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="kpi-big-value">
            <strong>{totalStaffCount}</strong>
            <span className="kpi-sub-heading" style={{ marginLeft: '0.5rem' }}>Staff Accounts</span>
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">Authorized campus billing operators</span>
            <span className="kpi-tag-verified">Verified</span>
          </div>
        </div>

        {/* KPI 3: Nationwide Students */}
        <div className="fintech-kpi-card kpi-card-billing">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">NATIONWIDE STUDENTS</span>
            <div className="kpi-icon-pill icon-pill-amber">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-big-value">
            <strong>{totalStudentsCount}</strong>
            <span className="kpi-sub-heading" style={{ marginLeft: '0.5rem' }}>Enrolled</span>
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">Across all active campus rosters</span>
            <span className="kpi-tag-subtle">Roster</span>
          </div>
        </div>

        {/* KPI 4: Platform Settled Volume */}
        <div className="fintech-kpi-card kpi-card-wallet">
          <div className="kpi-card-header">
            <span className="kpi-card-eyebrow">TOTAL REVENUE SETTLED</span>
            <div className="kpi-icon-pill icon-pill-emerald">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-big-value text-emerald">
            <span className="kpi-currency">ETB</span>
            <strong>{totalCollectedSystem.toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong>
          </div>
          <div className="kpi-footer-row">
            <span className="kpi-hint-text">
              {systemCollectionRate}% system collection rate
            </span>
            <span className="kpi-badge-live">Settled</span>
          </div>
        </div>
      </div>

      {/* Central Tab Navigation */}
      <div className="reports-tab-nav">
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'campuses' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('campuses')}
        >
          <Building size={16} />
          <span>Campuses & Tenancy Roster</span>
          <span className="tab-pill-count">{campuses.length}</span>
        </button>

        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'staff' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <UserCheck size={16} />
          <span>Operators & Staff Provisioning</span>
          <span className="tab-pill-count">{staffList.length}</span>
        </button>
      </div>

      {/* Loading state indicator */}
      {loading && campuses.length === 0 && (
        <div className="reports-loading-box">
          <div className="spinner-large"></div>
          <p>Compiling institutional campuses and operators directory...</p>
        </div>
      )}

      {/* TAB 1: CAMPUSES & TENANCY ROSTER */}
      {activeTab === 'campuses' && (
        <div className="tab-pane-content">
          <div className="fintech-card">
            {/* Toolbar */}
            <div className="ledger-toolbar-section">
              <div className="toolbar-header-row">
                <div>
                  <h3 className="card-title">Institutional Campus Directory</h3>
                  <p className="card-subtitle">
                    Registered school tenants, unique isolation codes, and live student collection metrics
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-fintech-primary"
                  onClick={handleOpenCreateCampus}
                >
                  <Plus size={15} />
                  <span>Onboard Campus</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="campus-search-wrap">
                <Search size={15} className="input-icon-muted" />
                <input
                  type="text"
                  className="form-input-fintech"
                  placeholder="Search campus by name, tenant code, or city..."
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Campuses Grid */}
            <div className="fintech-card-body">
              {filteredCampuses.length === 0 ? (
                <div className="reports-empty-state">
                  <Building size={36} className="text-muted" />
                  <h4>No campuses match your search</h4>
                  <p>Try searching with another keyword or click below to onboard a new campus.</p>
                  <button
                    type="button"
                    className="btn-fintech-primary mt-3"
                    onClick={handleOpenCreateCampus}
                  >
                    <Plus size={15} />
                    <span>Onboard New Campus</span>
                  </button>
                </div>
              ) : (
                <div className="campuses-cards-grid">
                  {filteredCampuses.map((campus) => {
                    const billed = parseFloat(campus.total_billed || 0);
                    const collected = parseFloat(campus.total_collected || 0);
                    const rate = campus.collection_rate || 0;

                    return (
                      <div key={campus.id} className="campus-profile-card">
                        {/* Card Top: Code badge & Actions */}
                        <div className="campus-card-header">
                          <div className="campus-identity-group">
                            <div className="campus-icon-box">
                              <Building size={22} className="text-purple" />
                            </div>
                            <div>
                              <h4 className="campus-card-name">{campus.name}</h4>
                              <div className="campus-meta-chips">
                                <span className="campus-code-pill">
                                  <Hash size={11} /> {campus.unique_code}
                                </span>
                                <span className="campus-id-pill">ID #{campus.id}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn-card-edit"
                            onClick={() => handleOpenEditCampus(campus)}
                            title="Edit Campus Details"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>

                        {/* Location & Contact */}
                        <div className="campus-contact-row">
                          <div className="contact-item">
                            <MapPin size={13} className="text-muted" />
                            <span>{campus.address || 'Address not specified'}</span>
                          </div>
                          <div className="contact-item">
                            <Phone size={13} className="text-muted" />
                            <span>{campus.phone_number || 'N/A'}</span>
                          </div>
                        </div>

                        <hr className="campus-card-divider" />

                        {/* Mini Metrics Grid */}
                        <div className="campus-metrics-grid">
                          <div className="metric-chip">
                            <span className="metric-chip-label">Active Students</span>
                            <strong className="metric-chip-val">
                              {campus.student_count || 0}
                            </strong>
                          </div>

                          <div className="metric-chip">
                            <span className="metric-chip-label">Operators</span>
                            <strong className="metric-chip-val">
                              {campus.staff_count || 0}
                            </strong>
                          </div>

                          <div className="metric-chip">
                            <span className="metric-chip-label">Fee Rates</span>
                            <strong className="metric-chip-val text-indigo">
                              {campus.fee_structures_count || 0} / 12
                            </strong>
                          </div>

                          <div className="metric-chip">
                            <span className="metric-chip-label">Collection Rate</span>
                            <strong className={`metric-chip-val ${rate >= 75 ? 'text-emerald' : rate >= 40 ? 'text-amber' : 'text-rose'}`}>
                              {rate}%
                            </strong>
                          </div>
                        </div>

                        {/* Financial Figures */}
                        <div className="campus-figures-row">
                          <div>
                            <span className="fig-label">Total Invoiced:</span>
                            <span className="fig-val">{billed.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</span>
                          </div>
                          <div className="text-right">
                            <span className="fig-label">Settled:</span>
                            <span className="fig-val text-emerald font-semibold">
                              {collected.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="kpi-progress-bar-container" style={{ margin: '0.5rem 0' }}>
                          <div
                            className={`kpi-progress-fill ${rate >= 75 ? 'fill-emerald' : rate >= 40 ? 'fill-amber' : 'fill-rose'}`}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>

                        {/* Card Footer Actions */}
                        <div className="campus-card-footer">
                          <button
                            type="button"
                            className="btn-campus-action"
                            onClick={() => handleManageCampusStaff(campus.id)}
                          >
                            <Users size={13} />
                            <span>Staff ({campus.staff_count || 0})</span>
                          </button>

                          <button
                            type="button"
                            className="btn-campus-action btn-campus-primary"
                            onClick={() => handleOpenEditCampus(campus)}
                          >
                            <Edit2 size={13} />
                            <span>Edit Profile</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPERATORS & STAFF PROVISIONING */}
      {activeTab === 'staff' && (
        <div className="tab-pane-content">
          <div className="fintech-card">
            {/* Toolbar */}
            <div className="ledger-toolbar-section">
              <div className="toolbar-header-row">
                <div>
                  <h3 className="card-title">Campus Bursar & Staff Operators</h3>
                  <p className="card-subtitle">
                    Provisioned operator accounts authorized to manage tuition billing and fee structures
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-fintech-primary"
                  onClick={handleOpenCreateStaff}
                >
                  <UserPlus size={15} />
                  <span>Provision Operator</span>
                </button>
              </div>

              {/* Filters */}
              <div className="staff-filters-row">
                <div className="filter-input-wrap search-wrap">
                  <Search size={15} className="input-icon-muted" />
                  <input
                    type="text"
                    className="form-input-fintech"
                    placeholder="Search staff by name, email, or phone..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                  />
                </div>

                <div className="filter-input-wrap">
                  <Filter size={15} className="input-icon-muted" />
                  <select
                    className="form-select-fintech"
                    value={selectedStaffSchool}
                    onChange={(e) => setSelectedStaffSchool(e.target.value)}
                  >
                    <option value="">All Campuses ({staffList.length} Operators)</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.unique_code})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStaffSchool && (
                  <button
                    type="button"
                    className="btn-fintech-secondary"
                    onClick={() => setSelectedStaffSchool('')}
                  >
                    Clear Campus Filter
                  </button>
                )}
              </div>
            </div>

            {/* Staff Table */}
            <div className="fintech-card-body p-0">
              {filteredStaff.length === 0 ? (
                <div className="reports-empty-state">
                  <UserCheck size={36} className="text-muted" />
                  <h4>No staff operators found</h4>
                  <p>Provision a new operator or clear filters to view all staff members.</p>
                  <button
                    type="button"
                    className="btn-fintech-primary mt-3"
                    onClick={handleOpenCreateStaff}
                  >
                    <UserPlus size={15} />
                    <span>Provision First Operator</span>
                  </button>
                </div>
              ) : (
                <div className="reports-table-responsive">
                  <table className="reports-data-table">
                    <thead>
                      <tr>
                        <th>Operator</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Assigned Campus</th>
                        <th>Status</th>
                        <th>Date Joined</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((staff) => (
                        <tr key={staff.id}>
                          <td>
                            <div className="staff-operator-cell">
                              <div className="user-avatar-initials staff-avatar">
                                {staff.first_name ? staff.first_name[0] : 'S'}
                                {staff.last_name ? staff.last_name[0] : ''}
                              </div>
                              <div>
                                <strong className="staff-name">
                                  {staff.first_name} {staff.last_name}
                                </strong>
                                <span className="staff-role-pill">Campus Staff</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="cell-text-mono">{staff.email}</span>
                          </td>
                          <td>
                            <span className="cell-text-muted">{staff.phone_number || 'N/A'}</span>
                          </td>
                          <td>
                            <div className="campus-cell-badge">
                              <Building size={13} className="text-purple" />
                              <strong>{staff.school_name || 'Unassigned'}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="status-badge-active">
                              <CheckCircle2 size={12} /> Active
                            </span>
                          </td>
                          <td>
                            <span className="cell-text-muted">
                              {staff.date_joined ? new Date(staff.date_joined).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-fintech-outline btn-sm-table"
                              onClick={() => handleOpenEditStaff(staff)}
                            >
                              <Edit2 size={12} />
                              <span>Reassign / Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      {isCampusModalOpen && (
        <CampusModal
          campus={editingCampus}
          onClose={() => {
            setIsCampusModalOpen(false);
            setEditingCampus(null);
          }}
          onSuccess={() => {
            setIsCampusModalOpen(false);
            setEditingCampus(null);
            fetchData();
          }}
        />
      )}

      {isStaffModalOpen && (
        <StaffProvisionModal
          staff={editingStaff}
          campuses={campuses}
          onClose={() => {
            setIsStaffModalOpen(false);
            setEditingStaff(null);
          }}
          onSuccess={() => {
            setIsStaffModalOpen(false);
            setEditingStaff(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
