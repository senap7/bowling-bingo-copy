import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getTeamBingoState, upsertTeamBingoState } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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
        return {
          ...state,
          gridData: JSON.parse(state.gridData),
          markedCells: JSON.parse(state.markedCells),
          completedLines: JSON.parse(state.completedLines),
        };
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
  }),
});

export type AppRouter = typeof appRouter;
