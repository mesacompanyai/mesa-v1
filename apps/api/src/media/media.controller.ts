import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MediaService } from "./media.service";

@UseGuards(JwtAuthGuard)
@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get(":id/signed-url")
  async getSignedUrl(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.media.createSignedReadUrl(user.tenantId, id);
  }
}
