import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export * from "./schema";

// Seed data
const seedRoutes = [
  { id: "r1", name: "Route 10A — North Campus", stops: "Green Park,Hauz Khas,AIIMS,Campus Gate", fare: 4500 },
  { id: "r2", name: "Route 22B — South Campus", stops: "Saket,Malviya Nagar,INA,Campus Gate", fare: 4500 },
  { id: "r3", name: "Route 07X — East Express", stops: "Mayur Vihar,Akshardham,ITO,Campus Gate", fare: 5000 },
];

const seedBuses = [
  { id: "b1", number: "DL-10A-1042", capacity: 40, routeId: "r1", driver: "R. Kumar", conductor: "A. Singh" },
  { id: "b2", number: "DL-22B-2210", capacity: 40, routeId: "r2", driver: "M. Yadav", conductor: "P. Verma" },
  { id: "b3", number: "DL-07X-3399", capacity: 36, routeId: "r3", driver: "S. Rao", conductor: "K. Joshi" },
];

const seedStudents = [
  {
    id: "s1",
    name: "Arjun Sharma",
    rollNo: "20BCS104",
    branch: "CSE",
    semester: "6",
    phone: "9876543210",
    parentPhone: "9876500001",
    routeId: "r1",
    pickupPoint: "Green Park",
    seatNo: "12C",
    photo: null,
    feesPaid: true,
    passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // demo hashed
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
  },
  {
    id: "s2",
    name: "Priya Patel",
    rollNo: "20BEC087",
    branch: "ECE",
    semester: "6",
    phone: "9876543211",
    parentPhone: "9876500002",
    routeId: "r1",
    pickupPoint: "Hauz Khas",
    seatNo: "08A",
    photo: null,
    feesPaid: true,
    passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 55,
  },
  {
    id: "s3",
    name: "Rohan Mehta",
    rollNo: "21BME213",
    branch: "ME",
    semester: "4",
    phone: "9876543212",
    parentPhone: "9876500003",
    routeId: "r2",
    pickupPoint: "Saket",
    seatNo: "15B",
    photo: null,
    feesPaid: false,
    passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
  },
  {
    id: "s4",
    name: "Sara Iyer",
    rollNo: "21BCS411",
    branch: "CSE",
    semester: "4",
    phone: "9876543213",
    parentPhone: "9876500004",
    routeId: "r2",
    pickupPoint: "Malviya Nagar",
    seatNo: "22D",
    photo: null,
    feesPaid: true,
    passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  },
  {
    id: "s5",
    name: "Karan Gupta",
    rollNo: "22BEE065",
    branch: "EE",
    semester: "2",
    phone: "9876543214",
    parentPhone: "9876500005",
    routeId: "r3",
    pickupPoint: "Mayur Vihar",
    seatNo: "03A",
    photo: null,
    feesPaid: true,
    passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
  },
];

const seedAttendance = [
  { id: "a1", studentId: "s1", type: "entry", ts: Date.now() - 1000 * 60 * 60 * 5, busId: "b1", verified: true, conductorOverride: false },
  { id: "a2", studentId: "s1", type: "exit", ts: Date.now() - 1000 * 60 * 60 * 2, busId: "b1", verified: true, conductorOverride: false },
  { id: "a3", studentId: "s2", type: "entry", ts: Date.now() - 1000 * 60 * 60 * 5, busId: "b1", verified: true, conductorOverride: false },
];

const seedPayments = [
  { id: "p1", studentId: "s1", amount: 4500, ts: Date.now() - 1000 * 60 * 60 * 24 * 30, status: "paid" },
  { id: "p2", studentId: "s2", amount: 4500, ts: Date.now() - 1000 * 60 * 60 * 24 * 28, status: "paid" },
  { id: "p3", studentId: "s4", amount: 4500, ts: Date.now() - 1000 * 60 * 60 * 24 * 10, status: "paid" },
  { id: "p4", studentId: "s5", amount: 5000, ts: Date.now() - 1000 * 60 * 60 * 24 * 5, status: "paid" },
];

const seedSuspicious = [
  { id: "x1", studentId: "s3", reason: "Face mismatch after 3 retries", ts: Date.now() - 1000 * 60 * 60 * 26, busId: "b2", capturedImage: null, seatNo: "15B", resolved: false },
];

// In-memory table store
const memoryStore: Record<string, any[]> = {
  students: [...seedStudents],
  buses: [...seedBuses],
  routes: [...seedRoutes],
  trips: [],
  attendance_logs: [...seedAttendance],
  payments: [...seedPayments],
  suspicious_entries: [...seedSuspicious],
  conductor_overrides: [],
};

import { getTableName as drizzleGetTableName } from "drizzle-orm";

function getTableName(table: any): string {
  if (typeof table === "string") return table;
  try {
    const n = drizzleGetTableName(table);
    if (n) return n;
  } catch {}
  return table?._?.name ?? table?.tableName ?? "unknown";
}

