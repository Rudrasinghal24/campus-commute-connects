import { Router } from "express";
import { db } from "@workspace/db";
import { routesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(routesTable);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch routes");
    res.status(500).json({ error: "Failed to fetch routes." });
  }
});

router.post("/", async (req, res) => {
  const { id, name, stops, fare } = req.body as {
    id?: string;
    name: string;
    stops: string | string[];
    fare: number;
  };

  if (!name?.trim() || !fare) {
    res.status(400).json({ error: "Route name and fare are required." });
    return;
  }

  const routeId = id || "r_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const formattedStops = Array.isArray(stops) ? stops.join(",") : stops?.trim() || "Campus Gate";

  try {
    await db.insert(routesTable).values({
      id: routeId,
      name: name.trim(),
      stops: formattedStops,
      fare: Number(fare),
    });
    req.log.info({ routeId, name }, "Route added successfully");
    res.status(201).json({ id: routeId, name, stops: formattedStops, fare: Number(fare) });
  } catch (err) {
    req.log.error({ err }, "Failed to create route");
    res.status(500).json({ error: "Failed to create route." });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(routesTable).where(eq(routesTable.id, id!));
    req.log.info({ routeId: id }, "Route deleted");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete route");
    res.status(500).json({ error: "Failed to delete route." });
  }
});

export default router;
