# PraanSewa – Complete Healthcare Management Platform

**PraanSewa** is an enterprise-grade, clean, scalable, and secure full-stack healthcare platform built from scratch with a modular monolithic architecture. It features three role-based portals (**Patient**, **Doctor**, and **Admin**), AI-powered healthcare & voice assistants, doctor-in-the-loop AI prescription drafting with drug-allergy interaction detection, clinically reviewed home remedies across 8 categories, and real-time WebRTC/Socket.IO online consultations.

---

## 1. Technology Stack

### Frontend
- **Framework & Tooling:** React.js 18, Vite, TypeScript
- **Styling & UI:** Tailwind CSS, Lucide React icons
- **Routing & State:** React Router DOM v6, TanStack Query v5
- **Networking & Forms:** Axios with JWT token refresh interceptor, React Hook Form, Zod
- **Data Visualization & Real-time:** Recharts, Socket.IO Client

### Backend
- **Runtime & Server:** Node.js, Express.js, TypeScript
- **Database ORM:** PostgreSQL exclusively, Prisma ORM
- **Security & Auth:** JWT Access/Refresh tokens, bcrypt password hashing, Helmet, CORS, Rate limiting
- **Real-Time Communication:** Socket.IO consultation namespaces
- **File Uploads & Validation:** Multer with static/Cloudinary adapters
- **Notifications:** Nodemailer with SMTP & simulation fallbacks

---

## 2. Platform Architecture & Portals

```
praansewa/
├── frontend/             # React + Vite + TypeScript + Tailwind CSS application
│   └── src/
│       ├── components/   # Modular UI primitives (StatCard, Badge, Button, Modal, Input)
│       ├── context/      # AuthContext, SocketContext
│       ├── layouts/      # PublicLayout, PatientLayout, DoctorLayout, AdminLayout
│       ├── pages/        # Patient, Doctor, Admin, Public, Consultation pages
│       ├── routes/       # ProtectedRoute and RBAC AppRoutes
│       ├── services/     # Axios client with automatic 401 refresh interceptors
│       ├── types/        # TypeScript models mirroring Prisma schema
│       └── utils/        # Tailwind merge, currency, and date formatters
├── backend/              # Node.js + Express + Prisma PostgreSQL API
│   ├── prisma/
│   │   ├── schema.prisma # 32 normalized PostgreSQL relational models & enums
│   │   └── seed.ts       # Realistic seed data (Admin, 7 Doctors, 10 Patients, etc.)
│   └── src/
│       ├── config/       # Environment, PostgreSQL connection pool & Prisma
│       ├── controllers/  # Request validation and API controllers
│       ├── integrations/ # Configurable AI, Voice STT/TTS, Razorpay, Nodemailer
│       ├── middleware/   # JWT auth, role guard, verified doctor guard, audit logger
│       ├── routes/       # Versioned REST endpoints (/api/v1/)
│       ├── services/     # Core business logic & database transactions
│       ├── sockets/      # Socket.IO online consultation namespace
│       └── utils/        # Clinical emergency classifier & cryptographic security
├── docker-compose.yml    # One-click PostgreSQL 16 Alpine container
├── .env.example          # Environment template
└── README.md
```

---

## 3. Demo Credentials (For Local Development Only)

All demo accounts share the password: `Password123!`

| Portal | Role | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Portal** | `ADMIN` | `admin@praansewa.health` | `Password123!` | System Superadmin (Full platform control & verification) |
| **Doctor Portal** | `DOCTOR` | `dr.sharma@praansewa.health` | `Password123!` | Senior Cardiologist (Approved & Verified) |
| **Doctor Portal** | `DOCTOR` | `dr.patel@praansewa.health` | `Password123!` | Dermatologist (Approved & Verified) |
| **Doctor Portal** | `DOCTOR` | `dr.mehra@praansewa.health` | `Password123!` | ENT Surgeon (**PENDING Verification** - for testing admin approval) |
| **Patient Portal** | `PATIENT` | `aarav.kumar@example.com` | `Password123!` | Patient (Allergy: Penicillin, History: Hypertension) |
| **Patient Portal** | `PATIENT` | `sneha.nair@example.com` | `Password123!` | Patient (Allergy: Amoxicillin, History: Asthma) |

> **Pro-Tip:** The login page features **1-Click Demo Login buttons** for instant evaluation without typing!

---

## 4. Key Functional Modules

