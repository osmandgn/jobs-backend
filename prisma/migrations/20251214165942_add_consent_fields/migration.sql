-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'pending_deletion';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "is_remote" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "location_postcode" DROP NOT NULL,
ALTER COLUMN "location_lat" DROP NOT NULL,
ALTER COLUMN "location_lng" DROP NOT NULL,
ALTER COLUMN "job_date" DROP NOT NULL,
ALTER COLUMN "start_time" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending_review';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "analytics_consent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "consent_updated_at" TIMESTAMP(3),
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "third_party_consent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_deletion_requests_user_id_idx" ON "account_deletion_requests"("user_id");

-- CreateIndex
CREATE INDEX "account_deletion_requests_status_scheduled_for_idx" ON "account_deletion_requests"("status", "scheduled_for");

-- AddForeignKey
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
