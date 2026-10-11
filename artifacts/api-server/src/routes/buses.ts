import { Router } from "express";
import { db } from "@workspace/db";
import { busesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(busesTable);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch buses");
    res.status(500).json({ error: "Failed to fetch buses." });
  }
});

router.post("/", async (req, res) => {
  const { id, number, capacity, routeId, driver, conductor } = req.body as {
    id?: string;
    number: string;
    capacity: number;
    routeId: string;
    driver: string;
    conductor: string;
  };

  if (!number?.trim() || !capacity || !routeId || !driver?.trim() || !conductor?.trim()) {
    res.status(400).json({ error: "All bus fields are required." });
    return;
  }

  const busId = id || "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  try {
    await db.insert(busesTable).values({
      id: busId,
      number: number.trim(),
      capacity: Number(capacity),
      routeId,
      driver: driver.trim(),
      conductor: conductor.trim(),
    });
    req.log.info({ busId, number }, "Bus added successfully");
    res.status(201).json({ id: busId, number, capacity, routeId, driver, conductor });
  } catch (err) {
    req.log.error({ err }, "Failed to create bus");
    res.status(500).json({ error: "Failed to create bus." });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(busesTable).where(eq(busesTable.id, id!));
    req.log.info({ busId: id }, "Bus deleted");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete bus");
    res.status(500).json({ error: "Failed to delete bus." });
  }
});

export default router;
