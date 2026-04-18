import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// チーム別ビンゴゲーム状態テーブル
export const teamBingoStates = mysqlTable("teamBingoStates", {
  id: int("id").autoincrement().primaryKey(),
  teamNumber: int("teamNumber").notNull().unique(), // 1-10 (ユニーク制約)
  gridData: text("gridData").notNull(), // JSON形式のビンゴグリッド
  markedCells: text("markedCells").notNull(), // JSON形式のマーク状態
  completedLines: text("completedLines").notNull(), // JSON形式の完成ラインリスト
  totalScore: int("totalScore").default(0).notNull(),
  bowlingScore: int("bowlingScore").default(0).notNull(), // チームの実ボウリング合計スコア（手入力）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamBingoState = typeof teamBingoStates.$inferSelect;
export type InsertTeamBingoState = typeof teamBingoStates.$inferInsert;

// 全チーム共通ビンゴカード配置テーブル（1レコードのみ）
export const sharedBingoLayout = mysqlTable("sharedBingoLayout", {
  id: int("id").autoincrement().primaryKey(),
  gridData: text("gridData").notNull(), // JSON形式の共通グリッド配置
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SharedBingoLayout = typeof sharedBingoLayout.$inferSelect;
export type InsertSharedBingoLayout = typeof sharedBingoLayout.$inferInsert;