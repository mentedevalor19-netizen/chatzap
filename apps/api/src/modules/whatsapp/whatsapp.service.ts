import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MessageType } from '@prisma/client';

interface CloudApiResponse {
  messages?: Array<{ id: string }>;
}

interface MediaMessageOptions {
  type: Extract<MessageType, 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'>;
  to: string;
  mediaId?: string;
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
}

interface TemplateMessageOptions {
  to: string;
  name: string;
  languageCode: string;
  components?: unknown[];
}

@Injectable()
export class WhatsappService {
  constructor(private readonly config: ConfigService) {}

  async sendText(to: string, text: string) {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: true,
        body: text,
      },
    });
  }

  async sendMedia(options: MediaMessageOptions) {
    const field = options.type.toLowerCase();
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: options.to,
      type: field,
      [field]: {
        ...(options.mediaId ? { id: options.mediaId } : { link: options.mediaUrl }),
        ...(options.caption && field !== 'audio' ? { caption: options.caption } : {}),
        ...(options.fileName && field === 'document' ? { filename: options.fileName } : {}),
      },
    };

    return this.sendMessage(payload);
  }

  async sendLocation(to: string, location: { latitude: number; longitude: number; name?: string; address?: string }) {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'location',
      location,
    });
  }

  async sendContact(to: string, contacts: unknown[]) {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'contacts',
      contacts,
    });
  }

  async sendTemplate(options: TemplateMessageOptions) {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'template',
      template: {
        name: options.name,
        language: {
          code: options.languageCode,
        },
        ...(options.components?.length ? { components: options.components } : {}),
      },
    });
  }

  async markIncomingAsRead(messageId: string) {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  async uploadMedia(file: Express.Multer.File) {
    const phoneNumberId = this.getRequired('WHATSAPP_PHONE_NUMBER_ID');
    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    form.append('file', blob, file.originalname);
    form.append('messaging_product', 'whatsapp');
    form.append('type', file.mimetype);

    const response = await fetch(`${this.graphBase}/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getRequired('WHATSAPP_ACCESS_TOKEN')}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ServiceUnavailableException(`WhatsApp media upload failed: ${errorText}`);
    }

    return response.json() as Promise<{ id: string }>;
  }

  async resolveMediaUrl(mediaId: string) {
    const response = await fetch(`${this.graphBase}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${this.getRequired('WHATSAPP_ACCESS_TOKEN')}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { url?: string; mime_type?: string };
    return data.url ? { url: data.url, mimeType: data.mime_type } : null;
  }

  private async sendMessage(payload: Record<string, unknown>) {
    const phoneNumberId = this.getRequired('WHATSAPP_PHONE_NUMBER_ID');
    const response = await fetch(`${this.graphBase}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getRequired('WHATSAPP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ServiceUnavailableException(`WhatsApp Cloud API failed: ${errorText}`);
    }

    const data = (await response.json()) as CloudApiResponse;
    return data.messages?.[0]?.id ?? null;
  }

  private get graphBase() {
    const version = this.config.get<string>('META_GRAPH_API_VERSION') ?? 'v20.0';
    return `https://graph.facebook.com/${version}`;
  }

  private getRequired(key: string) {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ServiceUnavailableException(`${key} is not configured`);
    }
    return value;
  }
}
