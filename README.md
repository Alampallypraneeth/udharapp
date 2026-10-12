# 🌿 VyaparFlow (Next-Gen Business Ledger & Smart Credit Flow)

A premium, state-of-the-art fintech business ledger and credit flow management application designed for modern merchants, kiranas, and business owners. Built with an Emerald & Obsidian Slate design system, real-time sync, Web Audio digital soundbox synthesizer, instant CSV ledger exports, global spotlight search (`⌘K`), and automated payment settlement workflows.

---

## 🏗️ Monorepo Directory Architecture

The project is cleanly decoupled into two dedicated sub-folders:

```text
vyaparflow-app/
├── backend/            # Node.js Express server, MongoDB models, background jobs & services
├── frontend/           # React 19 SPA, Tailwind CSS v4, custom utility hooks & state
├── .gitignore          # Root-level secure file ignore definitions
└── README.md           # Primary setup and architectural summary
```

---

## 🌟 Key Application Features

- 🌿 **Emerald Fintech UI & Design System**: High-contrast, executive Emerald (`#059669` / `#10B981`) & Obsidian Slate theme with fluid glassmorphism and micro-interactions.
- ⚡ **Spotlight Quick Search (`⌘K` / `Ctrl+K`)**: Instant keyboard-driven global customer search and quick ledger jumping.
- 🔊 **Digital Soundbox Synthesizer**: Native Web Audio API soundbox with realistic payment chime confirmation on credit settlements (zero external audio files).
- 📊 **Instant CSV & Excel Ledger Export**: One-click downloadable spreadsheets for customer accounts and overall store khata balances.
- 🏷️ **Smart Urgency & Due Badges**: Real-time visual status tags (*Overdue*, *Due Today*, *Settled*, *VIP Customer*) for proactive credit recovery.
- 🧮 **Quick Calculator Chips**: One-tap amount increment buttons (`+₹100`, `+₹500`, `+₹1000`, `+₹2000`, `+₹5000`, `Full Balance`) in transaction dialogs.
- 📈 **Interactive Cashflow Analytics**: Dynamic cashflow charts illustrating Credit Given vs. Payments Received.
- 💬 **WhatsApp & SMS Reminders**: Automated and direct Click-to-Chat customer balance alerts with payment checkout links.
- 🔒 **Biometric / Lockscreen Simulator**: Secure lockscreen authentication with passcode and biometric simulation.
- 🌐 **Multi-Language Capabilities**: Native switching between English and Hindi.
- 🔄 **Real-Time Sync**: Live updates powered by WebSocket connections.

---

## 🛠️ Technology Stack Overview

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Real-Time Sync**: [Socket.io Client](https://socket.io/)
- **API Communications**: [Axios](https://axios-http.com/) with global auth header interceptors

### Backend
- **Platform**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose ODM](https://mongoosejs.com/)
- **Real-Time Sockets**: [Socket.io Server](https://socket.io/)
- **Background Schedulers**: Node Cron auto-reminder automation
- **Third-Party Services**: Twilio (SMS), Fast2SMS (SMS), Nodemailer (Emails), PDFKit (PDF statement generator)

---

## 💻 Local Quickstart

### Step 1: Clone and Configure Database
Ensure you have MongoDB running locally (`mongodb://localhost:27017/udhaar-khata`) or configure a cloud connection.

### Step 2: Spin Up the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the server dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration and edit:
   ```bash
   cp .env.example .env
   ```
4. Start the Node development server:
   ```bash
   npm run dev
   ```
   *(Running locally on `http://localhost:4000`)*

### Step 3: Spin Up the Frontend
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install client-side packages:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```
   *(Running locally on `http://localhost:5173` with dynamic relative API routing proxy configured)*

---

## 🚀 Cloud Deployment Summary

- **Backend (Render)**: Set the root directory configuration on Render to `backend`. Add appropriate `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL` environment variables.
- **Frontend (Vercel)**: Set the root directory configuration on Vercel to `frontend`. Add the environment variable `VITE_BACKEND_URL` pointing to your deployed Render URL.

For detailed, step-by-step setup guides on deploying your cloud Mongo database, linking Render, and finalizing Vercel parameters, refer to the **[deployment_guide.md](file:///Users/alampallypraneeth/.gemini/antigravity-ide/brain/e5112187-4af2-4495-b8b4-2998ba8b418a/deployment_guide.md)** file inside your data workspace.
