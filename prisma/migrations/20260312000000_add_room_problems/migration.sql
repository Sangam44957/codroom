-- CreateTable
CREATE TABLE "room_problems" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "roomId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "room_problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_problems_roomId_problemId_key" ON "room_problems"("roomId", "problemId");

-- CreateIndex
CREATE INDEX "room_problems_roomId_order_idx" ON "room_problems"("roomId", "order");

-- AddForeignKey
ALTER TABLE "room_problems" ADD CONSTRAINT "room_problems_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_problems" ADD CONSTRAINT "room_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
