import { Router, Response } from "express";
import { db, usersTable, ratingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { protect, roleCheck, AuthRequest } from "../middlewares/auth";
import { haversineDistance } from "../lib/haversine";
import { GHANA_REGIONS } from "../lib/regions";

const router = Router();

// GET /api/providers/regions — admin: provider count per region
router.get("/regions", protect, roleCheck("admin"), async (_req: AuthRequest, res: Response) => {
  try {
    const counts = await db
      .select({
        region: usersTable.region,
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when status = 'active' then 1 else 0 end)`,
        pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "provider"))
      .groupBy(usersTable.region);

    // Fill in regions with 0 providers
    const map = new Map(counts.map(r => [r.region, r]));
    const all = GHANA_REGIONS.map(name => ({
      region: name,
      total: Number(map.get(name)?.total ?? 0),
      active: Number(map.get(name)?.active ?? 0),
      pending: Number(map.get(name)?.pending ?? 0),
    }));

    // Also include any unassigned / other region providers
    const others = counts.filter(c => c.region && !GHANA_REGIONS.includes(c.region as any));
    for (const o of others) {
      all.push({ region: o.region ?? "Unknown", total: Number(o.total), active: Number(o.active), pending: Number(o.pending) });
    }

    res.json({ regions: all, availableRegions: GHANA_REGIONS });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// GET /api/providers — find providers with optional GPS + region + category filtering
router.get("/", protect, async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, radius, category, region } = req.query as {
      lat?: string;
      lng?: string;
      radius?: string;
      category?: string;
      region?: string;
    };

    const conditions: any[] = [
      eq(usersTable.role, "provider"),
      eq(usersTable.status, "active"),
      eq(usersTable.isAvailable, true),
    ];

    if (category) conditions.push(eq(usersTable.category, category));
    if (region) conditions.push(eq(usersTable.region, region));

    const providers = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      category: usersTable.category,
      region: usersTable.region,
      isAvailable: usersTable.isAvailable,
      lat: usersTable.lat,
      lng: usersTable.lng,
    }).from(usersTable).where(and(...conditions));

    const ratingsData = await db.select().from(ratingsTable);

    const enriched = providers.map((p) => {
      const providerRatings = ratingsData.filter(r => r.ratedId === p.id);
      const averageRating = providerRatings.length > 0
        ? providerRatings.reduce((sum, r) => sum + r.score, 0) / providerRatings.length
        : null;

      let distanceKm: number | null = null;
      if (lat && lng && p.lat != null && p.lng != null) {
        distanceKm = Math.round(
          haversineDistance(parseFloat(lat), parseFloat(lng), p.lat, p.lng) * 10
        ) / 10;
      }

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        category: p.category,
        region: p.region,
        isAvailable: p.isAvailable,
        lat: p.lat,
        lng: p.lng,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        distanceKm,
      };
    });

    const radiusKm = radius ? parseFloat(radius) : null;
    const filtered = (lat && lng && radiusKm)
      ? enriched.filter(p => p.distanceKm !== null && p.distanceKm <= radiusKm)
      : enriched;

    filtered.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      return a.name.localeCompare(b.name);
    });

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

// PATCH /api/providers/:id/location — admin or the provider themselves
router.patch("/:id/location", protect, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const providerId = parseInt(req.params.id);

    if (user.role !== "admin" && user.id !== providerId) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    const { lat, lng, region } = req.body as { lat?: number; lng?: number; region?: string };

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (lat !== undefined) updates.lat = lat;
    if (lng !== undefined) updates.lng = lng;
    if (region !== undefined) updates.region = region;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, providerId))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        region: usersTable.region,
        lat: usersTable.lat,
        lng: usersTable.lng,
      });

    if (!updated) { res.status(404).json({ message: "Provider not found" }); return; }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
});

export default router;
