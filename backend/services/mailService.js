const nodemailer = require('nodemailer');

/**
 * Send email using Nodemailer.
 * Falls back to logging to console if SMTP details are not configured.
 */
const sendEmail = async ({ to, subject, text, html, attachments }) => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('⚠️ SMTP settings are not fully configured in .env. Logging email details to console:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text}`);
    if (attachments) {
      console.log(`Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    }
    return {
      success: true,
      logged: true,
      message: 'Email logged to console (SMTP not configured)'
    };
  }

  // Create transporter with fast-fail timeouts (prevents 2-min hangs on blocked IPs)
  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
    connectionTimeout: 10000,  // 10s — fail fast if SMTP server unreachable
    greetingTimeout: 10000,    // 10s — fail fast if no greeting received
    socketTimeout: 15000,      // 15s — fail fast on socket inactivity
    tls: { rejectUnauthorized: false },
    family: 4                  // Force IPv4 to prevent ENETUNREACH on IPv6-unsupported networks (like Render)
  });

  const fromEmail = process.env.SMTP_FROM || user;

  // Send mail
  const info = await transporter.sendMail({
    from: `"${process.env.APP_NAME || 'Digital Udhaar'}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
    attachments,
  });

  console.log(`✉️ Email sent: ${info.messageId}`);
  return {
    success: true,
    messageId: info.messageId,
  };
};

module.exports = {
  sendEmail,
};
