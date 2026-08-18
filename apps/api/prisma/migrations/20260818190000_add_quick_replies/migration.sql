CREATE TABLE "quick_replies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "shortcut" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quick_replies_organization_id_shortcut_key" ON "quick_replies"("organization_id", "shortcut");
CREATE INDEX "quick_replies_organization_id_shortcut_idx" ON "quick_replies"("organization_id", "shortcut");

ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
