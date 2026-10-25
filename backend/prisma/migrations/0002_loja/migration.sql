-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'pod';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "promoCents" INTEGER;

-- AlterTable
ALTER TABLE "Flavor" ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "promoCents" INTEGER;

