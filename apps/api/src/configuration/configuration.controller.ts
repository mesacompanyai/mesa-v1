import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ConfigurationService } from "./configuration.service";

@UseGuards(JwtAuthGuard)
@Controller("configuration")
export class ConfigurationController {
  constructor(private readonly configuration: ConfigurationService) {}

  @Get()
  getConfiguration(@CurrentUser() user: AuthenticatedUser) {
    return this.configuration.getConfiguration(user);
  }

  @Patch("restaurant")
  updateRestaurant(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.configuration.updateRestaurant(user, body);
  }

  @Post("tables")
  createTable(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.configuration.createTable(user, body);
  }

  @Patch("tables/:id")
  updateTable(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: unknown) {
    return this.configuration.updateTable(user, id, body);
  }

  @Delete("tables/:id")
  deleteTable(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.configuration.deleteTable(user, id);
  }

  @Post("team")
  createTeamMember(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.configuration.createTeamMember(user, body);
  }

  @Patch("team/:id")
  updateTeamMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: unknown) {
    return this.configuration.updateTeamMember(user, id, body);
  }

  @Delete("team/:id")
  deleteTeamMember(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.configuration.deleteTeamMember(user, id);
  }
}
