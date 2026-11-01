export type UserRole = "ADMIN" | "STAFF" | "AGENT";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface SessionTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  iat?: number;
  exp?: number;
}
