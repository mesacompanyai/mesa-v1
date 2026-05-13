import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  parseRestaurantAiGuide,
  parseRestaurantSettings,
  RestaurantAiGuideSchema,
  RestaurantSettingsSchema,
} from "../../../../packages/shared/src";
import { PrismaService } from "../prisma/prisma.service";
import { TenantContextService } from "../tenancy/tenant-context.service";

@Injectable()
export class ConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getConfiguration() {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const [tables, team] = await Promise.all([
      this.prisma.diningTable.findMany({
        where: { tenantId: tenant.id, restaurantId: restaurant.id },
        orderBy: [{ number: "asc" }],
      }),
      this.prisma.teamMember.findMany({
        where: { tenantId: tenant.id, restaurantId: restaurant.id },
        orderBy: [{ name: "asc" }],
      }),
    ]);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        pilotMode: tenant.pilotMode,
        retentionDays: tenant.retentionDays,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        style: restaurant.style,
        description: restaurant.description,
        timezone: restaurant.timezone,
        businessHours: restaurant.businessHours,
        aiGuide: parseRestaurantAiGuide(restaurant.aiGuide),
        settings: parseRestaurantSettings(restaurant.settings),
      },
      tables: tables.map((table) => ({
        id: table.id,
        number: table.number,
        label: table.label,
        location: table.location,
        seats: table.seats,
        active: table.active,
      })),
      team: team.map((member) => ({
        id: member.id,
        name: member.name,
        phone: member.phoneE164,
        activeToday: member.activeToday,
        notificationSettings: member.notificationSettings,
      })),
    };
  }

  async updateRestaurant(input: unknown) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const body = UpdateRestaurantSchema.parse(input);
    const currentSettings = parseRestaurantSettings(restaurant.settings);
    const currentGuide = parseRestaurantAiGuide(restaurant.aiGuide);

    const settings = body.settings
      ? RestaurantSettingsSchema.parse({
          ...currentSettings,
          ...body.settings,
          characteristics: { ...currentSettings.characteristics, ...body.settings.characteristics },
          teamContactTriggers: { ...currentSettings.teamContactTriggers, ...body.settings.teamContactTriggers },
          menuSettings: { ...currentSettings.menuSettings, ...body.settings.menuSettings },
        })
      : currentSettings;
    const aiGuide = body.aiGuide
      ? RestaurantAiGuideSchema.parse({
          ...currentGuide,
          ...body.aiGuide,
        })
      : currentGuide;

    if (typeof body.pilotMode === "boolean" || typeof body.retentionDays === "number") {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          pilotMode: body.pilotMode,
          retentionDays: body.retentionDays,
        },
      });
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: body.name,
        style: body.style,
        description: body.description,
        timezone: body.timezone,
        businessHours: body.businessHours as Prisma.InputJsonValue | undefined,
        aiGuide: aiGuide as unknown as Prisma.InputJsonValue,
        settings: settings as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      style: updated.style,
      description: updated.description,
      timezone: updated.timezone,
      businessHours: updated.businessHours,
      aiGuide: parseRestaurantAiGuide(updated.aiGuide),
      settings: parseRestaurantSettings(updated.settings),
    };
  }

  async createTable(input: unknown) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const body = TableBodySchema.parse(input);
    return this.prisma.diningTable.create({
      data: {
        tenantId: tenant.id,
        restaurantId: restaurant.id,
        number: body.number,
        label: body.label,
        location: body.location,
        seats: body.seats,
        active: body.active,
      },
    });
  }

  async updateTable(id: string, input: unknown) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const body = TableBodySchema.partial().parse(input);
    await this.assertTable(id, tenant.id, restaurant.id);
    return this.prisma.diningTable.update({
      where: { id },
      data: body,
    });
  }

  async deleteTable(id: string) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    await this.assertTable(id, tenant.id, restaurant.id);
    await this.prisma.diningTable.delete({ where: { id } });
    return { deleted: true };
  }

  async createTeamMember(input: unknown) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const body = TeamBodySchema.parse(input);
    return this.prisma.teamMember.create({
      data: {
        tenantId: tenant.id,
        restaurantId: restaurant.id,
        name: body.name,
        phoneE164: body.phone,
        activeToday: body.activeToday,
        notificationSettings: body.notificationSettings as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateTeamMember(id: string, input: unknown) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const body = TeamBodySchema.partial().parse(input);
    await this.assertTeamMember(id, tenant.id, restaurant.id);
    return this.prisma.teamMember.update({
      where: { id },
      data: {
        name: body.name,
        phoneE164: body.phone,
        activeToday: body.activeToday,
        notificationSettings: body.notificationSettings as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteTeamMember(id: string) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    await this.assertTeamMember(id, tenant.id, restaurant.id);
    await this.prisma.teamMember.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertTable(id: string, tenantId: string, restaurantId: string) {
    const table = await this.prisma.diningTable.findFirst({
      where: { id, tenantId, restaurantId },
      select: { id: true },
    });
    if (!table) throw new NotFoundException("Table not found");
  }

  private async assertTeamMember(id: string, tenantId: string, restaurantId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id, tenantId, restaurantId },
      select: { id: true },
    });
    if (!member) throw new NotFoundException("Team member not found");
  }
}

const PartialRestaurantSettingsSchema = z.object({
  autonomy: z.enum(["baixa", "media", "alta"]).optional(),
  tone: z.string().optional(),
  characteristics: z
    .object({
      petFriendly: z.boolean().optional(),
      outdoor: z.boolean().optional(),
      highEnd: z.boolean().optional(),
      birthdays: z.boolean().optional(),
    })
    .optional(),
  teamContactTriggers: z
    .object({
      waitingCustomer: z.boolean().optional(),
      reservationScheduled: z.boolean().optional(),
      reservationArriving: z.boolean().optional(),
      reservationCancelled: z.boolean().optional(),
    })
    .optional(),
  menuSettings: z
    .object({
      canSendFiles: z.boolean().optional(),
      sendMode: z.enum(["on_request", "default"]).optional(),
    })
    .optional(),
  humanReviewTriggers: z.array(z.string()).optional(),
});

const UpdateRestaurantSchema = z.object({
  name: zStringOptional(),
  style: zStringNullableOptional(),
  description: zStringNullableOptional(),
  timezone: zStringOptional(),
  businessHours: z.unknown().optional(),
  aiGuide: RestaurantAiGuideSchema.partial().optional(),
  settings: PartialRestaurantSettingsSchema.optional(),
  pilotMode: z.boolean().optional(),
  retentionDays: z.number().int().positive().optional(),
});

const TableBodySchema = z.object({
  number: z.coerce.number().int().positive(),
  label: z.string().nullable().optional(),
  location: z.enum(["inside", "outside"]).default("inside"),
  seats: z.coerce.number().int().positive(),
  active: z.boolean().default(true),
});

const TeamBodySchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1).nullable().optional(),
  activeToday: z.boolean().default(true),
  notificationSettings: z.unknown().optional(),
});

function zStringOptional() {
  return z.string().trim().min(1).optional();
}

function zStringNullableOptional() {
  return z.string().trim().nullable().optional();
}
