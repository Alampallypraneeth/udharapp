# ⚙️ Digital Udhaar Khata - Backend Server

This directory contains the robust Express.js REST API server, database modeling via Mongoose, background cron jobs, and communication engine configurations that power the Digital Udhaar Khata application.

---

## 🚀 Key Responsibilities & Features

- 👤 **Merchant Security & Authentication**: Complete signup, signin, password recovery, and secure login verification endpoints powered by bcrypt password hashing and stateful JWT token validation.
- 👥 **Customer & Ledger Controllers**: Complete CRUD endpoints tracking store credit relationships, credit scores, transaction risk profiles, and automatic outstanding balance updates.
- 💳 **Double-Entry Ledgers**: Transaction logging storing exact credit gave (Udhaar) vs payment got (Jama) tallies, including specific metadata like dates, remarks, and receipt attachments.
- 🕒 **AI Automated Reminders Scheduler**: A background scheduler daemon (`node-cron`) that automatically compiles credit thresholds, checks risk scores, and queues reminders.
- 📑 **Statement PDF Exporter**: Dynamic, customizable PDF generation using `pdfkit` that compiles a clean statement breakdown for customer download and print-ready ledgers.
- 📬 **Omni-Channel Reminders Gateway**:
  - **Emails**: Rich HTML receipts and checkout link delivery using Nodemailer.
  - **WhatsApp**: Click-to-chat URL building and Meta Cloud API adapter support.
  - **SMS**: Adaptable fast-integration hooks utilizing Fast2SMS and Twilio platforms.
- 🔄 **Real-Time Synchronizations**: A persistent Socket.io server broadcasting ledger modifications instantly to the connected client layout without browser reloads.

---

## 🛠️ Stack & Dependencies Used

Our server is built using modern production-hardened Node.js packages:

| Dependency | Package | Purpose |
| :--- | :--- | :--- |
| **Server Engine** | `express` | Lightweight REST API router and middleware server. |
| **ODM / DB** | `mongoose` | Schema structures and object mapping for MongoDB. |
| **Sockets** | `socket.io` | Real-time bi-directional network communication. |
| **Auth & Security** | `bcryptjs` & `jsonwebtoken` | Safe password cryptography and secure JWT tokens. |
| **PDF Generation** | `pdfkit` | Compiles dynamic customer balance PDFs. |
| **SMS Services** | `fast2sms-pg` & `twilio` | Global text message delivery integrations. |
| **Emails** | `nodemailer` | Automated email triggers and store invoices. |
| **Payments** | `cashfree-pg` | Local payment processor checking checkout confirmations. |

---

## 🗄️ Database Schema Designs

The application runs a clean, relational MongoDB database schema utilizing 5 main collections:
1. `User`: Store owner records (Store Name, Email, Password Hash, Currency preference).
2. `Customer`: Customer files tracking contact details, outstanding balance, credit score, and risk status.
3. `Transaction`: Specific ledger items logging amount, type (`gave` / `got`), current date, remarks, and reference.
4. `CashbookEntry`: Merchant's daily cash register tracing general store income vs general store expenses.
5. `CustomerHistory`: Immutable log entries reflecting payment revisions or outstanding corrections.

---

## 📂 Environment Variables (`.env`)

Create a `.env` file in this directory with the following variables:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/udhaar-khata
JWT_SECRET=your_secret_key

# Frontend Linkage
FRONTEND_URL=http://localhost:5173

# Email Configurations (Nodemailer SMTP)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# SMS Gateway (Fast2SMS API Key)
FAST2SMS_API_KEY=your_fast2sms_api_key

# Twilio Configurations
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# WhatsApp API Credentials
WHATSAPP_TOKEN=your_meta_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# Offline/Simulation mode (Highly recommended for testing and cost-saving)
USE_MOCK_SMS=true
USE_MOCK_WHATSAPP=true
```

---

## 💻 Local Development Controls

Initialize the server in development mode:
```bash
# Install packages
npm install

# Run the server with nodemon auto-restart
npm run dev

# Run in simple start mode
npm start
```
*(Once booted, the server binds to `http://localhost:4000`)*
