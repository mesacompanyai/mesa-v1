import { UserRole } from "@prisma/client";

export type AuthenticatedUser = {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
};

export type AuthUserResponse = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  restaurantId: string;
  restaurantName: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUserResponse;
};
