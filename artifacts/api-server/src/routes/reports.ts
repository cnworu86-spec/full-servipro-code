import { Router, Response } from "express";
import { db, reportsTable, usersTable } from "@workspace/db";
import { eq, aliasedTable } from "drizzle-orm";
import { protect, roleCheck, AuthRequest } from "../middlewares/auth";

const router = Router();

const reporterAlias = aliasedTable(usersTable, "reporter");
const reportedAlias = aliasedTable(usersTable, "reported");

// GET /api/reports — admin only
router.get("/", protect, roleCheck("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const reports = await db
      .select({
        id: reportsTable.id,
        reason: reportsTable.reason,
        status: reportsTable.status,
        adminNotes: reportsTable.adminNotes,
        bookingId: reportsTable.bookingId,
        createdAt: reportsTable.createdAt,
        reporterId: reportsTable.reporterId,
        reportedId: reportsTable.reportedId,
        reporterName: reporterAlias.name,
        reporterEmail: reporterAlias.email,
        reportedName: reportedAlias.name,
        reportedEmail: reportedAlias.email,
        reportedRole: reportedAlias.role,
      })
      .from(reportsTable)
      .leftJoin(reporterAlias, eq(reportsTable.reporterId, reporterAlias.id))
      .leftJoin(reportedAlias, eq(reportsTable.reportedId, reportedAlias.id))
      .orderBy(reportsTable.createdAt);

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// POST /api/reports — any authenticated user can report
router.post("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { reportedId, bookingId, reason } = req.body as {
      reportedId: number;
      bookingId?: number;
      reason: string;
    };

    if (!reportedId || !reason) {
      res.status(400).json({ message: "reportedId and reason are required" });
      return;
    }

    if (reportedId === user.id) {
      res.status(400).json({ message: "You cannot report yourself" });
      return;
    }

    const [report] = await db.insert(reportsTable).values({
      reporterId: user.id,
      reportedId,
      bookingId: bookingId ?? null,
      reason,
    }).returning();

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/reports/:id/status — admin only
router.patch("/:id/status", protect, roleCheck("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const { status, adminNotes } = req.body as {
      status: "open" | "under_review" | "resolved";
      adminNotes?: string;
    };

    const [updated] = await db.update(reportsTable)
      .set({ status, adminNotes, updatedAt: new Date() })
      .where(eq(reportsTable.id, reportId))
      .returning();

    if (!updated) { res.status(404).json({ message: "Report not found" }); return; }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
