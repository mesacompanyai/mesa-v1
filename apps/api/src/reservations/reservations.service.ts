import { Injectable, NotFoundException } from "@nestjs/common";
import { ReservationStatus } from "@prisma/client";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { TenantContextService } from "../tenancy/tenant-context.service";

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async listReservations() {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const reservations = await this.prisma.reservation.findMany({
      where: { tenantId: tenant.id, restaurantId: restaurant.id },
      include: {
        customer: true,
        diningTable: true,
      },
      orderBy: [{ startsAt: "asc" }],
    });

    return reservations.map((reservation) => ({
      id: reservation.id,
      startsAt: reservation.startsAt,
      status: reservation.status,
      partySize: reservation.partySize,
      table: reservation.diningTable
        ? {
            id: reservation.diningTable.id,
            number: reservation.diningTable.number,
            label: reservation.diningTable.label,
            location: reservation.diningTable.location,
            seats: reservation.diningTable.seats,
          }
        : null,
      tableLabel: reservation.tableLabel,
      area: reservation.area,
      notes: reservation.notes,
      customer: reservation.customer
        ? {
            id: reservation.customer.id,
            name: reservation.customer.name,
            phoneE164: reservation.customer.phoneE164,
          }
        : null,
    }));
  }

  async updateStatus(id: string, input: unknown) {
    const { tenant, restaurant } = await this.tenantContext.getSingleTenantWorkspace();
    const body = UpdateStatusSchema.parse(input);
    const reservation = await this.prisma.reservation.findFirst({
      where: { id, tenantId: tenant.id, restaurantId: restaurant.id },
      select: { id: true },
    });

    if (!reservation) throw new NotFoundException("Reservation not found");

    return this.prisma.reservation.update({
      where: { id },
      data: { status: body.status },
    });
  }
}

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus),
});
