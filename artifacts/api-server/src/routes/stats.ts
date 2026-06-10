import { Router, Response } from "express";
import { db, usersTable, bookingsTable, reportsTable } from "@workspace/db";
import { eq, gte, sql, and } from "drizzle-orm";
import { protect, roleCheck, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/", protect, roleCheck("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [[totalUsers], [totalProviders], [activeProviders], [pendingProviders],
           [totalBookings], [completedBookings], [bookingsToday], [pendingReports],
           topServices] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(usersTable),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "provider")),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "provider"), eq(usersTable.status, "active"))),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.role, "provider"), eq(usersTable.status, "pending"))),
      db.select({ count: sql<number>`count(*)` }).from(bookingsTable),
      db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "completed")),
      db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(gte(bookingsTable.createdAt, today)),
      db.select({ count: sql<number>`count(*)` }).from(reportsTable).where(eq(reportsTable.status, "open")),
      db.select({
        serviceType: bookingsTable.serviceType,
        count: sql<number>`count(*)`,
      })
        .from(bookingsTable)
        .groupBy(bookingsTable.serviceType)
        .orderBy(sql`count(*) desc`)
        .limit(5),
    ]);

    res.json({
      totalUsers: Number(totalUsers.count),
      totalProviders: Number(totalProviders.count),
      activeProviders: Number(activeProviders.count),
      pendingProviders: Number(pendingProviders.count),
      totalBookings: Number(totalBookings.count),
      completedBookings: Number(completedBookings.count),
      bookingsToday: Number(bookingsToday.count),
      pendingReports: Number(pendingReports.count),
      topServices: topServices.map(s => ({
        serviceType: s.serviceType,
        count: Number(s.count),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
