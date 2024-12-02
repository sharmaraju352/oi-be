-- CreateTable
CREATE TABLE "air_quality" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "co_gt" REAL NOT NULL,
    "pt08_s1_co" INTEGER NOT NULL,
    "nmhc_gt" INTEGER NOT NULL,
    "c6h6_gt" REAL NOT NULL,
    "pt08_s2_nmhc" INTEGER NOT NULL,
    "nox_gt" INTEGER NOT NULL,
    "pt08_s3_nox" INTEGER NOT NULL,
    "no2_gt" INTEGER NOT NULL,
    "pt08_s4_no2" INTEGER NOT NULL,
    "pt08_s5_o3" INTEGER NOT NULL,
    "t" REAL NOT NULL,
    "rh" REAL NOT NULL,
    "ah" REAL NOT NULL
);