### A. Patient Portal
- **Dashboard:** Health overview, upcoming consultations, active prescriptions, and recent lab reports.
- **Doctor Discovery:** Filter doctors by specialty, ratings, availability, and consultation fees.
- **Appointment Booking:** Select date, available 30-minute time slots, consultation type (Video / In-Person), and reason for visit.
- **Medical Records:** Upload and view lab reports, scans, and discharge summaries.
- **Digital Prescriptions:** View and print doctor-authorized prescriptions with digital verification stamps.
- **AI Health Assistant:** Context-aware chat with non-diagnostic disclaimers and emergency symptom triage.
- **AI Voice Assistant:** Interactive microphone interface, speech-to-text, and spoken audio responses with graceful browser speech fallback.
- **Home Remedies:** Clinically verified household recipes across 8 categories with age and pregnancy precautions.

### B. Doctor Portal
- **Dashboard:** Today's appointments, assigned patient count, completed consultations, and earnings.
- **Appointment Management:** Accept, reject with reason, reschedule, and mark consultations as completed.
- **Availability Scheduler:** Configure working days (Mon-Sun), start/end hours, and slot duration to prevent double-bookings.
- **Patient History:** Authorized access to patient allergies, chronic conditions, and past prescriptions.
- **AI Prescription Assistant:** Generate draft clinical summaries, detect drug-drug interactions and allergies, edit medication items, and sign prescriptions.

### C. Admin Portal (`/pran_admin`)
- **Dedicated Access URL:** Direct navigation via `http://localhost:5173/pran_admin` featuring:
  - **Superadmin Registration Form:** Create high-privilege administrator accounts directly on `/pran_admin` with governance passcode (`PRAN_ADMIN_2026`).
  - **Direct Admin Sign-In:** Authenticate with existing admin credentials (`admin@praansewa.health` / `Password123!`).
  - **1-Click Demo Admin Button:** Instant autofill for rapid evaluation.
- **Dashboard Analytics:** Live platform statistics, specialty distributions (Recharts), and immutable PostgreSQL audit trail.
- **Doctor Credential Verification:** Review State Medical Council registration certificates, inspect uploaded qualifications, and approve or reject doctor applications.
- **Patient Directory:** Search all registered patients by name, email, or phone; inspect health records and toggle account suspension.
- **Specialty Management:** Create and update medical specialties.
- **Security Audit Logs:** Immutable logs tracking IP addresses, user agents, and clinical actions.

### D. Online Consultation Room
- Accessible via `/consultations/:id` for the assigned patient and doctor.
- Real-time chat powered by Socket.IO (`/consultations` namespace).
- In-call controls (mic/camera toggle) and doctor's clinical notes.

---

## 5. Quick Start & Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+) or Docker

### 1. Database Setup with Docker (Recommended)
```bash
# Start PostgreSQL 16 container (maps to port 5433 to avoid conflicts with native PostgreSQL)
docker compose up -d
```

*The default `backend/.env` is pre-configured for Docker on port 5433: `postgresql://praan:praansewa_secret@localhost:5433/praansewa_db?schema=public`.*
*Alternatively, if using native Windows PostgreSQL on port 5432, update `DATABASE_URL` in `backend/.env` with your local `postgres` superuser password.*

### 2. Backend Setup & Database Migration
```bash
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Push schema to PostgreSQL database
npm run prisma:push

# Seed demo data (Admin, Doctors, Patients, Remedies, Medications)
npm run prisma:seed

# Start backend development server (Runs on http://localhost:5000)
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start frontend development server (Runs on http://localhost:5173)
npm run dev
```

### 4. Running Both Concurrently from Root
```bash
# From the root directory:
npm run dev
```

---

## 6. Running Tests

```bash
# Run unit and integration tests with Vitest
cd backend
npm test
```

---

## 7. Configuration & Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://praan:praansewa_secret@localhost:5432/praansewa_db` |
| `JWT_SECRET` | Secret key for JWT access tokens | Configured in `.env` |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | Configured in `.env` |
| `AI_PROVIDER` | AI Provider (`mock` or `openai`) | `mock` (built-in clinical engine) |
| `OPENAI_API_KEY` | Optional OpenAI key for GPT-4o-mini & Whisper | Optional |
| `VOICE_STT_PROVIDER` | Speech-to-text provider (`browser` or `openai`) | `browser` |
| `VOICE_TTS_PROVIDER` | Text-to-speech provider (`browser` or `openai`) | `browser` |
| `RAZORPAY_KEY_ID` | Optional Razorpay key (Simulated if empty) | Optional |
| `CLOUDINARY_CLOUD_NAME`| Optional Cloudinary credentials | Optional (Local fallback) |
