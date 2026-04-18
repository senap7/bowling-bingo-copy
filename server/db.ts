import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, teamBingoStates, InsertTeamBingoState, TeamBingoState } from "../drizzle/schema";
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

// チームビンゴ状態の取得または作成
export async function getTeamBingoState(teamNumber: number): Promise<TeamBingoState | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get team bingo state: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(teamBingoStates)
    .where(eq(teamBingoStates.teamNumber, teamNumber))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// チームビンゴ状態の作成または更新（原子的操作）
export async function upsertTeamBingoState(teamNumber: number, state: Omit<InsertTeamBingoState, 'teamNumber'>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert team bingo state: database not available");
    return;
  }

  try {
    // onDuplicateKeyUpdateで原子的に作成または更新
    await db.insert(teamBingoStates).values({
      teamNumber,
      ...state,
    }).onDuplicateKeyUpdate({
      set: {
        gridData: state.gridData,
        markedCells: state.markedCells,
        completedLines: state.completedLines,
        totalScore: state.totalScore,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert team bingo state:", error);
    throw error;
  }
}

// 全チームのランキングを取得（スコア降順）
export async function getAllTeamRankings(): Promise<TeamBingoState[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get team rankings: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(teamBingoStates)
    .orderBy(teamBingoStates.totalScore);

  // totalScore降順でソート
  return result.sort((a, b) => b.totalScore - a.totalScore);
}

// 全チームのビンゴ状態を削除（管理者用リセット）
export async function resetAllTeams(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot reset teams: database not available");
    return;
  }

  try {
    await db.delete(teamBingoStates);
  } catch (error) {
    console.error("[Database] Failed to reset all teams:", error);
    throw error;
  }
}

// 特定チームのビンゴ状態を削除（管理者用リセット）
export async function resetTeam(teamNumber: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot reset team: database not available");
    return;
  }

  try {
    await db.delete(teamBingoStates).where(eq(teamBingoStates.teamNumber, teamNumber));
  } catch (error) {
    console.error("[Database] Failed to reset team:", error);
    throw error;
  }
}
