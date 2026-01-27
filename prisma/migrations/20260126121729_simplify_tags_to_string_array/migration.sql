/*
  Warnings:

  - You are about to drop the `ConfigTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConfigTag" DROP CONSTRAINT "ConfigTag_configurationId_fkey";

-- DropForeignKey
ALTER TABLE "ConfigTag" DROP CONSTRAINT "ConfigTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_tenantId_fkey";

-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "ConfigTag";

-- DropTable
DROP TABLE "Tag";