function createInMemoryDb() {
  console.warn("[AI Studio] DATABASE_URL not active — using in-memory mock store");

  return {
    select: (_fields?: any) => {
      let currentTable = "";
      let whereFilter: ((item: any) => boolean) | null = null;
      let orderCol: string | null = null;

      const queryObj: any = {
        from: (table: any) => {
          currentTable = getTableName(table);
          return queryObj;
        },
        where: (condition: any) => {
          whereFilter = (item: any) => {
            if (!condition) return true;
            if (condition && typeof condition === "object") {
              if (Array.isArray(condition.conditions)) {
                return condition.conditions.every((c: any) => matchCondition(item, c));
              }
              return matchCondition(item, condition);
            }
            return true;
          };
          return queryObj;
        },
        orderBy: (col: any) => {
          orderCol = col?.name ?? "ts";
          return queryObj;
        },
        then: (resolve: any) => {
          const list = memoryStore[currentTable] ?? [];
          let res = [...list];
          if (whereFilter) {
            res = res.filter(whereFilter);
          }
          if (orderCol) {
            res.sort((a, b) => ((a[orderCol!] ?? 0) > (b[orderCol!] ?? 0) ? 1 : -1));
          }
          if (_fields && typeof _fields === "object" && !Array.isArray(_fields)) {
            const fieldKeys = Object.keys(_fields);
            res = res.map((item) => {
              const projected: any = {};
              for (const k of fieldKeys) {
                const colName = _fields[k]?.name ?? k;
                projected[k] = item[colName] !== undefined ? item[colName] : item[k];
              }
              return projected;
            });
          }
          return Promise.resolve(res).then(resolve);
        },
      };

      function matchCondition(item: any, cond: any): boolean {
        if (!cond) return true;
        if (typeof cond !== "object") return true;

        if (Array.isArray(cond.conditions)) {
          return cond.conditions.every((c: any) => matchCondition(item, c));
        }

        if (Array.isArray(cond.queryChunks)) {
          const chunks = cond.queryChunks;
          const subSqls = chunks.filter((c: any) => c && typeof c === "object" && Array.isArray(c.queryChunks));
          if (subSqls.length > 0) {
            return subSqls.every((s: any) => matchCondition(item, s));
          }

          if (chunks.length >= 3) {
            const leftCol = chunks[0]?.name ?? chunks[0]?._?.name ?? chunks[0]?.key ?? String(chunks[0]);
            let rightVal = chunks[2];
            while (rightVal && typeof rightVal === "object" && ("value" in rightVal || "param" in rightVal)) {
              rightVal = rightVal.value ?? rightVal.param;
            }

            if (leftCol !== undefined) {
              const camel = String(leftCol).replace(/_([a-z])/g, (_, l) => l.toUpperCase());
              const snake = String(leftCol).replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
              const itemVal = item[leftCol] !== undefined ? item[leftCol] : (item[camel] !== undefined ? item[camel] : item[snake]);
              return String(itemVal) === String(rightVal);
            }
          }
        }

        const leftCol = cond.left?.name ?? cond.left?._?.name ?? cond.left;
        let rightVal = cond.right?.value !== undefined ? cond.right.value : cond.right;
        if (leftCol !== undefined && rightVal !== undefined) {
          const camel = String(leftCol).replace(/_([a-z])/g, (_, l) => l.toUpperCase());
          const snake = String(leftCol).replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
          const itemVal = item[leftCol] ?? item[camel] ?? item[snake];
          return itemVal === rightVal;
        }

        return true;
      }

      return queryObj;
    },

    insert: (table: any) => {
      const tableName = getTableName(table);
      return {
        values: (val: any) => {
          const arr = Array.isArray(val) ? val : [val];
          if (!memoryStore[tableName]) memoryStore[tableName] = [];
          memoryStore[tableName].push(...arr);
          return Promise.resolve({ rowCount: arr.length });
        },
      };
    },

    update: (table: any) => {
      const tableName = getTableName(table);
      let whereFilter: ((item: any) => boolean) | null = null;
      let updates: any = {};

      const updateObj: any = {
        set: (data: any) => {
          updates = data;
          return updateObj;
        },
        where: (condition: any) => {
          whereFilter = (item: any) => {
            if (!condition) return true;
            const leftCol = condition.left?.name ?? condition.left;
            const rightVal = condition.right;
            if (leftCol && rightVal !== undefined) {
              return item[leftCol] === rightVal;
            }
            return true;
          };
          return updateObj;
        },
        then: (resolve: any) => {
          const list = memoryStore[tableName] ?? [];
          let updatedCount = 0;
          for (let i = 0; i < list.length; i++) {
            if (!whereFilter || whereFilter(list[i])) {
              list[i] = { ...list[i], ...updates };
              updatedCount++;
            }
          }
          return Promise.resolve({ rowCount: updatedCount }).then(resolve);
        },
      };
      return updateObj;
    },

    delete: (table: any) => {
      const tableName = getTableName(table);
      let whereFilter: ((item: any) => boolean) | null = null;

      const deleteObj: any = {
        where: (condition: any) => {
          whereFilter = (item: any) => {
            if (!condition) return true;
            const leftCol = condition.left?.name ?? condition.left;
            const rightVal = condition.right;
            if (leftCol && rightVal !== undefined) {
              return item[leftCol] === rightVal;
            }
            return true;
          };
          return deleteObj;
        },
        then: (resolve: any) => {
          const list = memoryStore[tableName] ?? [];
          const remaining = whereFilter ? list.filter((item) => !whereFilter!(item)) : [];
          memoryStore[tableName] = remaining;
          return Promise.resolve({ rowCount: list.length - remaining.length }).then(resolve);
        },
      };
      return deleteObj;
    },
  };
}

let dbInstance: any;
let poolInstance: pg.Pool | null = null;

if (process.env.DATABASE_URL) {
  try {
    poolInstance = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzle(poolInstance, { schema });
    console.log("[AI Studio] Connected to PostgreSQL via DATABASE_URL");
  } catch (e) {
    console.warn("[AI Studio] PostgreSQL connection failed, activating in-memory store", e);
    dbInstance = createInMemoryDb();
  }
} else {
  dbInstance = createInMemoryDb();
}

export const pool = poolInstance;
export const db = dbInstance;
