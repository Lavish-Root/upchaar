# AI Upchaar (PraanSewa) – Smart Healthcare. For Everyone.

AI Upchaar is an AI-powered healthcare access platform designed to address the critical gap in rural and underserved healthcare systems by delivering timely, reliable, and scalable medical assistance.

The platform enables patients to interact with an intelligent AI assistant through chat, voice, and web-based interfaces, allowing them to describe their symptoms in a natural way. The system performs a structured clinical assessment by asking relevant follow-up questions and analyzing responses using AI-driven models. Based on this evaluation, patient conditions are categorized into Normal, Mild, Moderate, or Critical, ensuring appropriate and timely intervention.

For non-critical cases, AI Upchaar provides evidence-based guidance, home-care recommendations, and optional medicine support, reducing unnecessary hospital visits. In more serious situations, the system ensures instant escalation to qualified doctors, maintaining a strict doctor-in-the-loop approach where all critical decisions are verified by medical professionals.

The platform is supported by comprehensive **Patient**, **Doctor**, and **Admin (`/pran_admin`)** portals:
- 🩺 **Doctor Portal**: Review credentials, verify clinical notes, issue digital prescriptions, and conduct WebRTC teleconsultations.
- 🏥 **Admin Gateway (`/pran_admin`)**: Manage approved/pending doctors with email contacts, review credentials, oversee patient audits, and track system health.
- 📍 **Nearby Healthcare Discovery**: 100% live OpenStreetMap facility locator for hospitals, pharmacies, pathology labs, and clinics.
- 💊 **Prescription & Home Remedies**: AI-assisted doctor prescription generation and verified Ayurvedic/home care remedies.
- 🎙️ **Multi-lingual Voice & Neural Audio**: Multilingual voice recognition and localized triage.

---

## 🚀 Quick Start & Development

### Prerequisites
- Node.js (v18+ or v20+)
- PostgreSQL (or local Docker container)

### 1. Install Dependencies
```bash
# Frontend
npm --prefix frontend install

# Backend
npm --prefix backend install
```

### 2. Configure Environment
Copy `.env.example` to `backend/.env` and `frontend/.env`:
```bash
cp .env.example backend/.env
```

### 3. Database Setup (Prisma)
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run Development Servers
```bash
# Starts both frontend (port 5173) and backend (port 5000)
npm run dev
```

### 5. Build for Production
```bash
npm run build
```
