import { randomBytes, randomInt } from "crypto";
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  findUserByVerifyToken,
  findUserByResetToken,
} from "@/repositories/user.repository";
import {
  hashPassword,
  verifyPassword,
  createToken,
  setAuthCookie,
  removeAuthCookie,
} from "@/lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(email, password) {
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) return { error: "Invalid email or password", status: 401 };

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return { error: "Invalid email or password", status: 401 };

  if (!user.emailVerified) {
    return {
      error: "Please verify your email before signing in. Check your inbox for the verification link.",
      needsVerification: true,
      status: 403,
    };
  }

  const token = await createToken({ userId: user.id, email: user.email, name: user.name });
  await setAuthCookie(token);
  return { user: { id: user.id, name: user.name, email: user.email } };
}

export async function register({ name, email, password }) {
  if (!name?.trim() || !email?.trim() || !password) {
    return { error: "All fields are required", status: 400 };
  }
  if (name.trim().length < 2 || name.trim().length > 80) {
    return { error: "Name must be 2–80 characters", status: 400 };
  }
  if (!EMAIL_RE.test(email.trim())) {
    return { error: "Enter a valid email address", status: 400 };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Password must be 8–128 characters", status: 400 };
  }
  if (!/[A-Z]/.test(password)) {
    return { error: "Password must contain at least one uppercase letter", status: 400 };
  }
  if (!/[0-9]/.test(password)) {
    return { error: "Password must contain at least one number", status: 400 };
  }

  const existing = await findUserByEmail(email.trim().toLowerCase());
  if (existing) return { error: "Email already registered", status: 409 };

  const hashed = await hashPassword(password);
  const otp = String(randomInt(100000, 999999));
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  const emailConfigured = !!process.env.BREVO_API_KEY;

  const user = await createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashed,
    verifyOtp: emailConfigured ? otp : null,
    verifyOtpExpiry: emailConfigured ? otpExpiry : null,
    emailVerified: !emailConfigured,
  });

  if (emailConfigured) {
    sendVerificationEmail(user.email, otp).catch((err) =>
      console.error("[register] email error:", err.message)
    );
    return {
      message: "Account created. Enter the 6-digit code sent to your email.",
      needsVerification: true,
      email: user.email,
      status: 201,
    };
  }

  const token = await createToken({ userId: user.id, email: user.email, name: user.name });
  await setAuthCookie(token);
  return { user: { id: user.id, name: user.name, email: user.email }, status: 201 };
}

export async function logout() {
  await removeAuthCookie();
  return { message: "Logged out" };
}

export async function verifyEmail({ email, otp }) {
  const user = await findUserByEmail(email?.trim().toLowerCase());
  if (!user) return { error: "User not found", status: 404 };
  if (user.emailVerified) return { error: "Email already verified", status: 400 };
  if (!user.verifyOtp || user.verifyOtp !== otp) return { error: "Invalid code", status: 400 };
  if (user.verifyOtpExpiry && new Date() > new Date(user.verifyOtpExpiry)) {
    return { error: "Code expired. Request a new one.", status: 400 };
  }

  await updateUser(user.id, {
    emailVerified: true,
    verifyOtp: null,
    verifyOtpExpiry: null,
    verifyToken: null,
  });

  const token = await createToken({ userId: user.id, email: user.email, name: user.name });
  await setAuthCookie(token);
  return { message: "Email verified", user: { id: user.id, name: user.name, email: user.email } };
}

export async function forgotPassword(email) {
  const user = await findUserByEmail(email?.trim().toLowerCase());
  // Always return success to prevent email enumeration
  if (!user || !user.emailVerified) {
    return { message: "If that email exists, a reset code has been sent." };
  }

  const otp = String(randomInt(100000, 999999));
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await updateUser(user.id, { resetOtp: otp, resetOtpExpiry: expiry });
  sendPasswordResetEmail(user.email, otp).catch((err) =>
    console.error("[forgot-password] email error:", err.message)
  );
  return { message: "If that email exists, a reset code has been sent." };
}

export async function resetPassword({ email, otp, password }) {
  if (!email || !otp || !password) {
    return { error: "email, otp and password are required", status: 400 };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Password must be 8–128 characters", status: 400 };
  }
  if (!/[A-Z]/.test(password)) {
    return { error: "Password must contain at least one uppercase letter", status: 400 };
  }
  if (!/[0-9]/.test(password)) {
    return { error: "Password must contain at least one number", status: 400 };
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user || !user.resetOtp || user.resetOtp !== otp) {
    return { error: "Invalid or expired reset code", status: 400 };
  }
  if (user.resetOtpExpiry && new Date() > new Date(user.resetOtpExpiry)) {
    return { error: "Reset code expired. Request a new one.", status: 400 };
  }

  const hashed = await hashPassword(password);
  await updateUser(user.id, {
    password: hashed,
    resetOtp: null,
    resetOtpExpiry: null,
    resetToken: null,
    resetTokenExpiry: null,
  });
  return { message: "Password reset successfully" };
}
