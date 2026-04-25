function getConfig() {
  return {
    apiKey:   process.env.BREVO_API_KEY,
    appUrl:   process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    sender: {
      email: process.env.BREVO_SENDER_EMAIL,
      name:  process.env.BREVO_SENDER_NAME  || "CodRoom",
    },
    replyTo: process.env.BREVO_REPLY_TO || process.env.BREVO_SENDER_EMAIL,
  };
}

async function sendEmail({ to, subject, html }) {
  const { apiKey, sender, replyTo } = getConfig();

  if (!apiKey) {
    console.warn("[email] BREVO_API_KEY not set — skipping send");
    return { skipped: true };
  }
  if (!sender.email) {
    console.error("[email] BREVO_SENDER_EMAIL is required when BREVO_API_KEY is set — skipping send");
    return { skipped: true };
  }

  const payload = {
    sender,
    to: [{ email: to }],
    replyTo: { email: replyTo || sender.email },
    subject,
    htmlContent: html,
  };

  console.log(`[email] Sending "${subject}" to ${to} from ${sender.email}`);

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();

  if (!res.ok) {
    console.error(`[email] Brevo error ${res.status}:`, responseText);
    throw new Error(`Brevo error ${res.status}: ${responseText}`);
  }

  console.log(`[email] Sent successfully. Brevo response:`, responseText);
  return JSON.parse(responseText);
}

export async function sendVerificationEmail(email, otp) {
  return sendEmail({
    to: email,
    subject: "Your CodRoom verification code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:linear-gradient(135deg,#7c3aed,#06b6d4);border-radius:12px;font-size:20px;font-weight:900;color:#fff">C</div>
          <h1 style="margin:16px 0 4px;font-size:22px;font-weight:800;color:#0f172a">Verify your email</h1>
          <p style="margin:0;color:#64748b;font-size:14px">Enter this code in CodRoom to verify your account</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <div style="display:inline-block;padding:20px 40px;background:#f8fafc;border:2px dashed #7c3aed;border-radius:16px">
            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#7c3aed;font-family:monospace">${otp}</span>
          </div>
        </div>
        <p style="color:#475569;font-size:13px;text-align:center;margin:0">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:12px">If you didn't create a CodRoom account, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email, otp) {
  return sendEmail({
    to: email,
    subject: "Your CodRoom password reset code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:linear-gradient(135deg,#7c3aed,#06b6d4);border-radius:12px;font-size:20px;font-weight:900;color:#fff">C</div>
          <h1 style="margin:16px 0 4px;font-size:22px;font-weight:800;color:#0f172a">Reset your password</h1>
          <p style="margin:0;color:#64748b;font-size:14px">Enter this code to set a new password</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <div style="display:inline-block;padding:20px 40px;background:#f8fafc;border:2px dashed #7c3aed;border-radius:16px">
            <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#7c3aed;font-family:monospace">${otp}</span>
          </div>
        </div>
        <p style="color:#475569;font-size:13px;text-align:center;margin:0">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:12px">If you didn't request a password reset, ignore this email.</p>
      </div>
    `,
  });
}

// ── Interview notification templates ─────────────────────────────────────────

const HEADER = `<div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:20px 24px;border-radius:8px 8px 0 0"><span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:-0.5px">CodRoom</span></div>`;
const FOOTER = `<div style="padding:16px 24px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6">CodRoom Technical Interview Platform</div>`;

export async function notifyReportReady({ interviewerEmail, candidateName, reportUrl }) {
  const name = candidateName || "your candidate";
  return sendEmail({
    to: interviewerEmail,
    subject: `Interview Report Ready — ${candidateName || "Candidate"}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto">
        ${HEADER}
        <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none">
          <p style="font-size:15px;color:#1f2937;margin:0 0 20px">The AI evaluation report for <strong>${name}</strong> is ready to review.</p>
          <a href="${reportUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">View Report</a>
          <p style="font-size:12px;color:#9ca3af;margin:20px 0 0">You can also download a PDF from the report page.</p>
        </div>
        ${FOOTER}
      </div>`,
  });
}

export async function notifyCandidateJoined({ interviewerEmail, candidateName, roomName, roomUrl }) {
  const name = candidateName || "A candidate";
  return sendEmail({
    to: interviewerEmail,
    subject: `${name} joined ${roomName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto">
        ${HEADER}
        <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none">
          <p style="font-size:15px;color:#1f2937;margin:0 0 20px"><strong>${name}</strong> has joined <strong>${roomName}</strong> and is waiting for you.</p>
          <a href="${roomUrl}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Join Room Now</a>
        </div>
        ${FOOTER}
      </div>`,
  });
}

export async function notifyReportShared({ recipientEmail, sharedByName, candidateName, shareUrl, expiresAt }) {
  const name = candidateName || "a candidate";
  const expiry = expiresAt
    ? `This link expires on ${new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
    : "";
  return sendEmail({
    to: recipientEmail,
    subject: `Interview Report Shared — ${candidateName || "Candidate"}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto">
        ${HEADER}
        <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none">
          <p style="font-size:15px;color:#1f2937;margin:0 0 20px"><strong>${sharedByName}</strong> shared an interview report for <strong>${name}</strong> with you.</p>
          <a href="${shareUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">View Report</a>
          ${expiry ? `<p style="font-size:12px;color:#9ca3af;margin:20px 0 0">${expiry}</p>` : ""}
        </div>
        ${FOOTER}
      </div>`,
  });
}
