import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type EvolutionRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  instanceApiKey?: string;
};

@Injectable()
export class EvolutionClientService {
  constructor(private readonly config: ConfigService) {}

  async createInstance(input: {
    instanceName: string;
    number?: string;
    webhookUrl: string;
    webhookSecret: string;
  }) {
    return this.request("/instance/create", {
      method: "POST",
      body: {
        instanceName: input.instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        number: input.number,
        rejectCall: true,
        msgCall: "No momento, atendemos chamadas apenas por mensagem.",
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
        webhook: {
          enabled: true,
          url: input.webhookUrl,
          headers: {
            Authorization: `Bearer ${input.webhookSecret}`,
          },
          byEvents: true,
          base64: false,
          events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
        },
      },
    });
  }

  async connect(instanceName: string, instanceApiKey: string) {
    return this.request(`/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: "GET",
      instanceApiKey,
    });
  }

  async sendText(input: {
    instanceName: string;
    instanceApiKey: string;
    remoteJid: string;
    text: string;
  }) {
    return this.request(`/message/sendText/${encodeURIComponent(input.instanceName)}`, {
      method: "POST",
      instanceApiKey: input.instanceApiKey,
      body: {
        number: input.remoteJid,
        text: input.text,
      },
    });
  }

  async fetchInstances() {
    return this.request("/instance/fetchInstances");
  }

  private async request(path: string, options: EvolutionRequestOptions = {}) {
    const baseUrl = this.config.get<string>("EVOLUTION_API_URL");
    const globalApiKey = this.config.get<string>("EVOLUTION_GLOBAL_API_KEY");

    if (!baseUrl || !globalApiKey) {
      throw new Error("Evolution API is not configured");
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: options.instanceApiKey || globalApiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(`Evolution API ${response.status}: ${text}`);
    }

    return payload;
  }
}
