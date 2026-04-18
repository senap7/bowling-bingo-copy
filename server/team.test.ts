import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const VALID_PASSWORD = "bowlinglover";
const INVALID_PASSWORD = "wrongpassword";

describe("admin.verifyPassword", () => {
  it("正しいパスワードで認証成功", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.verifyPassword({ password: VALID_PASSWORD });
    expect(result).toEqual({ success: true });
  });

  it("間違ったパスワードでエラー", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.verifyPassword({ password: INVALID_PASSWORD })
    ).rejects.toThrow("パスワードが正しくありません");
  });
});

describe("admin.resetAllTeams", () => {
  it("正しいパスワードで全チームリセット成功", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.resetAllTeams({ password: VALID_PASSWORD });
    expect(result).toEqual({ success: true });
  });

  it("間違ったパスワードでエラー", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.resetAllTeams({ password: INVALID_PASSWORD })
    ).rejects.toThrow("パスワードが正しくありません");
  });
});

describe("admin.resetTeam", () => {
  it("正しいパスワードで特定チームリセット成功", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.resetTeam({ teamNumber: 4, password: VALID_PASSWORD });
    expect(result).toEqual({ success: true });
  });

  it("間違ったパスワードでエラー", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.resetTeam({ teamNumber: 4, password: INVALID_PASSWORD })
    ).rejects.toThrow("パスワードが正しくありません");
  });
});

describe("admin.resetSharedLayout", () => {
  it("正しいパスワードで共通カードリセット成功", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.resetSharedLayout({ password: VALID_PASSWORD });
    expect(result).toEqual({ success: true });
  });

  it("間違ったパスワードでエラー", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.resetSharedLayout({ password: INVALID_PASSWORD })
    ).rejects.toThrow("パスワードが正しくありません");
  });
});

describe("team.getBingoState", () => {
  it("チーム番号が範囲外の場合はエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.team.getBingoState({ teamNumber: 0 })).rejects.toThrow();
    await expect(caller.team.getBingoState({ teamNumber: 11 })).rejects.toThrow();
  });
});

describe("team.getRankings", () => {
  it("ランキングが配列として返される", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.team.getRankings();
    expect(Array.isArray(result)).toBe(true);
  });

  it("ランキングの各エントリにbingoScore/bowlingScore/totalCombinedScoreが含まれる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.team.getRankings();
    for (const entry of result) {
      expect(entry).toHaveProperty("teamNumber");
      expect(entry).toHaveProperty("bingoScore");
      expect(entry).toHaveProperty("bowlingScore");
      expect(entry).toHaveProperty("totalCombinedScore");
      expect(entry).toHaveProperty("completedLines");
      // totalCombinedScore = bingoScore + bowlingScore
      expect(entry.totalCombinedScore).toBe(entry.bingoScore + entry.bowlingScore);
    }
  });
});

describe("team.updateBowlingScore", () => {
  it("存在しないチームへの更新はNOT_FOUNDエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // チーム10をリセットしてから存在しない状態でテスト
    await caller.admin.resetTeam({ teamNumber: 10, password: VALID_PASSWORD });
    await expect(
      caller.team.updateBowlingScore({ teamNumber: 10, bowlingScore: 150 })
    ).rejects.toThrow();
  });

  it("チームが存在する場合はボウリングスコアを更新できる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // まずビンゴ状態を作成
    await caller.team.updateBingoState({
      teamNumber: 5,
      gridData: "[]",
      markedCells: "[]",
      completedLines: "[]",
      totalScore: 0,
      bowlingScore: 0,
    });
    // ボウリングスコアを更新
    const result = await caller.team.updateBowlingScore({ teamNumber: 5, bowlingScore: 200 });
    expect(result).toEqual({ success: true });
    // 更新後に確認
    const state = await caller.team.getBingoState({ teamNumber: 5 });
    expect(state?.bowlingScore).toBe(200);
  });
});

describe("admin.getAllTeamStates", () => {
  it("正しいパスワードで全チーム状態を取得できる", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.getAllTeamStates({ password: VALID_PASSWORD });
    expect(Array.isArray(result)).toBe(true);
  });

  it("間違ったパスワードでエラー", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.getAllTeamStates({ password: INVALID_PASSWORD })
    ).rejects.toThrow("パスワードが正しくありません");
  });
});

describe("admin.getSharedLayout", () => {
  it("正しいパスワードで共通カード配置を取得できる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.admin.getSharedLayout({ password: VALID_PASSWORD });
    // nullまたはJSON文字列のどちらか
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("間違ったパスワードでエラー", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.admin.getSharedLayout({ password: INVALID_PASSWORD })
    ).rejects.toThrow("パスワードが正しくありません");
  });
});

describe("admin.updateSharedLayout", () => {
  it("正しいパスワードで共通カード配置を更新できる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const testGrid = JSON.stringify([[{ id: "0-0", score: "1|2", marked: false }]]);
    const result = await caller.admin.updateSharedLayout({ password: VALID_PASSWORD, gridData: testGrid });
    expect(result).toEqual({ success: true });

    // 更新後に取得して確認
    const layout = await caller.admin.getSharedLayout({ password: VALID_PASSWORD });
    expect(layout).toBe(testGrid);
  });

  it("間違ったパスワードでエラー", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.admin.updateSharedLayout({ password: INVALID_PASSWORD, gridData: "[]" })
    ).rejects.toThrow("パスワードが正しくありません");
  });
});
