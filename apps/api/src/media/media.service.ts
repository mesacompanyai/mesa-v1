import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createSignedReadUrl(tenantId: string, mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, tenantId },
      select: {
        id: true,
        storageKey: true,
        mimeType: true,
        mediaType: true,
      },
    });

    if (!asset) {
      throw new NotFoundException("Media asset not found");
    }

    return {
      id: asset.id,
      mediaType: asset.mediaType,
      mimeType: asset.mimeType,
      url: await this.storage.getSignedReadUrl(asset.storageKey),
      expiresInSeconds: 900,
    };
  }
}
