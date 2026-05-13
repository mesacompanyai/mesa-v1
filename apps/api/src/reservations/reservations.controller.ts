import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ReservationsService } from "./reservations.service";

@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  listReservations() {
    return this.reservations.listReservations();
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() body: unknown) {
    return this.reservations.updateStatus(id, body);
  }
}
