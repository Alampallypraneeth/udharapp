# 💻 Digital Udhaar Khata - Frontend React Client

This directory contains the React 19 Single Page Application (SPA), styled with the modern Tailwind CSS v4 framework and customized with an editorial, monochromatic light/dark design system.

---

## 🎨 Design System & Styling Aesthetics

We built a **luxury, monochromatic design system** that adapts beautifully to different store owner environments:
- 🔳 **Premium Slate Light Mode**: Clean cool-slate backgrounds (`slate-50`) paired with elegant borders (`slate-200`) and high-contrast charcoal text (`slate-900`).
- 🔲 **Luxury Obsidian Dark Mode**: High-end carbon slate backdrops (`#090A0C`) layered with deep charcoal cards (`#121316`) and subtle slate-gray details (`slate-50`).
- ✨ **Enhanced Micro-Interactions**: Fluid CSS animations, thin custom scrollbars, and sleek brand focus rings (`rgba(243, 92, 62, 0.12)`) on form inputs for a premium feel.

---

## 📂 Key Pages & Features Included

- 📊 **Merchant Dashboard**: Displays high-level analytics, outstanding due tallies, total cash counts, and a vertical bar graph comparing credit gave (Udhaar) vs payment got (Jama) cashflow over the last 7 calendar days.
- 👥 **Customer Management**: Detailed directory of customers showing their credit health scores, custom risk warnings, contact details, and next payment dates.
- 📓 **Interactive Ledger (Customer Details)**: Rich tables listing transactions chronologically with filter states. Includes forms to quickly post debit/credit, and print/download official store statement PDFs.
- 💬 **WhatsApp Click-to-Chat Reminders**: Dynamically creates a customized pre-filled message including store details, exact outstanding figures, and checkout URLs, opening a new tab directly in your WhatsApp client.
- ⚙️ **Merchant Configuration & Simulator**: Complete configuration page (Settings, Currency, Hindi/English translations toggles) containing an elegant biometric fingerprint authenticator simulation modal.
- 🔒 **Pattern Lock Screen Simulator**: Secure login block demanding passcode pattern credentials to protect privacy when merchants leave their phone screen active.
- 💳 **Online Payment Checkout Portal**: A standalone customer-facing settlement screen mapping outstanding totals, invoice breakdowns, and payment confirmation updates.

---

## 🛠️ Stack & Dependencies Used

- **Framework**: [React 19](https://react.dev/)
- **Bundler/Dev Tools**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management & Contexts**:
  - `AuthContext`: Manages merchant sessions and tokens.
  - `ThemeContext`: Handles monochromatic dark/light modes.
  - `LanguageContext`: Translates labels instantly between English and Hindi.
- **Routing**: `react-router-dom` (Version 7)
- **API Engine**: `axios` (configured with authorization token automatic interceptors)
- **WebSockets**: `socket.io-client` (instant live sync receiver)
- **Vector Icons**: `react-icons`

---

## 📂 Production Environment Variables

To bind this frontend client to your deployed backend, Vercel supports the following build-time variable:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_BACKEND_URL` | `https://digital-udhaar-backend.onrender.com` | **Your hosted Render API address**. This allows the Axios client and Socket connections to link directly to your server in production. |

*(If `VITE_BACKEND_URL` is omitted, the application falls back automatically to standard relative API rewrites `/api` configured inside `vercel.json`)*.

---

## 💻 Local Development Controls

To run the frontend client locally on your computer:

```bash
# Install packages
npm install

# Run Vite dev server (binds on http://localhost:5173 with local proxying to backend)
npm run dev

# Compile static assets bundle (compiles output to /dist for production deployment)
npm run build

# Preview production build assets locally
npm run preview
```
