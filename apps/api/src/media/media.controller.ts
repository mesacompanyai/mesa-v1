import { Controller, Get, Param } from "@nestjs/common";
import { MediaService } from "./media.service";

@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get(":id/signed-url")
  async getSignedUrl(@Param("id") id: string) {
    return this.media.createSignedReadUrl(id);
  }
}
