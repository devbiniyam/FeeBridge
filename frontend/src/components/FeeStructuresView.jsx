import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { feeStructureService } from '../services/api';
import FeeStructureModal from './FeeStructureModal';
import {
  CreditCard,
  Plus,
  Edit2,
  GraduationCap,
  Users,
  TrendingUp,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calculator,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';

export default function FeeStructuresView({
  onNavigateToGenerate,
  onNavigateToInvoices,
  onNavigateBack
}) {
  const { user } = useAuth();
  const isParent = user?.role === 'PARENT';
  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Filter state
  const [gradeFilter, setGradeFilter] = useState('ALL'); // 'ALL' | 'ELEMENTARY' (1-4) | 'MIDDLE' (5-8) | 'HIGH' (9-12)
  const [selectedStructureForEdit, setSelectedStructureForEdit] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFeeStructures = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await feeStructureService.getFeeStructures();
      setFeeStructures(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load fee structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeStructures();
  }, []);

  const configuredGrades = feeStructures.map((f) => f.grade);

  // Compute analytics
  const totalConfigured = feeStructures.length;
  const avgAmount =
    totalConfigured > 0
      ? feeStructures.reduce((acc, f) => acc + parseFloat(f.amount || 0), 0) / totalConfigured
      : 0;

  const totalEnrolledAcrossConfigured = feeStructures.reduce(
    (acc, f) => acc + (f.student_count || 0),
    0
  );

  const totalProjectedMonthlyYield = feeStructures.reduce(
    (acc, f) => acc + (f.student_count || 0) * parseFloat(f.amount || 0),
    0
  );

  const getTierName = (g) => {
    if (g <= 4) return 'Primary School';
    if (g <= 8) return 'Middle School';
    return 'High School';
  };

  // Build 12 Grade Matrix items
  const all12Grades = Array.from({ length: 12 }, (_, i) => {
    const gradeNum = i + 1;
    const existing = feeStructures.find((f) => f.grade === gradeNum);
    return {
      grade: gradeNum,
      configured: !!existing,
      structure: existing || null,
      tier: getTierName(gradeNum),
    };
  });

  const filteredGrades = all12Grades.filter((item) => {
    if (gradeFilter === 'PRIMARY' && (item.grade < 1 || item.grade > 4)) return false;
    if (gradeFilter === 'MIDDLE' && (item.grade < 5 || item.grade > 8)) return false;
    if (gradeFilter === 'HIGH' && (item.grade < 9 || item.grade > 12)) return false;
    return true;
  });

  const handleOpenAdd = (preselectedGrade = null) => {
    if (preselectedGrade) {
      setSelectedStructureForEdit({ grade: preselectedGrade });
    } else {
      setSelectedStructureForEdit(null);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (structure) => {
    setSelectedStructureForEdit(structure);
    setIsModalOpen(true);
  };

  return (
    <div className="fee-structures-container">
      {/* Top Banners */}
      {successBanner && (
        <div className="fintech-alert-banner alert-success">
          <CheckCircle2 size={16} />
          <span>{successBanner}</span>
        </div>
      )}

      {error && (
        <div className="fintech-alert-banner alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* View Header */}
      <div className="fintech-view-header">
        <div className="view-header-left">
          <div className="view-title-row">
            <h2>{isParent ? 'Official Campus Tuition Schedule' : 'Campus Fee Structures & Multi-Grade Pricing'}</h2>
            <span className="fintech-badge badge-primary">
              <Building size={12} /> {user?.school_name || 'Assigned Campus'}
            </span>
          </div>
          <p className="view-header-subtitle">
            {isParent
              ? 'Transparent institutional fee schedule for your children’s school grades, payment terms, and billing cycles.'
              : 'Govern monthly tuition rates across Grade 1 through 12. Configured rates automatically power campus batch invoicing.'}
          </p>
        </div>

        {isStaffOrAdmin && (
          <div className="view-header-actions">
            {onNavigateToGenerate && (
              <button
                type="button"
                className="btn-fintech-secondary"
                onClick={onNavigateToGenerate}
                title="Generate batch monthly invoices"
              >
                <Sparkles size={15} />
                <span>Run Batch Invoicing</span>
              </button>
            )}

            <button
              type="button"
              className="btn-fintech-primary"
              onClick={() => handleOpenAdd()}
            >
              <Plus size={16} />
              <span>Configure Grade Rate</span>
            </button>
          </div>
        )}
      </div>

      {/* Staff KPI Analytics Bar */}
      {isStaffOrAdmin && (
        <div className="fee-analytics-grid">
          <div className="fee-stat-card stat-card-configured">
            <div className="stat-card-top">
              <span className="stat-label">CONFIGURED GRADES</span>
              <div className="stat-icon-bubble bubble-indigo">
                <Layers size={18} />
              </div>
            </div>
            <div className="stat-big-num">
              <strong>{totalConfigured}</strong>
              <span className="stat-num-sub">/ 12 Grades Set</span>
            </div>
            <div className="stat-bar-track">
              <div
                className="stat-bar-fill"
                style={{ width: `${(totalConfigured / 12) * 100}%` }}
              />
            </div>
          </div>

          <div className="fee-stat-card stat-card-average">
            <div className="stat-card-top">
              <span className="stat-label">AVERAGE MONTHLY TUITION</span>
              <div className="stat-icon-bubble bubble-cyan">
                <Calculator size={18} />
              </div>
            </div>
            <div className="stat-big-num">
              <strong>{avgAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
              <span className="stat-num-sub">ETB / student</span>
            </div>
            <span className="stat-footer-hint">Standard across active grade tiers</span>
          </div>

          <div className="fee-stat-card stat-card-students">
            <div className="stat-card-top">
              <span className="stat-label">ENROLLED STUDENT COVERAGE</span>
              <div className="stat-icon-bubble bubble-teal">
                <Users size={18} />
              </div>
            </div>
            <div className="stat-big-num">
              <strong>{totalEnrolledAcrossConfigured}</strong>
              <span className="stat-num-sub">Students Enrolled</span>
            </div>
            <span className="stat-footer-hint">Directly mapped to configured rates</span>
          </div>

          <div className="fee-stat-card stat-card-yield">
            <div className="stat-card-top">
              <span className="stat-label">PROJECTED MONTHLY REVENUE</span>
              <div className="stat-icon-bubble bubble-emerald">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="stat-big-num text-emerald">
              <strong>{totalProjectedMonthlyYield.toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
              <span className="stat-num-sub">ETB / month</span>
            </div>
            <span className="stat-footer-hint">Based on active campus roster</span>
          </div>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="fee-filter-bar">
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill ${gradeFilter === 'ALL' ? 'pill-active' : ''}`}
            onClick={() => setGradeFilter('ALL')}
          >
            All Grades (1–12)
          </button>
          <button
            type="button"
            className={`filter-pill ${gradeFilter === 'PRIMARY' ? 'pill-active' : ''}`}
            onClick={() => setGradeFilter('PRIMARY')}
          >
            Primary (Grades 1–4)
          </button>
          <button
            type="button"
            className={`filter-pill ${gradeFilter === 'MIDDLE' ? 'pill-active' : ''}`}
            onClick={() => setGradeFilter('MIDDLE')}
          >
            Middle School (Grades 5–8)
          </button>
          <button
            type="button"
            className={`filter-pill ${gradeFilter === 'HIGH' ? 'pill-active' : ''}`}
            onClick={() => setGradeFilter('HIGH')}
          >
            High School (Grades 9–12)
          </button>
        </div>

        <div className="filter-stats-badge">
          <span>Showing {filteredGrades.length} Grade Tiers</span>
        </div>
      </div>

      {/* 12-Grade Matrix Cards Grid */}
      {loading ? (
        <div className="fee-loading-state">
          <div className="spinner-large" />
          <p>Loading campus fee structures...</p>
        </div>
      ) : (
        <div className="grade-matrix-grid">
          {filteredGrades.map((item) => {
            const isConfigured = item.configured;
            const fs = item.structure;

            return (
              <div
                key={item.grade}
                className={`grade-rate-card ${isConfigured ? 'rate-card-active' : 'rate-card-unconfigured'}`}
              >
                {/* Card Top */}
                <div className="rate-card-top">
                  <div className="grade-title-group">
                    <div className="grade-badge-circle">
                      <span>{item.grade}</span>
                    </div>
                    <div>
                      <h4 className="grade-name">Grade {item.grade}</h4>
                      <span className="grade-tier-sub">{item.tier}</span>
                    </div>
                  </div>

                  {isConfigured ? (
                    <span className="rate-status-pill pill-configured">
                      <CheckCircle2 size={12} /> Active Rate
                    </span>
                  ) : (
                    <span className="rate-status-pill pill-pending">
                      Not Set
                    </span>
                  )}
                </div>

                {/* Card Pricing Body */}
                <div className="rate-card-body">
                  {isConfigured ? (
                    <>
                      <div className="rate-amount-display">
                        <span className="rate-currency">ETB</span>
                        <strong className="rate-value">
                          {parseFloat(fs.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                        <span className="rate-period">/ month</span>
                      </div>

                      <div className="rate-metadata-rows">
                        <div className="metadata-row">
                          <span className="meta-label">Annual Estimate (10 mos):</span>
                          <strong className="meta-val">
                            {parseFloat(fs.annual_estimate || fs.amount * 10).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                          </strong>
                        </div>
                        <div className="metadata-row">
                          <span className="meta-label">Enrolled Students:</span>
                          <strong className="meta-val">{fs.student_count || 0} students</strong>
                        </div>
                        <div className="metadata-row">
                          <span className="meta-label">Est. Monthly Batch:</span>
                          <strong className="meta-val text-emerald">
                            {((fs.student_count || 0) * parseFloat(fs.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                          </strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rate-unconfigured-state">
                      <CreditCard size={28} className="unconfigured-icon" />
                      <p className="unconfigured-text">
                        No official tuition rate configured for Grade {item.grade}.
                      </p>
                      <span className="unconfigured-hint">
                        Invoices cannot be batch-generated for students in this grade until a rate is set.
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="rate-card-footer">
                  {isStaffOrAdmin ? (
                    isConfigured ? (
                      <button
                        type="button"
                        className="btn-card-action btn-edit-rate"
                        onClick={() => handleOpenEdit(fs)}
                      >
                        <Edit2 size={13} />
                        <span>Adjust Rate</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-card-action btn-configure-rate"
                        onClick={() => handleOpenAdd(item.grade)}
                      >
                        <Plus size={13} />
                        <span>Set Grade {item.grade} Rate</span>
                      </button>
                    )
                  ) : (
                    isConfigured && onNavigateToInvoices && (
                      <button
                        type="button"
                        className="btn-card-action btn-parent-invoice-link"
                        onClick={onNavigateToInvoices}
                      >
                        <span>View Tuition Invoices</span>
                        <ArrowRight size={13} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Parent Policy & Institutional Assurance Banner */}
      <div className="campus-policy-banner">
        <div className="policy-icon">
          <ShieldCheck size={28} />
        </div>
        <div className="policy-text">
          <strong>Institutional Governance & Escrow Protection</strong>
          <p>
            Tuition rates are strictly established by approved campus bursars in accordance with educational guidelines.
            All payments made by parents are deposited into row-locked digital escrow accounts, guaranteeing transparent
            financial settlement and receipt verification for academic terms.
          </p>
        </div>
      </div>

      {/* Add / Edit Fee Structure Modal */}
      {isModalOpen && (
        <FeeStructureModal
          structure={selectedStructureForEdit}
          existingGrades={configuredGrades}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchFeeStructures();
            setSuccessBanner('Fee structure rate saved and synchronized successfully!');
            setTimeout(() => setSuccessBanner(null), 4000);
          }}
        />
      )}
    </div>
  );
}
