import { Router } from "express";
import { db } from "@workspace/db";
import { tripsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.post("/start", async (req, res) => {
  const { busId, routeId } = req.body as { busId?: string; routeId?: string };
  if (!busId || !routeId) {
    res.status(400).json({ error: "busId and routeId are required." });
    return;
  }
  try {
    const [existing] = await db.select({ id: tripsTable.id })
      .from(tripsTable)
      .where(and(eq(tripsTable.busId, busId), eq(tripsTable.status, "active")));
    if (existing) {
      res.status(409).json({ error: "A trip is already active for this bus." });
      return;
    }
    const id = "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    const startedAt = Date.now();
    await db.insert(tripsTable).values({ id, busId, routeId, status: "active", startedAt });
    req.log.info({ tripId: id, busId, routeId }, "Trip started");
    res.status(201).json({ id, busId, routeId, status: "active", startedAt });
  } catch (err) {
    req.log.error({ err }, "Failed to start trip");
    res.status(500).json({ error: "Failed to start trip." });
  }
});

router.post("/end", async (req, res) => {
  const { busId } = req.body as { busId?: string };
  if (!busId) {
    res.status(400).json({ error: "busId is required." });
    return;
  }
  try {
    const [existing] = await db.select({ id: tripsTable.id })
      .from(tripsTable)
      .where(and(eq(tripsTable.busId, busId), eq(tripsTable.status, "active")));
    if (!existing) {
      res.status(404).json({ error: "No active trip found for this bus." });
      return;
    }
    const endedAt = Date.now();
    await db.update(tripsTable).set({ status: "ended", endedAt }).where(eq(tripsTable.id, existing.id));
    req.log.info({ tripId: existing.id, busId }, "Trip ended");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to end trip");
    res.status(500).json({ error: "Failed to end trip." });
  }
});

router.get("/active/:busId", async (req, res) => {
  const { busId } = req.params;
  try {
    const [trip] = await db.select().from(tripsTable)
      .where(and(eq(tripsTable.busId, busId!), eq(tripsTable.status, "active")));
    res.json(trip ?? null);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch active trip");
    res.status(500).json({ error: "Failed to fetch trip." });
  }
});

export default router;
