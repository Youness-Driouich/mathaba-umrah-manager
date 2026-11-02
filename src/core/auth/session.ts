import { cookies } from "next/headers";
import { verifySessionToken } from "./token";
import { AuthUser, SessionTokenPayload } from "./types";
import prisma from "@/lib/prisma";

export const AUTH_COOKIE_NAME = "mathaba_session";

/**
 * Retrieves the currently authenticated user from server components or API routes.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = verifySessionToken(token);
    if (!payload?.userId) {
      return null;
    }

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthUser["role"],
      isActive: user.isActive,
    };
  } catch (error) {
    console.error("Error retrieving current user:", error);
    return null;
  }
}

/**
 * Enforces Administrator authorization.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Please sign in to access this resource.");
  }
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: Administrator privileges required.");
  }
  return user;
}
