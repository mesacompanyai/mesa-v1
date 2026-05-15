import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, Restaurant, Tenant, User, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { z } from "zod";
import {
  DEFAULT_AI_GUIDE_TOPICS,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_RESTAURANT_SETTINGS,
} from "../../../../packages/shared/src";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser, AuthResponse, AuthUserResponse } from "./auth.types";
import { hashPassword, verifyPassword } from "./password";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: unknown): Promise<AuthResponse> {
    const body = RegisterSchema.parse(input);
    const email = normalizeEmail(body.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await hashPassword(body.password);

    try {
      const workspace = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: body.restaurantName.trim(),
            slug: buildTenantSlug(body.restaurantName),
            pilotMode: false,
          },
        });
        const restaurant = await tx.restaurant.create({
          data: {
            tenantId: tenant.id,
            name: body.restaurantName.trim(),
            style: "Cozinha contemporanea brasileira",
            description:
              "Restaurante com atendimento acolhedor. Configure a descricao completa na tela de Inteligencia Artificial.",
            timezone: "America/Sao_Paulo",
            businessHours: DEFAULT_BUSINESS_HOURS as unknown as Prisma.InputJsonValue,
            aiGuide: { topics: DEFAULT_AI_GUIDE_TOPICS } as unknown as Prisma.InputJsonValue,
            settings: DEFAULT_RESTAURANT_SETTINGS as unknown as Prisma.InputJsonValue,
          },
        });
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email,
            passwordHash,
            name: normalizeOptionalName(body.name),
            role: UserRole.owner,
          },
        });

        return { tenant, restaurant, user };
      });

      return this.createAuthResponse(workspace.user, workspace.tenant, workspace.restaurant);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("Email already registered");
      }
      throw error;
    }
  }

  async login(input: unknown): Promise<AuthResponse> {
    const body = LoginSchema.parse(input);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(body.email) },
      include: {
        tenant: {
          include: {
            restaurants: {
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const restaurant = user.tenant.restaurants[0];
    if (!restaurant) {
      throw new UnauthorizedException("Workspace is not configured");
    }

    return this.createAuthResponse(user, user.tenant, restaurant);
  }

  async me(currentUser: AuthenticatedUser): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: currentUser.sub, tenantId: currentUser.tenantId },
      include: {
        tenant: {
          include: {
            restaurants: {
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    const restaurant = user?.tenant.restaurants[0];
    if (!user || !restaurant) {
      throw new UnauthorizedException("User session is no longer valid");
    }

    return this.toUserResponse(user, user.tenant, restaurant);
  }

  private async createAuthResponse(user: User, tenant: Tenant, restaurant: Restaurant): Promise<AuthResponse> {
    const payload: AuthenticatedUser = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: this.toUserResponse(user, tenant, restaurant),
    };
  }

  private toUserResponse(user: User, tenant: Tenant, restaurant: Restaurant): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant.name,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    };
  }
}

const RegisterSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const LoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeOptionalName(name: string | undefined): string | null {
  const normalized = name?.trim();
  return normalized ? normalized : null;
}

function buildTenantSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || "restaurante"}-${randomBytes(3).toString("hex")}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
