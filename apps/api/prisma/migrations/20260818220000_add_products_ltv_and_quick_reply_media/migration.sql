ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'LTV';

ALTER TABLE "quick_replies"
  ADD COLUMN "media_url" TEXT,
  ADD COLUMN "mime_type" TEXT,
  ADD COLUMN "file_name" TEXT;

CREATE TABLE "products" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sales" ADD COLUMN "product_id" TEXT;

CREATE UNIQUE INDEX "products_organization_id_name_key" ON "products"("organization_id", "name");
CREATE INDEX "products_organization_id_is_active_name_idx" ON "products"("organization_id", "is_active", "name");
CREATE INDEX "sales_organization_id_product_id_sold_at_idx" ON "sales"("organization_id", "product_id", "sold_at");

ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
