export interface WhatsappWebhookPayload {
  object?: string;
  entry?: WhatsappEntry[];
}

export interface WhatsappEntry {
  id?: string;
  changes?: WhatsappChange[];
}

export interface WhatsappChange {
  field?: string;
  value?: {
    messaging_product?: string;
    metadata?: {
      display_phone_number?: string;
      phone_number_id?: string;
    };
    contacts?: Array<{
      wa_id: string;
      profile?: {
        name?: string;
      };
    }>;
    messages?: WhatsappInboundMessage[];
    statuses?: WhatsappStatusUpdate[];
  };
}

export interface WhatsappInboundMessage {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  image?: WhatsappMediaPayload;
  video?: WhatsappMediaPayload;
  audio?: WhatsappMediaPayload;
  document?: WhatsappMediaPayload & { filename?: string };
  sticker?: WhatsappMediaPayload;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: unknown[];
  referral?: WhatsappReferralPayload;
}

export interface WhatsappMediaPayload {
  id?: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
}

export interface WhatsappStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: string;
  recipient_id?: string;
  errors?: unknown[];
}

export interface WhatsappReferralPayload {
  source_url?: string;
  source_id?: string;
  source_type?: string;
  headline?: string;
  body?: string;
  media_type?: string;
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  ctwa_clid?: string;
  welcome_message?: {
    text?: string;
  };
}
