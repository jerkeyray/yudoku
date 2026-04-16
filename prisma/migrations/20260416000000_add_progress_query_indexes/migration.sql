-- CreateIndex
CREATE INDEX "ChapterProgress_userId_completed_idx" ON "ChapterProgress"("userId", "completed");

-- CreateIndex
CREATE INDEX "VideoProgress_userId_completed_idx" ON "VideoProgress"("userId", "completed");

-- CreateIndex
CREATE INDEX "UserActivity_userId_idx" ON "UserActivity"("userId");
