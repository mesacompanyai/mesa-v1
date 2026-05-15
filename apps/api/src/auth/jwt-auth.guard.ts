import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import { AuthenticatedUser } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
      if (!payload.sub || !payload.tenantId || !payload.email || !Object.values(UserRole).includes(payload.role)) {
        throw new UnauthorizedException("Invalid token payload");
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private extractBearerToken(authorization: string | string[] | undefined): string | undefined {
    const value = Array.isArray(authorization) ? authorization[0] : authorization;
    const [type, token] = value?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
