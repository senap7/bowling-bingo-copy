import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type PublicUser = null;

function createPublicContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: null as PublicUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("team.getBingoState", () => {
  it("returns null for a new team", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // 新しいチーム（5）のデータを取得
    const result = await caller.team.getBingoState({ teamNumber: 5 });

    // 最初はnullが返される（またはデータベースに存在しない）
    expect(result).toBeNull();
  });

  it("validates team number range", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // チーム番号が範囲外の場合はエラー
    try {
      await caller.team.getBingoState({ teamNumber: 11 });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });
});

describe("team.updateBingoState", () => {
  it("creates and updates team bingo state", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const teamNumber = 1;

    // テスト用のグリッドデータ
    const gridData = JSON.stringify([
      [
        { id: "0-0", score: "1|1", marked: false },
        { id: "0-1", score: "2|1", marked: false },
        { id: "0-2", score: "3|1", marked: false },
        { id: "0-3", score: "4|1", marked: false },
        { id: "0-4", score: "5|1", marked: false },
      ],
      [
        { id: "1-0", score: "1|2", marked: false },
        { id: "1-1", score: "2|2", marked: false },
        { id: "1-2", score: "3|2", marked: false },
        { id: "1-3", score: "4|2", marked: false },
        { id: "1-4", score: "5|2", marked: false },
      ],
      [
        { id: "2-0", score: "1|3", marked: false },
        { id: "2-1", score: "2|3", marked: false },
        { id: "2-2", score: "▶︎◀︎", marked: false },
        { id: "2-3", score: "4|3", marked: false },
        { id: "2-4", score: "5|3", marked: false },
      ],
      [
        { id: "3-0", score: "1|4", marked: false },
        { id: "3-1", score: "2|4", marked: false },
        { id: "3-2", score: "3|4", marked: false },
        { id: "3-3", score: "4|4", marked: false },
        { id: "3-4", score: "5|4", marked: false },
      ],
      [
        { id: "4-0", score: "1|5", marked: false },
        { id: "4-1", score: "2|5", marked: false },
        { id: "4-2", score: "3|5", marked: false },
        { id: "4-3", score: "4|5", marked: false },
        { id: "4-4", score: "5|5", marked: false },
      ],
    ]);

    const markedCells = JSON.stringify({
      "0-0": false,
      "0-1": false,
      "0-2": false,
      "0-3": false,
      "0-4": false,
      "1-0": false,
      "1-1": false,
      "1-2": false,
      "1-3": false,
      "1-4": false,
      "2-0": false,
      "2-1": false,
      "2-2": false,
      "2-3": false,
      "2-4": false,
      "3-0": false,
      "3-1": false,
      "3-2": false,
      "3-3": false,
      "3-4": false,
      "4-0": false,
      "4-1": false,
      "4-2": false,
      "4-3": false,
      "4-4": false,
    });

    const completedLines = JSON.stringify([]);

    // チーム状態を更新
    const updateResult = await caller.team.updateBingoState({
      teamNumber,
      gridData,
      markedCells,
      completedLines,
      totalScore: 0,
    });

    expect(updateResult).toEqual({ success: true });

    // 更新後、データを取得して確認
    const getResult = await caller.team.getBingoState({ teamNumber });

    expect(getResult).not.toBeNull();
    expect(getResult?.teamNumber).toBe(teamNumber);
    expect(getResult?.totalScore).toBe(0);
    expect(getResult?.completedLines).toEqual([]);
  });

  it("updates existing team state", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const teamNumber = 2;

    // 初回更新
    const gridData = JSON.stringify([]);
    const markedCells = JSON.stringify({});
    const completedLines = JSON.stringify([]);

    await caller.team.updateBingoState({
      teamNumber,
      gridData,
      markedCells,
      completedLines,
      totalScore: 0,
    });

    // 2回目の更新（スコア変更）
    const updateResult = await caller.team.updateBingoState({
      teamNumber,
      gridData,
      markedCells,
      completedLines: JSON.stringify(["row-0"]),
      totalScore: 6,
    });

    expect(updateResult).toEqual({ success: true });

    // 更新後のデータを確認
    const getResult = await caller.team.getBingoState({ teamNumber });

    expect(getResult?.totalScore).toBe(6);
    expect(getResult?.completedLines).toEqual(["row-0"]);
  });

  it("validates team number range on update", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.team.updateBingoState({
        teamNumber: 11,
        gridData: "[]",
        markedCells: "{}",
        completedLines: "[]",
        totalScore: 0,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });
});
