CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

CREATE TYPE "ExpenseCategory" AS ENUM ('ADS', 'SUPPLIER', 'TOOLS', 'OTHER');

ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "contact_id" TEXT,
    "conversation_id" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PAID',
    "note" TEXT,
    "sold_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "users_organization_id_is_active_idx" ON "users"("organization_id", "is_active");
CREATE INDEX "sales_organization_id_sold_at_idx" ON "sales"("organization_id", "sold_at");
CREATE INDEX "sales_organization_id_seller_id_sold_at_idx" ON "sales"("organization_id", "seller_id", "sold_at");
CREATE INDEX "sales_organization_id_status_sold_at_idx" ON "sales"("organization_id", "status", "sold_at");
CREATE INDEX "expenses_organization_id_spent_at_idx" ON "expenses"("organization_id", "spent_at");
CREATE INDEX "expenses_organization_id_category_spent_at_idx" ON "expenses"("organization_id", "category", "spent_at");

ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
