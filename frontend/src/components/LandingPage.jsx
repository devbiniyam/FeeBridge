import React from 'react';
import {
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Wallet,
  CalendarCheck2,
  CheckCircle2,
  Building,
  BarChart3,
  Sparkles,
  Lock,
  ChevronRight,
  CreditCard,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function LandingPage({ onLaunchPortal, onSelectDemo }) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Top Fintech Navigation */}
      <header className="landing-navbar">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-logo-gem">
              <GraduationCap size={24} />
            </div>
            <div className="landing-brand-text">
              <span className="brand-title">FeeBridge</span>
              <span className="brand-tag">FINTECH SUITE</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <button type="button" onClick={() => scrollToSection('features')} className="nav-text-link">
              Features
            </button>
            <button type="button" onClick={() => scrollToSection('families')} className="nav-text-link">
              For Families
            </button>
            <button type="button" onClick={() => scrollToSection('schools')} className="nav-text-link">
              For Schools
            </button>
            <button type="button" onClick={() => scrollToSection('how-it-works')} className="nav-text-link">
              How It Works
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn-nav-signin"
              onClick={() => onLaunchPortal('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn-nav-primary"
              onClick={() => onLaunchPortal('login')}
            >
              <span>Launch Portal</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-content-wrapper">
          <div className="hero-badge">
            <Sparkles size={14} className="text-amber" />
            <span>Enterprise Education Fintech • Powered by Chapa & Digital Escrow</span>
          </div>

          <h1 className="hero-main-headline">
            The Intelligent Way Schools Bill <br className="hidden-mobile" />
            and Families Pay Tuition
          </h1>

          <p className="hero-narrative-paragraph">
            Say goodbye to crowded bank queues, lost paper deposit slips, and administrative accounting chaos.
            <strong> FeeBridge</strong> is a modern education-fintech platform that bridges schools and families
            with complete financial clarity. Parents can pay tuition in under 60 seconds via
            <strong> Telebirr, CBE Birr, or cards</strong>, set up hands-free auto-settlement through
            <strong> dedicated digital escrow wallets</strong>, and split semester fees into
            <strong> flexible milestone plans</strong>. Meanwhile, schools eliminate fraud and manual reconciliation
            with real-time verification and <strong>bank-grade audit ledgers</strong>.
          </p>

          <div className="hero-cta-cluster">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => onLaunchPortal('login')}
            >
              <span>Launch Platform</span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => scrollToSection('how-it-works')}
            >
              <span>See How It Works</span>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Quick Demo Jump Box */}
          <div className="hero-quick-demo-banner">
            <span className="demo-banner-label">Instant Interactive Demo:</span>
            <div className="demo-pill-group">
              <button
                type="button"
                className="demo-pill pill-parent"
                onClick={() => onSelectDemo('parent')}
                title="Robert Johnson (Parent with 5,000 ETB Wallet)"
              >
                👨‍👩‍👧 Parent Demo (5,000 ETB)
              </button>
              <button
                type="button"
                className="demo-pill pill-staff"
                onClick={() => onSelectDemo('staff')}
                title="Sarah Smith (Staff Billing Officer)"
              >
                🏫 Staff Demo
              </button>
              <button
                type="button"
                className="demo-pill pill-admin"
                onClick={() => onSelectDemo('admin')}
                title="John Doe (Institution Administrator)"
              >
                🛡️ Admin Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics & Highlights Row */}
      <section className="landing-metrics-bar">
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-num">&lt; 60s</span>
            <span className="metric-desc">Mobile Tuition Settlement</span>
          </div>
          <div className="metric-box">
            <span className="metric-num">100%</span>
            <span className="metric-desc">Bank-Grade Escrow Security</span>
          </div>
          <div className="metric-box">
            <span className="metric-num">2-3 Part</span>
            <span className="metric-desc">Flexible Milestone Splits</span>
          </div>
          <div className="metric-box">
            <span className="metric-num">Zero</span>
            <span className="metric-desc">Manual Deposit-Slip Audits</span>
          </div>
        </div>
      </section>

      {/* Dual Value Matrix Section */}
      <section id="features" className="landing-matrix-section">
        <div className="section-header-centered">
          <span className="section-eyebrow">BUILT FOR BOTH SIDES</span>
          <h2>Engineered for Families and School Administrations</h2>
          <p>A unified operating system giving parents stress-free payments and schools 100% financial clarity.</p>
        </div>

        <div className="matrix-dual-container">
          {/* Column 1: For Families */}
          <div id="families" className="matrix-column column-families">
            <div className="column-header">
              <div className="column-icon-badge badge-families">
                <Smartphone size={20} />
              </div>
              <div>
                <h3>For Families & Parents</h3>
                <p>Never stand in a bank queue again</p>
              </div>
            </div>

            <div className="matrix-cards-list">
              <div className="matrix-card">
                <div className="card-top-icon text-emerald">
                  <CreditCard size={20} />
                </div>
                <h4>Pay Tuition in Under 60 Seconds</h4>
                <p>
                  Settle school invoices instantly from your phone using Telebirr, CBE Birr, or debit cards. Official
                  tamper-proof digital receipts are generated instantly.
                </p>
              </div>

              <div className="matrix-card">
                <div className="card-top-icon text-indigo">
                  <Wallet size={20} />
                </div>
                <h4>Hands-Free Escrow Auto-Pay</h4>
                <p>
                  Pre-fund your family tuition wallet once. Fees clear automatically on scheduled due dates, preventing
                  accidental late fees while keeping your funds 100% safe.
                </p>
              </div>

              <div className="matrix-card">
                <div className="card-top-icon text-teal">
                  <CalendarCheck2 size={20} />
                </div>
                <h4>Budget-Friendly Milestone Splits</h4>
                <p>
                  Split heavy semester tuition into manageable 50/50 equal halves or trimester 40/30/30 installments that
                  match your family's monthly budget.
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: For Schools */}
          <div id="schools" className="matrix-column column-schools">
            <div className="column-header">
              <div className="column-icon-badge badge-schools">
                <Building size={20} />
              </div>
              <div>
                <h3>For Schools & Finance Teams</h3>
                <p>End the chaos of lost deposit slips</p>
              </div>
            </div>

            <div className="matrix-cards-list">
              <div className="matrix-card">
                <div className="card-top-icon text-rose">
                  <ShieldCheck size={20} />
                </div>
                <h4>Zero Manual Bank-Slip Verification</h4>
                <p>
                  Stop manually verifying physical bank slips. Payments clear directly into school accounts with verified
                  cryptographic transaction references.
                </p>
              </div>

              <div className="matrix-card">
                <div className="card-top-icon text-amber">
                  <Layers size={20} />
                </div>
                <h4>Multi-Campus & Tiered Matrices</h4>
                <p>
                  Configure grade-specific tuition matrices, manage student rosters, and supervise multiple campus branches
                  from a single central administration console.
                </p>
              </div>

              <div className="matrix-card">
                <div className="card-top-icon text-blue">
                  <BarChart3 size={20} />
                </div>
                <h4>Live Financial Audit Ledgers</h4>
                <p>
                  Real-time analytics tracking collected revenue, outstanding balances, and grade-level delinquency rates
                  with instant exportable audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="landing-steps-section">
        <div className="section-header-centered">
          <span className="section-eyebrow">SEAMLESS WORKFLOW</span>
          <h2>How FeeBridge Works in 3 Simple Steps</h2>
          <p>From tuition billing to automatic settlement in minutes.</p>
        </div>

        <div className="steps-row-container">
          <div className="step-card">
            <div className="step-number-pill">01</div>
            <h3>School Issues Monthly Invoices</h3>
            <p>
              Campus administration generates term or monthly tuition bills matched automatically to each student's grade
              tier.
            </p>
          </div>

          <div className="step-connector-line"></div>

          <div className="step-card">
            <div className="step-number-pill">02</div>
            <h3>Parent Chooses Settlement Method</h3>
            <p>
              Parents pay in 60 seconds with mobile money (Telebirr/CBE Birr), split into milestones, or let their escrow
              wallet auto-clear.
            </p>
          </div>

          <div className="step-connector-line"></div>

          <div className="step-card">
            <div className="step-number-pill">03</div>
            <h3>Instant Clearing & Digital Receipt</h3>
            <p>
              Both school and parents receive real-time payment confirmation with downloadable, tamper-proof vouchers and
              zero manual audits.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="landing-bottom-cta">
        <div className="bottom-cta-inner">
          <div className="cta-icon-glow">
            <GraduationCap size={40} />
          </div>
          <h2>Ready to Modernize School Tuition?</h2>
          <p>Join parents and progressive schools using FeeBridge for effortless educational finance.</p>

          <div className="bottom-cta-actions">
            <button
              type="button"
              className="btn-hero-primary btn-large"
              onClick={() => onLaunchPortal('login')}
            >
              <span>Launch Platform</span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="btn-hero-secondary btn-large"
              onClick={() => onSelectDemo('parent')}
            >
              <span>Try Parent Demo</span>
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-left">
            <div className="footer-logo">
              <GraduationCap size={20} />
              <span>FeeBridge</span>
            </div>
            <p>© 2026 FeeBridge. Intelligent School Fee & Digital Escrow Infrastructure. All rights reserved.</p>
          </div>

          <div className="footer-right">
            <button type="button" onClick={() => onLaunchPortal('login')} className="footer-link">
              Sign In
            </button>
            <button type="button" onClick={() => onLaunchPortal('register')} className="footer-link">
              Create Parent Account
            </button>
            <button type="button" onClick={() => scrollToSection('features')} className="footer-link">
              Platform Features
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
