import "@/lib/validateEnv";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SESSION_COOKIE_OPTIONS, clearCookie } from "@/lib/secureCookies";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "codroom-token";

// Hash a password before storing in database
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Compare entered password with stored hash
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Create a JWT token with user data
export async function createToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

// Verify a JWT token and return the data inside
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

// Set the auth cookie after login/register
export async function setAuthCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

// Remove the auth cookie on logout
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0)
  });
}

// Get current logged in user from cookie (JWT-only validation)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return payload;
}

// Get current user with DB validation (use for sensitive operations)
export async function getCurrentUserWithDbCheck() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Verify user still exists in DB — guards against stale JWTs after DB resets
  try {
    const { default: prisma } = await import("@/lib/db");
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });
    if (!user) {
      cookieStore.set(COOKIE_NAME, '', {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 0,
        expires: new Date(0)
      });
      return null;
    }
  } catch {
    // DB unavailable — fall through and let the route handler deal with it
  }

  return payload;
}