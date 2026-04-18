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

  it("ランキングの各エントリに必要なフィールドが含まれる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.team.getRankings();
    for (const entry of result) {
      expect(entry).toHaveProperty("teamNumber");
      expect(entry).toHaveProperty("totalScore");
      expect(entry).toHaveProperty("completedLines");
    }
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
