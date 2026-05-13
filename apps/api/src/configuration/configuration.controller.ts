import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ConfigurationService } from "./configuration.service";

@Controller("configuration")
export class ConfigurationController {
  constructor(private readonly configuration: ConfigurationService) {}

  @Get()
  getConfiguration() {
    return this.configuration.getConfiguration();
  }

  @Patch("restaurant")
  updateRestaurant(@Body() body: unknown) {
    return this.configuration.updateRestaurant(body);
  }

  @Post("tables")
  createTable(@Body() body: unknown) {
    return this.configuration.createTable(body);
  }

  @Patch("tables/:id")
  updateTable(@Param("id") id: string, @Body() body: unknown) {
    return this.configuration.updateTable(id, body);
  }

  @Delete("tables/:id")
  deleteTable(@Param("id") id: string) {
    return this.configuration.deleteTable(id);
  }

  @Post("team")
  createTeamMember(@Body() body: unknown) {
    return this.configuration.createTeamMember(body);
  }

  @Patch("team/:id")
  updateTeamMember(@Param("id") id: string, @Body() body: unknown) {
    return this.configuration.updateTeamMember(id, body);
  }

  @Delete("team/:id")
  deleteTeamMember(@Param("id") id: string) {
    return this.configuration.deleteTeamMember(id);
  }
}
