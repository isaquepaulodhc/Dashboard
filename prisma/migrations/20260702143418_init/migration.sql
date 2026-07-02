-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL,
    "payload" TEXT NOT NULL,
    "summary" TEXT
);

-- CreateTable
CREATE TABLE "RefreshLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "message" TEXT,
    "errors" TEXT
);
