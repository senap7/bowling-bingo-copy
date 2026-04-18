import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "google",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

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

describe("admin.resetTeam", () => {
  it("管理者でないユーザーはFORBIDDENエラーになる", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.resetTeam({ teamNumber: 1 })).rejects.toThrow();
  });

  it("未認証ユーザーはエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.admin.resetTeam({ teamNumber: 1 })).rejects.toThrow();
  });
});

describe("admin.resetAllTeams", () => {
  it("管理者でないユーザーはFORBIDDENエラーになる", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.resetAllTeams()).rejects.toThrow();
  });

  it("未認証ユーザーはエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.admin.resetAllTeams()).rejects.toThrow();
  });
});

describe("admin.getAllTeamStates", () => {
  it("管理者でないユーザーはFORBIDDENエラーになる", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.getAllTeamStates()).rejects.toThrow();
  });

  it("未認証ユーザーはエラーになる", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.admin.getAllTeamStates()).rejects.toThrow();
  });
});
