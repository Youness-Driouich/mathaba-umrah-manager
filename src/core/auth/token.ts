import jwt from "jsonwebtoken";
import { SessionTokenPayload } from "./types";

const JWT_SECRET = process.env.AUTH_SECRET || "fallback-secret-for-dev-only-mathaba-umrah-2026";
const TOKEN_EXPIRY = "7d";

/**
 * Creates a signed JWT session token.
 */
export function createSessionToken(payload: Omit<SessionTokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Verifies a JWT session token and returns the payload.
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionTokenPayload;
  } catch {
    return null;
  }
}
