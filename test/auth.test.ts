import { ConflictException, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../apps/api/src/auth/auth.service";
import { JwtAuthGuard } from "../apps/api/src/auth/jwt-auth.guard";
import { hashPassword, verifyPassword } from "../apps/api/src/auth/password";
import { ConfigurationService } from "../apps/api/src/configuration/configuration.service";

describe("password hashing", () => {
  it("hashes passwords with a per-password salt and verifies with constant-length derived keys", async () => {
    const firstHash = await hashPassword("senha-segura");
    const secondHash = await hashPassword("senha-segura");

    expect(firstHash).toMatch(/^scrypt\$/);
    expect(secondHash).toMatch(/^scrypt\$/);
    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).not.toContain("senha-segura");
    await expect(verifyPassword("senha-segura", firstHash)).resolves.toBe(true);
    await expect(verifyPassword("senha-errada", firstHash)).resolves.toBe(false);
    await expect(verifyPassword("senha-segura", null)).resolves.toBe(false);
  });
});

describe("AuthService", () => {
  it("registers a restaurant workspace, owner user and token payload", async () => {
    const tx = createTransactionMock();
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback: (tx: ReturnType<typeof createTransactionMock>) => unknown) => callback(tx)),
    };
    const jwt = { signAsync: vi.fn().mockResolvedValue("signed-token") };
    const service = new AuthService(prisma as never, jwt as never);

    const response = await service.register({
      restaurantName: "Casa Nova",
      name: "Maria Bento",
      email: " DONA@Example.COM ",
      password: "senha-segura",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "dona@example.com" },
      select: { id: true },
    });
    expect(tx.tenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Casa Nova",
        pilotMode: false,
      }),
    });
    expect(tx.tenant.create.mock.calls[0][0].data.slug).toMatch(/^casa-nova-[a-f0-9]{6}$/);
    expect(tx.restaurant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        name: "Casa Nova",
        timezone: "America/Sao_Paulo",
      }),
    });
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-1",
        email: "dona@example.com",
        name: "Maria Bento",
        role: UserRole.owner,
      }),
    });
    await expect(verifyPassword("senha-segura", String(tx.user.create.mock.calls[0][0].data.passwordHash))).resolves.toBe(
      true,
    );
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: "user-1",
      tenantId: "tenant-1",
      role: UserRole.owner,
      email: "dona@example.com",
    });
    expect(response).toEqual({
      accessToken: "signed-token",
      user: {
        id: "user-1",
        email: "dona@example.com",
        name: "Maria Bento",
        role: UserRole.owner,
        tenantId: "tenant-1",
        tenantName: "Casa Nova",
        restaurantId: "restaurant-1",
        restaurantName: "Casa Nova",
      },
    });
  });

  it("rejects duplicate registration emails", async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: "existing-user" }) },
      $transaction: vi.fn(),
    };
    const service = new AuthService(prisma as never, { signAsync: vi.fn() } as never);

    await expect(
      service.register({
        restaurantName: "Casa Nova",
        email: "dona@example.com",
        password: "senha-segura",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("logs in with normalized email and rejects invalid passwords", async () => {
    const passwordHash = await hashPassword("senha-correta");
    const user = createUser({ passwordHash });
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
    };
    const jwt = { signAsync: vi.fn().mockResolvedValue("signed-token") };
    const service = new AuthService(prisma as never, jwt as never);

    await expect(
      service.login({ email: " DONA@Example.COM ", password: "senha-correta" }),
    ).resolves.toMatchObject({
      accessToken: "signed-token",
      user: {
        id: "user-1",
        email: "dona@example.com",
        restaurantId: "restaurant-1",
      },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "dona@example.com" },
      include: expect.any(Object),
    });

    prisma.user.findUnique.mockResolvedValue(createUser({ passwordHash }));
    await expect(service.login({ email: "dona@example.com", password: "senha-errada" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe("JwtAuthGuard", () => {
  it("rejects missing bearer tokens", async () => {
    const guard = new JwtAuthGuard({ verifyAsync: vi.fn() } as never);

    await expect(guard.canActivate(createExecutionContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("attaches verified user context to the request", async () => {
    const payload = {
      sub: "user-1",
      tenantId: "tenant-1",
      role: UserRole.owner,
      email: "dona@example.com",
    };
    const jwt = { verifyAsync: vi.fn().mockResolvedValue(payload) };
    const request = { headers: { authorization: "Bearer signed-token" } };
    const guard = new JwtAuthGuard(jwt as never);

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith("signed-token");
    expect(request).toMatchObject({ user: payload });
  });
});

describe("authenticated dashboard services", () => {
  it("loads configuration through the authenticated tenant context", async () => {
    const tenant = {
      id: "tenant-2",
      name: "Casa Escopo",
      slug: "casa-escopo",
      retentionDays: 30,
      pilotMode: false,
    };
    const restaurant = {
      id: "restaurant-2",
      tenantId: "tenant-2",
      name: "Casa Escopo",
      style: null,
      description: null,
      timezone: "America/Sao_Paulo",
      businessHours: null,
      aiGuide: null,
      settings: null,
    };
    const prisma = {
      diningTable: { findMany: vi.fn().mockResolvedValue([]) },
      teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const tenantContext = {
      getWorkspaceForTenant: vi.fn().mockResolvedValue({ tenant, restaurant }),
    };
    const service = new ConfigurationService(prisma as never, tenantContext as never);

    await expect(
      service.getConfiguration({
        sub: "user-2",
        tenantId: "tenant-2",
        role: UserRole.owner,
        email: "owner@example.com",
      }),
    ).resolves.toMatchObject({
      tenant: { id: "tenant-2" },
      restaurant: { id: "restaurant-2" },
    });
    expect(tenantContext.getWorkspaceForTenant).toHaveBeenCalledWith("tenant-2");
    expect(prisma.diningTable.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-2", restaurantId: "restaurant-2" },
      }),
    );
    expect(prisma.teamMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-2", restaurantId: "restaurant-2" },
      }),
    );
  });
});

function createTransactionMock() {
  const tenant = {
    id: "tenant-1",
    name: "Casa Nova",
    slug: "casa-nova-abc123",
    retentionDays: 30,
    pilotMode: false,
    createdAt: new Date("2026-05-15T12:00:00.000Z"),
    updatedAt: new Date("2026-05-15T12:00:00.000Z"),
  };
  const restaurant = {
    id: "restaurant-1",
    tenantId: "tenant-1",
    name: "Casa Nova",
    style: "Cozinha contemporanea brasileira",
    description: "",
    timezone: "America/Sao_Paulo",
    businessHours: null,
    aiGuide: null,
    settings: null,
    createdAt: new Date("2026-05-15T12:00:00.000Z"),
    updatedAt: new Date("2026-05-15T12:00:00.000Z"),
  };
  const user = {
    id: "user-1",
    tenantId: "tenant-1",
    externalId: null,
    email: "dona@example.com",
    passwordHash: "scrypt$placeholder",
    name: "Maria Bento",
    role: UserRole.owner,
    createdAt: new Date("2026-05-15T12:00:00.000Z"),
    updatedAt: new Date("2026-05-15T12:00:00.000Z"),
  };

  return {
    tenant: { create: vi.fn().mockResolvedValue(tenant) },
    restaurant: { create: vi.fn().mockResolvedValue(restaurant) },
    user: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...user,
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
      })),
    },
  };
}

function createUser({ passwordHash }: { passwordHash: string | null }) {
  return {
    id: "user-1",
    tenantId: "tenant-1",
    externalId: null,
    email: "dona@example.com",
    passwordHash,
    name: "Maria Bento",
    role: UserRole.owner,
    createdAt: new Date("2026-05-15T12:00:00.000Z"),
    updatedAt: new Date("2026-05-15T12:00:00.000Z"),
    tenant: {
      id: "tenant-1",
      name: "Casa Nova",
      slug: "casa-nova-abc123",
      retentionDays: 30,
      pilotMode: false,
      createdAt: new Date("2026-05-15T12:00:00.000Z"),
      updatedAt: new Date("2026-05-15T12:00:00.000Z"),
      restaurants: [
        {
          id: "restaurant-1",
          tenantId: "tenant-1",
          name: "Casa Nova",
          style: "Cozinha contemporanea brasileira",
          description: "",
          timezone: "America/Sao_Paulo",
          businessHours: null,
          aiGuide: null,
          settings: null,
          createdAt: new Date("2026-05-15T12:00:00.000Z"),
          updatedAt: new Date("2026-05-15T12:00:00.000Z"),
        },
      ],
    },
  };
}

function createExecutionContext(request = { headers: {} }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
