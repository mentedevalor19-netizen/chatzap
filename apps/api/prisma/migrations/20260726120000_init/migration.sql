-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER', 'TEMPLATE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'RECEIVED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'AGENT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "wa_id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatar_url" TEXT,
  "last_seen_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "assigned_to_id" TEXT,
  "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "unread_count" INTEGER NOT NULL DEFAULT 0,
  "last_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "sender_user_id" TEXT,
  "wa_message_id" TEXT,
  "direction" "MessageDirection" NOT NULL,
  "type" "MessageType" NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
  "body" TEXT,
  "media_id" TEXT,
  "media_url" TEXT,
  "mime_type" TEXT,
  "file_name" TEXT,
  "caption" TEXT,
  "location_latitude" DECIMAL(10,7),
  "location_longitude" DECIMAL(10,7),
  "location_name" TEXT,
  "location_address" TEXT,
  "contact_payload" JSONB,
  "raw_payload" JSONB,
  "sent_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_tags" (
  "contact_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("contact_id", "tag_id")
);

-- CreateTable
CREATE TABLE "notes" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE UNIQUE INDEX "contacts_organization_id_wa_id_key" ON "contacts"("organization_id", "wa_id");
CREATE INDEX "contacts_organization_id_phone_idx" ON "contacts"("organization_id", "phone");
CREATE INDEX "contacts_organization_id_name_idx" ON "contacts"("organization_id", "name");
CREATE INDEX "conversations_organization_id_status_last_message_at_idx" ON "conversations"("organization_id", "status", "last_message_at");
CREATE INDEX "conversations_organization_id_contact_id_idx" ON "conversations"("organization_id", "contact_id");
CREATE UNIQUE INDEX "messages_wa_message_id_key" ON "messages"("wa_message_id");
CREATE INDEX "messages_organization_id_conversation_id_created_at_idx" ON "messages"("organization_id", "conversation_id", "created_at");
CREATE INDEX "messages_organization_id_contact_id_idx" ON "messages"("organization_id", "contact_id");
CREATE INDEX "messages_organization_id_direction_status_idx" ON "messages"("organization_id", "direction", "status");
CREATE UNIQUE INDEX "tags_organization_id_name_key" ON "tags"("organization_id", "name");
CREATE INDEX "contact_tags_organization_id_idx" ON "contact_tags"("organization_id");
CREATE INDEX "notes_organization_id_contact_id_created_at_idx" ON "notes"("organization_id", "contact_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tags" ADD CONSTRAINT "tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
