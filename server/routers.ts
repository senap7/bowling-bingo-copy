import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getTeamBingoState,
  upsertTeamBingoState,
  getAllTeamRankings,
  resetAllTeams,
  resetTeam,
  getSharedBingoLayout,
  upsertSharedBingoLayout,
  resetSharedBingoLayout,
} from "./db";
import { generateBingoGrid } from "@shared/bingoGrid";

const ADMIN_PASSWORD = "bowlinglover";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // チーム管理ルーター
  team: router({
    // 共通カード配置を取得
    getSharedLayout: publicProcedure
      .query(async () => {
        const layout = await getSharedBingoLayout();
        if (!layout) return null;
        return layout.gridData; // JSON文字列のまま返す
      }),

    // 共通カード配置を保存（初回のみ作成、以降は無視）
    initSharedLayout: publicProcedure
      .input(z.object({ gridData: z.string() }))
      .mutation(async ({ input }) => {
        const existing = await getSharedBingoLayout();
        if (!existing) {
          // まだ存在しない場合のみ作成
          await upsertSharedBingoLayout(input.gridData);
        }
        return { success: true };
      }),

    // チームビンゴ状態を取得（markedCellsとtotalScoreのみ）
    getBingoState: publicProcedure
      .input(z.object({ teamNumber: z.number().min(1).max(10) }))
      .query(async ({ input }) => {
        const state = await getTeamBingoState(input.teamNumber);
        if (!state) {
          return null;
        }
        return state;
      }),

    // チームビンゴ状態を更新（markedCells・completedLines・totalScore・bowlingScore）
    updateBingoState: publicProcedure
      .input(z.object({
        teamNumber: z.number().min(1).max(10),
        gridData: z.string(),
        markedCells: z.string(),
        completedLines: z.string(),
        totalScore: z.number(),
        bowlingScore: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await upsertTeamBingoState(input.teamNumber, {
          gridData: input.gridData,
          markedCells: input.markedCells,
          completedLines: input.completedLines,
          totalScore: input.totalScore,
          ...(input.bowlingScore !== undefined ? { bowlingScore: input.bowlingScore } : {}),
        });
        return { success: true };
      }),

    // ボウリング実スコアのみ更新
    updateBowlingScore: publicProcedure
      .input(z.object({
        teamNumber: z.number().min(1).max(10),
        bowlingScore: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const existing = await getTeamBingoState(input.teamNumber);
        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'チームが見つかりません' });
        }
        await upsertTeamBingoState(input.teamNumber, {
          gridData: existing.gridData,
          markedCells: existing.markedCells,
          completedLines: existing.completedLines,
          totalScore: existing.totalScore,
          bowlingScore: input.bowlingScore,
        });
        return { success: true };
      }),

    // 全チームのランキングを取得
    getRankings: publicProcedure
      .query(async () => {
        const rankings = await getAllTeamRankings();
        return rankings.map(r => ({
          teamNumber: r.teamNumber,
          bingoScore: r.totalScore,
          bowlingScore: r.bowlingScore ?? 0,
          totalCombinedScore: r.totalScore + (r.bowlingScore ?? 0),
          completedLines: (() => {
            try {
              const lines = JSON.parse(r.completedLines);
              return Array.isArray(lines) ? lines.length : 0;
            } catch {
              return 0;
            }
          })(),
          updatedAt: r.updatedAt,
        }));
      }),
  }),

  // 管理者専用ルーター（パスワード認証）
  admin: router({
    // パスワード認証
    verifyPassword: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'パスワードが正しくありません' });
        }
        return { success: true };
      }),

    // 全チームリセット（パスワード認証済み）
    resetAllTeams: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'パスワードが正しくありません' });
        }
        await resetAllTeams();
        await resetSharedBingoLayout(); // 共通カードもリセット
        return { success: true };
      }),

    // 特定チームリセット（パスワード認証済み）
    resetTeam: publicProcedure
      .input(z.object({ teamNumber: z.number().min(1).max(10), password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'パスワードが正しくありません' });
        }
        await resetTeam(input.teamNumber);
        return { success: true };
      }),

    // 全チームの詳細状態を取得（パスワード認証済み）
    getAllTeamStates: publicProcedure
      .input(z.object({ password: z.string() }))
      .query(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'パスワードが正しくありません' });
        }
        const rankings = await getAllTeamRankings();
        return rankings.map(r => ({
          teamNumber: r.teamNumber,
          totalScore: r.totalScore,
          completedLines: (() => {
            try {
              const lines = JSON.parse(r.completedLines);
              return Array.isArray(lines) ? lines.length : 0;
            } catch {
              return 0;
            }
          })(),
          updatedAt: r.updatedAt,
        }));
      }),

    // 共通カード配置を強制リセット（新しいカードを生成）
    resetSharedLayout: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'パスワードが正しくありません' });
        }
        // 古いカードを削除してから新しいカードを即座に生成・保存
        await resetSharedBingoLayout();
        const newGrid = generateBingoGrid();
        const gridData = JSON.stringify(newGrid);
        await upsertSharedBingoLayout(gridData);
        return { success: true, gridData };
      }),

    // 共通カード配置を取得（パスワード認証付き、プレビュー用）
    getSharedLayout: publicProcedure
      .input(z.object({ password: z.string() }))
      .query(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'パスワードが正しくありません' });
        }
        const layout = await getSharedBingoLayout();
        if (!layout) return null;
        return layout.gridData;
      }),

    // 共通カード配置を更新（マス内容編集用）
    updateSharedLayout: publicProcedure
      .input(z.object({ password: z.string(), gridData: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== ADMIN_PASSWORD) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'パスワードが正しくありません' });
        }
        await upsertSharedBingoLayout(input.gridData);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
