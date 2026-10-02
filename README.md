<div align="center">

# 🎓 FeeBridge

### Enterprise School Fee & Digital Escrow Infrastructure

[![Django](https://img.shields.io/badge/Django-5.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-REST%20API-red?style=for-the-badge&logo=django)](https://www.django-rest-framework.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Chapa Fintech](https://img.shields.io/badge/Chapa-Payment%20Gateway-00C48C?style=for-the-badge)](https://chapa.co/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>FeeBridge</strong> is a cloud-native fintech platform designed for primary, secondary, and higher-education campuses. It unifies multi-campus tuition management, automated escrow auto-pay, milestone installment billing, and instant digital payment clearing (Telebirr, CBE Birr, and Cards via Chapa) with bank-grade audit ledger reporting.
</p>

[Live Production Demo](#-live-demo--quick-access) • [Key Features](#-core-features) • [System Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [API Reference](#-api-endpoints)

</div>

---

## 📸 Platform Showcase

### 1. Parent Tuition Terminal & Escrow Wallet
> Real-time escrow balance tracking, student fee profiles, and automated settlement controls.

<div align="center">
  <img src="docs/screenshots/dashboard_parent.png" alt="FeeBridge Parent Dashboard" width="900" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
</div>

<br />

### 2. Multi-Role Auth Portal & Password Visibility
> Modern authentication terminal featuring role-based Quick Demo switching, secure credential inputs, and password reveal toggles.

<div align="center">
  <img src="docs/screenshots/login_portal.png" alt="FeeBridge Login Screen" width="750" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
</div>

<br />

### 3. Production 2-Step Password Recovery
> Automated 6-digit OTP verification code delivery via email with instant password reset.

<div align="center">
  <img src="docs/screenshots/forgot_password.png" alt="FeeBridge Password Reset" width="750" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
</div>

---

## ⚡ Core Features

### 🏦 Digital Escrow & Automated Settlements
* **Parent Escrow Wallets:** Parents maintain dedicated digital balances reserved exclusively for upcoming tuition charges.
* **Auto-Pay Settlement Engine:** Automatically debits escrow accounts on scheduled due dates using row-locked atomic transactions (`select_for_update`), generating instant digital receipts.
* **Low-Balance Safety Thresholds:** Configurable balance triggers alert parents before due dates if wallet funds fall below upcoming tuition requirements.

### 📅 Flexible Milestone & Installment Plans
* **2-Part Milestone Split (50% / 50%):** Bi-monthly equal halves.
* **3-Part Milestone Split (40% / 30% / 30%):** Trimester schedule with custom due dates.
* **Custom Plan Builder:** Campus registrars can generate arbitrary installment schedules tailored to family financial needs.
* **Sequential Payment Allocation:** General payments automatically clear oldest overdue milestones first.

### 💳 Real-Time Payment Clearing & Webhook Gateways
* **Chapa Payment Gateway:** Live checkout integration supporting **Telebirr**, **CBE Birr**, and **Debit/Credit Cards**.
* **Instant Webhook Engine:** HMAC-signed webhook listener verifies transaction references and instantly updates invoice status to `PAID` or `PARTIALLY_PAID`.
* **Tamper-Resistant Receipts:** Generates downloadable payment vouchers with unique transaction reference hashes.

### 🏢 Multi-Campus Organization & Hierarchy
* **Campus Isolation:** Separate data isolation for multiple schools and branches under a single institution.
* **Grade-Wise Tuition Matrices:** Tiered fee structures based on student grade level, section, and academic term.
* **Role-Based Access Control (RBAC):**
  * `ADMIN`: Master campus configuration, staff recruitment, school-wide financial reports, and audit ledgers.
  * `STAFF`: Daily student enrollment, tuition billing generation, installment authorization, and payment audits.
  * `PARENT`: Child profile inspection, escrow top-ups, invoice settlement, and payment history.

### 📊 Financial Intelligence & Audit Reports
* **Executive Revenue Summary:** Tracks total billed tuition, collected revenue, pending collections, and overdue rates.
* **Grade-Level Delinquency Analysis:** Visual breakdown pinpointing collection performance per grade level.
* **Immutable Audit Trail:** Chronological transaction log recording every wallet top-up, deduction, and gateway clearing.

---

## 🌐 Live Demo & Quick Access

The platform includes pre-seeded production accounts for immediate evaluation:

| Role | Demo Email | Password | Pre-loaded Environment |
| :--- | :--- | :--- | :--- |
| **Parent** | `parent@feebridge.com` | `12345678` | **5,000 ETB Escrow Balance**, 2 enrolled students, active invoices |
| **Staff** | `staff@feebridge.com` | `12345678` | Springfield Academy registrar & billing officer permissions |
| **Admin** | `admin@feebridge.com` | `12345678` | Full multi-campus institution management & audit logs |

> **Tip:** You can click the **Quick Demo** pills on the login screen to autofill any role with one click.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client Layer
        A[React 19 + Vite SPA]
        B[Lucide Fintech UI]
    end

    subgraph API Gateway & Security
        C[Django REST Framework]
        D[SimpleJWT Authentication]
        E[Role-Based Permissions RBAC]
    end

    subgraph Business Logic Engines
        F[Escrow & Settlement Engine]
        G[Installment Schedule Engine]
        H[Notification & Reminder Dispatcher]
    end

    subgraph External Services
        I[Chapa Payment Gateway]
        J[SMTP Email Service]
    end

    subgraph Persistence Layer
        K[(PostgreSQL Managed Database)]
        L[WhiteNoise Compressed Assets]
    end

    A -->|HTTPS / Bearer JWT| C
    C --> D
    D --> E
    E --> F
    E --> G
    E --> H
    F -->|Atomic Transactions| K
    G --> K
    F -->|Initialize Checkout| I
    I -->|HMAC Webhook| C
    H -->|Send OTP / Alerts| J
    A --> L
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Lucide React, Modern CSS3 Tokens (Stripe/Mercury inspired) |
| **Backend** | Python 3.12+, Django 5.x, Django REST Framework, SimpleJWT |
| **Database** | PostgreSQL (Production) / SQLite (Development) |
| **Static Delivery** | WhiteNoise (`CompressedManifestStaticFilesStorage`) |
| **Payment Gateway** | Chapa API (Telebirr, CBE Birr, Debit/Credit Cards) |
| **Email & Security** | SMTP TLS Email Gateway, PBKDF2 Password Hashing, CSRF/CORS Middleware |
| **Cloud Deployment** | Render (Web Service + Managed PostgreSQL), Vercel (Edge CDN) |

---

## 🚀 Getting Started

### Prerequisites
* **Python 3.12+**
* **Node.js 20+**
* **Git**
* (Optional) **PostgreSQL** (SQLite is preconfigured for zero-friction local development)

---

### 1. Clone the Repository
```bash
git clone https://github.com/devbiniyam/FeeBridge.git
cd FeeBridge
```

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
# Windows:
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux:
# python3 -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed initial common demo accounts, school, and invoices
python manage.py seed_demo_data

# Start development server
python manage.py runserver 8000
```
> The API will be active at `http://127.0.0.1:8000/api/`.

---

### 3. Frontend Setup

```bash
# Open a new terminal in the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
> The web application will launch at `http://localhost:5173/`.

---

### 4. Running Automated Tests

```bash
cd backend
python manage.py test api accounts fees
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory (refer to [`.env.example`](file:///d:/Projects/FeeBridge/backend/.env.example)):

```ini
# Core
SECRET_KEY=your-secure-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com

# Database (Leave blank to use local SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/feebridge

# CORS & CSRF
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.vercel.app
CSRF_TRUSTED_ORIGINS=http://localhost:5173,https://*.onrender.com

# Chapa Gateway (Test / Live)
CHAPA_SECRET_KEY=CHASECK_TEST-your-chapa-secret-key
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-your-chapa-public-key
CHAPA_WEBHOOK_SECRET=your-webhook-secret
CHAPA_API_URL=https://api.chapa.co/v1

# Email Service (SMTP for Password Reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=FeeBridge Support <noreply@feebridge.com>
```

For the **Frontend**, configure `frontend/.env`:
```ini
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 📡 API Endpoints

### 🔐 Authentication & Accounts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/token/` | Obtain JWT access and refresh token pair |
| `POST` | `/api/token/refresh/` | Refresh expired access token |
| `GET` | `/api/me/` | Fetch authenticated user profile & wallet metadata |
| `POST` | `/api/register/` | Register parent account |
| `POST` | `/api/password-reset/request/` | Dispatch 6-digit OTP code to user email |
| `POST` | `/api/password-reset/confirm/` | Validate 6-digit OTP and reset account password |

### 💳 Escrow Wallets & Payments
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/wallets/my-wallet/` | Retrieve parent wallet balance and auto-pay settings |
| `GET` | `/api/wallets/transactions/` | Ledger of wallet top-ups and deductions |
| `POST` | `/api/wallets/deposit/` | Fund digital escrow balance via card/mobile money |
| `POST` | `/api/wallets/pay-invoice/` | Direct deduction from escrow to settle invoice |
| `POST` | `/api/wallets/toggle-auto-pay/` | Toggle automated due-date settlement engine |
| `POST` | `/api/payments/checkout/initialize/` | Initialize hosted Chapa payment session |
| `POST` | `/api/payments/webhook/chapa/` | Webhook listener for external gateway confirmation |

### 📑 Tuition & Invoices
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` / `POST` | `/api/invoices/` | List and create invoices (filtered by parent/school) |
| `POST` | `/api/invoices/generate/` | Batch invoice generation for all active students |
| `POST` | `/api/invoices/auto-pay-run/` | Execute batch escrow settlement across due invoices |
| `POST` | `/api/invoices/<id>/installments/` | Split invoice into 2-part, 3-part, or custom milestones |
| `DELETE` | `/api/invoices/<id>/installments/` | Cancel milestone schedule and revert to single bill |

### 📈 Reports & Audit
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/reports/financial-summary/` | Total revenue, collected, and pending analytics |
| `GET` | `/api/reports/grade-breakdown/` | Collection and delinquency rates per grade |
| `GET` | `/api/reports/audit-ledger/` | Comprehensive compliance and payment audit trail |

---

## 🔒 Security Standards

* **Zero Plaintext Passwords:** Passwords hashed with PBKDF2/SHA256 with random cryptographic salts.
* **Atomic Currency Debiting:** All wallet deductions and invoice payment allocations wrapped in database transactions with row-level locks (`select_for_update`) to prevent double-spending.
* **Granular Role Isolation:** Staff members are constrained strictly to their own campus; parents can only view their registered children and invoices.
* **SSL/TLS Protection:** Production builds configure `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, and `X-Frame-Options: DENY`.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

<div align="center">
  <sub>Built with ❤️ by the FeeBridge Engineering Team.</sub>
</div>
