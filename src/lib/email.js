function getConfig() {
  return {
    apiKey:   process.env.BREVO_API_KEY,
    appUrl:   process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    sender: {
      email: process.env.BREVO_SENDER_EMAIL || "mehtasangam77@gmail.com",
      name:  process.env.BREVO_SENDER_NAME  || "CodRoom",
    },
    replyTo: process.env.BREVO_REPLY_TO || process.env.BREVO_SENDER_EMAIL || "mehtasangam77@gmail.com",
  };
}

async function sendEmail({ to, subject, html }) {
  const { apiKey, sender, replyTo } = getConfig();

  if (!apiKey) {
    console.warn("[email] BREVO_API_KEY not set — skipping send");
    return { skipped: true };
  }
  if (!sender.email) {
    console.warn("[email] BREVO_SENDER_EMAIL not set — skipping send");
    return { skipped: true };
  }

  const payload = {
    sender,
    to: [{ email: to }],
    replyTo: { email: replyTo },
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
