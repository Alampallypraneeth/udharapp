# 📒 Digital Udhaar Khata (Store Credit Ledger)

A premium, state-of-the-art digital credit ledger application designed specifically for local kirana store owners and small merchants to track, manage, and settle store credit transactions. Built with a monochromatic, ultra-minimal slate design system supporting responsive layouts, automatic real-time sync, multi-language support, automated AI balance reminders, and smooth interactive analytics graphs.

---

## 🏗️ Monorepo Directory Architecture

The project is cleanly decoupled into two dedicated sub-folders to facilitate simple separate production deployments:

```text
digital-udhaar-app/
├── backend/            # Node.js Express server, MongoDB models, background jobs & services
├── frontend/           # React 19 SPA, Tailwind CSS v4, custom utility hooks & state
├── .gitignore          # Root-level secure file ignore definitions
└── README.md           # This primary setup and architectural summary
```

---

## 🌟 Key Application Features

- 🔳 **Premium Monochromatic UI**: A stunning, ultra-minimal slate aesthetic matching high-end digital ledger interfaces. Supports a sleek light mode (`slate-900`) and a luxury obsidian dark mode (`slate-50`).
- 📈 **Interactive Cashflow Analytics**: Dynamic weekly vertical bar graph on the merchant dashboard illustrating Credit Given (Udhaar) vs. Payments Got (Jama) comparisons over the last 7 calendar days.
- 💬 **Zero-Cost WhatsApp Reminders**: Direct Click-to-Chat customer intent linking (`api.whatsapp.com/send`) that pre-fills personalized credit tallies, payment checkout pages, and automatically logs reminders in the ledger logs.
- 🔒 **Biometric & Lockscreen Simulator**: Elegant mock authentication screen with an offline finger-print/passcode validator modal for merchants securing access to their accounts.
- 🌐 **Dual-Language Capabilities**: Complete system translation infrastructure toggling between English and Hindi text natively.
- 🔄 **Real-Time Synchronizations**: Automatic background synchronization of ledger updates across multiple devices simultaneously powered by active WebSockets.

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
