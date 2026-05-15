import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, studentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  const { id, studentId, amount, ts } = req.body as {
    id: string; studentId: string; amount: number; ts: number;
  };
  if (!id || !studentId || !amount || !ts) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }
  try {
    await db.insert(paymentsTable).values({ id, studentId, amount, ts, status: "paid" });
    await db.update(studentsTable).set({ feesPaid: true }).where(eq(studentsTable.id, studentId));
    req.log.info({ studentId, amount }, "Payment recorded");
    res.status(201).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to record payment");
    res.status(500).json({ error: "Failed to record payment." });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(paymentsTable)
      .orderBy(paymentsTable.ts);
    res.json(rows.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to fetch payments");
    res.status(500).json({ error: "Failed to fetch payments." });
  }
});

export default router;
