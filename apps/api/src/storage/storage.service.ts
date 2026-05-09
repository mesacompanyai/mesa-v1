import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class StorageService {
  private readonly bucket?: string;
  private readonly client?: S3Client;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>("R2_BUCKET");
    const accountId = this.config.get<string>("R2_ACCOUNT_ID");
    const accessKeyId = this.config.get<string>("R2_ACCESS_KEY_ID");
    const secretAccessKey = this.config.get<string>("R2_SECRET_ACCESS_KEY");

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async putObject(input: {
    key: string;
    body: Buffer | Uint8Array;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<void> {
    const client = this.getClient();

    await client.send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );
  }

  async getSignedReadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const client = this.getClient();

    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  private getClient(): S3Client {
    if (!this.client) {
      throw new Error("Cloudflare R2 is not configured");
    }

    return this.client;
  }

  private getBucket(): string {
    if (!this.bucket) {
      throw new Error("R2_BUCKET is not configured");
    }

    return this.bucket;
  }
}
