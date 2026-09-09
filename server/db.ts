import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// Subscription queries
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { userSubscriptions } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createDefaultSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { subscriptionPlans, userSubscriptions } = await import("../drizzle/schema");
  
  try {
    // Get or create free plan
    const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, "Free")).limit(1);
    let freePlanId = plans.length > 0 ? plans[0].id : null;

    if (!freePlanId) {
      // Create free plan if it doesn't exist
      await db.insert(subscriptionPlans).values({
        name: "Free",
        description: "Free plan - 5 summaries per day",
        price: 0,
        currency: "INR",
        summariesPerDay: 5,
        features: "5 summaries/day,Basic summaries",
        isActive: 1,
      });

      const newPlans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, "Free")).limit(1);
      freePlanId = newPlans.length > 0 ? newPlans[0].id : null;
    }

    if (freePlanId) {
      await db.insert(userSubscriptions).values({
        userId,
        planId: freePlanId,
        status: "active",
      });
    }
  } catch (error) {
    console.error("[Database] Error creating default subscription:", error);
  }
}
