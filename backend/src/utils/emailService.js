/**
 * ScopePilot Email Dispatch Service
 *
 * Dispatches real transactional emails (workspace invitations, scope alerts)
 * Supports:
 * - Gmail SMTP via Google App Passwords (free & instant)
 * - Custom SMTP servers (SendGrid, Mailgun, Amazon SES, Brevo)
 * - Development fallback via Ethereal Email with preview URLs
 */

const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Initialize or retrieve the active email transporter
 */
async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // 1. Check for explicit Gmail or Custom SMTP credentials in environment
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (user && pass) {
    const isGmail = (process.env.EMAIL_SERVICE || '').toLowerCase() === 'gmail' || user.includes('@gmail.com');
    if (isGmail) {
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      cachedTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user, pass },
      });
    }
    return cachedTransporter;
  }

  // 2. In test environments or when unconfigured, create an Ethereal test transporter
  if (process.env.NODE_ENV === 'test') {
    cachedTransporter = {
      sendMail: async (mailOptions) => ({
        messageId: `test-${Date.now()}`,
        response: '250 Test mock sent',
        mailOptions,
      }),
    };
    return cachedTransporter;
  }

  // 3. Fallback: Create dynamic Ethereal test account for instant local previews
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[EmailService] Created temporary Ethereal test mail transporter:', testAccount.user);
    return cachedTransporter;
  } catch (err) {
    console.warn('[EmailService] Unable to create Ethereal test transporter:', err.message);
    // Return a dry-run logger transporter
    cachedTransporter = {
      sendMail: async (mailOptions) => {
        console.log(`[EmailService - Dry Run] Would send email to: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
        return { messageId: 'dry-run-id' };
      },
    };
    return cachedTransporter;
  }
}

/**
 * Send an invitation email for a workspace
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.workspaceName - Name of the workspace
 * @param {string} options.workspaceId - ID of the workspace
 * @param {string} options.inviterName - Name of the user who sent the invite
 * @param {string} options.inviterEmail - Email of the inviter
 * @param {string} options.role - Assigned role ('client', 'member', 'admin')
 * @param {string} options.joinUrl - Direct join / accept URL
 */
async function sendWorkspaceInvitationEmail({
  to,
  workspaceName,
  workspaceId,
  inviterName = 'A teammate',
  inviterEmail = '',
  role = 'client',
  joinUrl,
}) {
  const transporter = await getTransporter();

  const senderUser = process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@scopepilot.dev';
  const fromName = process.env.EMAIL_FROM_NAME || 'ScopePilot';
  const fromAddress = `"${fromName}" <${senderUser}>`;

  const roleTitle = role === 'client' ? 'Client Reviewer & Scope Approver' : 'Collaborator / Freelancer';
  const roleDescription =
    role === 'client'
      ? 'As a client, you will be able to review contractual proposals, approve or reject project scope, track deliverables, and authorize change requests.'
      : 'As a team member, you will be able to collaborate on project scope, formulate proposals, submit deliverable evidence, and run AI scope analysis.';

  const subject = `You've been invited to join "${workspaceName}" on ScopePilot`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0c12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }
    .wrapper {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    .card {
      background-color: #14141e;
      border: 1px solid #2d2d42;
      border-radius: 8px;
      padding: 32px 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .brand {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #a855f7;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    .desc {
      font-size: 0.95rem;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }
    .role-box {
      background-color: #1a1a28;
      border-left: 3px solid #a855f7;
      padding: 14px 16px;
      border-radius: 4px;
      margin-bottom: 28px;
    }
    .role-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #c084fc;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .role-text {
      font-size: 0.88rem;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.5;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background-color: #7e22ce;
      background-image: linear-gradient(135deg, #9333ea, #6b21a8);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      padding: 14px 28px;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }
    .fallback-url {
      font-size: 0.8rem;
      color: #64748b;
      word-break: break-all;
      margin-top: 20px;
      line-height: 1.4;
    }
    .footer {
      text-align: center;
      font-size: 0.78rem;
      color: #475569;
      margin-top: 28px;
      border-top: 1px solid #1e1e2d;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand">SCOPEPILOT ◊</div>
      <h1 class="title">Workspace Invitation</h1>
      <p class="desc">
        Hello,<br><br>
        <strong>${inviterName}</strong> ${inviterEmail ? `(${inviterEmail})` : ''} has invited you to collaborate in the workspace <strong>"${workspaceName}"</strong> on ScopePilot.
      </p>

      <div class="role-box">
        <div class="role-label">ASSIGNED ROLE: ${role.toUpperCase()}</div>
        <p class="role-text">${roleDescription}</p>
      </div>

      <div class="btn-container">
        <a href="${joinUrl}" class="btn" target="_blank">Accept Invitation & Join Workspace ◊</a>
      </div>

      <p class="fallback-url">
        If the button above does not open, copy and paste this link into your browser:<br>
        <a href="${joinUrl}" style="color: #a855f7;">${joinUrl}</a>
      </p>

      <div class="footer">
        ScopePilot // Anti-Scope-Creep Governance & AI-Grounded Delivery Platform<br>
        This invitation was dispatched directly to ${to}.
      </div>
    </div>
  </div>
</body>
</html>
`;

  const textContent = `
ScopePilot ◊ Workspace Invitation

Hello,

${inviterName} ${inviterEmail ? `(${inviterEmail})` : ''} has invited you to collaborate in the workspace "${workspaceName}" on ScopePilot as a ${role.toUpperCase()} (${roleTitle}).

Accept the invitation and join the workspace here:
${joinUrl}

---
ScopePilot // Anti-Scope-Creep Governance & AI-Grounded Delivery Platform
`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[EmailService] Invitation email successfully dispatched to ${to} (Message ID: ${info.messageId})`);

    // If using Ethereal, log preview URL
    if (nodemailer.getTestMessageUrl && info) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailService] Ethereal Email Preview URL: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    throw err;
  }
}

module.exports = {
  sendWorkspaceInvitationEmail,
  getTransporter,
};
