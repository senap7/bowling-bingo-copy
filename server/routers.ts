import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getTeamBingoState, upsertTeamBingoState, getAllTeamRankings, resetAllTeams, resetTeam } from "./db";

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
    // チームビンゴ状態を取得
    getBingoState: publicProcedure
      .input(z.object({ teamNumber: z.number().min(1).max(10) }))
      .query(async ({ input }) => {
        const state = await getTeamBingoState(input.teamNumber);
        if (!state) {
          return null;
        }
        return state;
      }),

    // チームビンゴ状態を更新
    updateBingoState: publicProcedure
      .input(z.object({
        teamNumber: z.number().min(1).max(10),
        gridData: z.string(),
        markedCells: z.string(),
        completedLines: z.string(),
        totalScore: z.number(),
      }))
      .mutation(async ({ input }) => {
        await upsertTeamBingoState(input.teamNumber, {
          gridData: input.gridData,
          markedCells: input.markedCells,
          completedLines: input.completedLines,
          totalScore: input.totalScore,
        });
        return { success: true };
      }),

    // 全チームのランキングを取得
    getRankings: publicProcedure
      .query(async () => {
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
  }),

  // 管理者専用ルーター
  admin: router({
    // 全チームリセット（管理者のみ）
    resetAllTeams: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
        }
        await resetAllTeams();
        return { success: true };
      }),

    // 特定チームリセット（管理者のみ）
    resetTeam: protectedProcedure
      .input(z.object({ teamNumber: z.number().min(1).max(10) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
        }
        await resetTeam(input.teamNumber);
        return { success: true };
      }),

    // 全チームの詳細状態を取得（管理者のみ）
    getAllTeamStates: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
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
  }),
});

export type AppRouter = typeof appRouter;
