-- CreateIndex
CREATE INDEX "Course_userId_updatedAt_idx" ON "Course"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "VideoProgress_userId_updatedAt_idx" ON "VideoProgress"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_userId_updatedAt_idx" ON "Note"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Note_userId_courseId_idx" ON "Note"("userId", "courseId");
