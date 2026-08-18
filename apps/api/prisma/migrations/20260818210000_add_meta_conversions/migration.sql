CREATE TYPE "MetaConversionStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "meta_integration_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dataset_id" TEXT,
    "whatsapp_business_account_id" TEXT,
    "graph_api_version" TEXT,
    "access_token_encrypted" TEXT,
    "test_event_code" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "send_lead_events" BOOLEAN NOT NULL DEFAULT false,
    "send_purchase_events" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_integration_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ad_attributions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "wa_message_id" TEXT,
    "ctwa_clid" TEXT NOT NULL,
    "source_type" TEXT,
    "source_id" TEXT,
    "source_url" TEXT,
    "headline" TEXT,
    "body" TEXT,
    "media_type" TEXT,
    "image_url" TEXT,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "welcome_message" TEXT,
    "raw_payload" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_attributions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meta_conversion_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "attribution_id" TEXT,
    "contact_id" TEXT,
    "conversation_id" TEXT,
    "event_name" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" "MetaConversionStatus" NOT NULL DEFAULT 'PENDING',
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_conversion_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meta_integration_settings_organization_id_key" ON "meta_integration_settings"("organization_id");
CREATE UNIQUE INDEX "ad_attributions_organization_id_conversation_id_key" ON "ad_attributions"("organization_id", "conversation_id");
CREATE INDEX "ad_attributions_organization_id_contact_id_received_at_idx" ON "ad_attributions"("organization_id", "contact_id", "received_at");
CREATE INDEX "ad_attributions_organization_id_ctwa_clid_idx" ON "ad_attributions"("organization_id", "ctwa_clid");
CREATE UNIQUE INDEX "meta_conversion_events_event_id_key" ON "meta_conversion_events"("event_id");
CREATE INDEX "meta_conversion_events_organization_id_status_created_at_idx" ON "meta_conversion_events"("organization_id", "status", "created_at");
CREATE INDEX "meta_conversion_events_organization_id_sale_id_idx" ON "meta_conversion_events"("organization_id", "sale_id");
CREATE INDEX "meta_conversion_events_organization_id_attribution_id_idx" ON "meta_conversion_events"("organization_id", "attribution_id");

ALTER TABLE "meta_integration_settings" ADD CONSTRAINT "meta_integration_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_attributions" ADD CONSTRAINT "ad_attributions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_attributions" ADD CONSTRAINT "ad_attributions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ad_attributions" ADD CONSTRAINT "ad_attributions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_attribution_id_fkey" FOREIGN KEY ("attribution_id") REFERENCES "ad_attributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
