import { count, desc, eq, and } from "drizzle-orm";
import { DrizzleD1Database } from 'drizzle-orm/d1'
import { emails, InsertEmail } from "./schema"

export async function insertEmail(db: DrizzleD1Database, email: InsertEmail) {
  try {
    await db.insert(emails).values(email).execute();
  } catch (e) {
    console.error(e);
  }
}

export async function getEmails(db: DrizzleD1Database) {
  try {
    return await db.select().from(emails).all();
  } catch (e) {
    return [];
  }
}

export async function deleteEmail(db: DrizzleD1Database, id: string) {
  try {
    return await db.delete(emails).where(eq(emails.id, id)).execute();
  } catch (e) {
    return [];
  }
}

export async function deleteAllEmailsByMessageTo(db: DrizzleD1Database, messageTo: string) {
  try {
    return await db.delete(emails).where(eq(emails.messageTo, messageTo)).execute();
  } catch (e) {
    return [];
  }
}

export async function getEmail(db: DrizzleD1Database, id: string) {
  try {
    const result = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, id)))
      .all();
    if (result.length != 1) {
      return null;
    }
    return result[0];
  } catch (e) {
    return null;
  }
}

export async function getEmailByIdOfAEmail(db: DrizzleD1Database, id: string) {
  try {
    const result = await db
      .select({ messageTo: emails.messageTo })
      .from(emails)
      .where(and(eq(emails.id, id)))
      .limit(1)
      .all();
    return result[0];
  } catch (e) {
    return null;
  }
}

export async function getEmailsByMessageTo(
  db: DrizzleD1Database,
  messageTo: string
) {
  try {
    return await db
      .select()
      .from(emails)
      .where(eq(emails.messageTo, messageTo))
      .orderBy(desc(emails.createdAt))
      .all();
  } catch (e) {
    return [];
  }
}

export async function getEmailsCount(db: DrizzleD1Database) {
  try {
    const res = await db.select({ count: count() }).from(emails);
    return res[0]?.count;
  } catch (e) {
    return 0;
  }
}
