ALTER TABLE "Reservation" ADD COLUMN "tableId" TEXT;

CREATE INDEX "Reservation_tableId_idx" ON "Reservation"("tableId");

ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
