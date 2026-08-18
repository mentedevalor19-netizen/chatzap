CREATE TYPE "FunnelStepType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

CREATE TYPE "FunnelRunStatus" AS ENUM ('RUNNING', 'WAITING_FOR_REPLY', 'COMPLETED', 'CANCELLED');

CREATE TABLE "funnels" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "handoff_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "funnel_steps" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "funnel_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "FunnelStepType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "media_id" TEXT,
    "media_url" TEXT,
    "mime_type" TEXT,
    "file_name" TEXT,
    "caption" TEXT,
    "wait_for_reply" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_funnel_runs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "funnel_id" TEXT NOT NULL,
    "status" "FunnelRunStatus" NOT NULL DEFAULT 'RUNNING',
    "next_step_position" INTEGER NOT NULL DEFAULT 1,
    "awaiting_reply" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_funnel_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "funnels_organization_id_is_active_idx" ON "funnels"("organization_id", "is_active");
CREATE UNIQUE INDEX "funnel_steps_funnel_id_position_key" ON "funnel_steps"("funnel_id", "position");
CREATE INDEX "funnel_steps_organization_id_funnel_id_position_idx" ON "funnel_steps"("organization_id", "funnel_id", "position");
CREATE INDEX "conversation_funnel_runs_organization_id_status_idx" ON "conversation_funnel_runs"("organization_id", "status");
CREATE INDEX "conversation_funnel_runs_organization_id_conversation_id_status_idx" ON "conversation_funnel_runs"("organization_id", "conversation_id", "status");

ALTER TABLE "funnels" ADD CONSTRAINT "funnels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_funnel_runs" ADD CONSTRAINT "conversation_funnel_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_funnel_runs" ADD CONSTRAINT "conversation_funnel_runs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_funnel_runs" ADD CONSTRAINT "conversation_funnel_runs_funnel_id_fkey" FOREIGN KEY ("funnel_id") REFERENCES "funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
