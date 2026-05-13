import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_AI_GUIDE_TOPICS,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_RESTAURANT_SETTINGS,
} from "../../../../packages/shared/src";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getSingleTenantWorkspace() {
    let tenant = await this.prisma.tenant.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: "Casa Aurora",
          slug: "casa-aurora",
          pilotMode: false,
        },
      });
    }

    let restaurant = await this.prisma.restaurant.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
    });

    if (!restaurant) {
      restaurant = await this.prisma.restaurant.create({
        data: {
          tenantId: tenant.id,
          name: tenant.name || "Restaurante",
          style: "Cozinha contemporanea brasileira",
          description:
            "Restaurante com atendimento acolhedor. Configure a descricao completa na tela de Inteligencia Artificial.",
          timezone: "America/Sao_Paulo",
          businessHours: DEFAULT_BUSINESS_HOURS as unknown as Prisma.InputJsonValue,
          aiGuide: { topics: DEFAULT_AI_GUIDE_TOPICS } as unknown as Prisma.InputJsonValue,
          settings: DEFAULT_RESTAURANT_SETTINGS as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return { tenant, restaurant };
  }
}
