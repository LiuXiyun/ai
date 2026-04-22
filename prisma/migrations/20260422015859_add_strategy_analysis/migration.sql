-- CreateTable
CREATE TABLE "StrategyAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '2156',
    "language" TEXT NOT NULL DEFAULT 'zh-cn',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "serpResults" TEXT,
    "pageTypeDistribution" TEXT,
    "competitors" TEXT,
    "strategy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
