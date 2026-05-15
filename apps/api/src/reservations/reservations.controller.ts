import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReservationsService } from "./reservations.service";

@UseGuards(JwtAuthGuard)
@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  listReservations(@CurrentUser() user: AuthenticatedUser) {
    return this.reservations.listReservations(user);
  }

  @Patch(":id/status")
  updateStatus(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: unknown) {
    return this.reservations.updateStatus(user, id, body);
  }
}
