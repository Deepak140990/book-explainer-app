import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: `# Atomic Habits - Complete Summary

## Book ka Parichay
"Atomic Habits" James Clear ne likhi hai. Yeh book 2018 mein release hui. Isme author samjhata hai ki kaise small habits se bade changes aa sakte hain.

## Main Theme
Chhoti chhoti habits ke through apne aap ko transform kar sakte ho.

## Key Lessons
- 1% daily improvement se bade results milte hain
- Habit stacking se naye habits easy ban jaate hain
- Environment design se habits automatic ban jaati hain
- Identity-based habits sabse powerful hote hain

## Real-life Example
Agar aap har din 1% better ban jaao, to ek saal mein 37x better ban jaoge!`,
        },
      },
    ],
  })),
}));

function createContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("bookExplainer.getSummary", () => {
  it("should generate a summary for a valid book name", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bookExplainer.getSummary({
      bookName: "Atomic Habits",
    });

    expect(result).toBeDefined();
    expect(result.bookName).toBe("Atomic Habits");
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary).toContain("Atomic Habits");
  });

  it("should trim whitespace from book name", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bookExplainer.getSummary({
      bookName: "  Rich Dad Poor Dad  ",
    });

    expect(result.bookName).toBe("Rich Dad Poor Dad");
  });

  it("should reject empty book name", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.bookExplainer.getSummary({
        bookName: "",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should reject book name with only whitespace", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.bookExplainer.getSummary({
        bookName: "   ",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should reject book name exceeding max length", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const longName = "a".repeat(501);

    try {
      await caller.bookExplainer.getSummary({
        bookName: longName,
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should return summary with markdown content", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bookExplainer.getSummary({
      bookName: "The Alchemist",
    });

    expect(result.summary).toContain("#");
    expect(result.summary).toContain("-");
  });

  it("should normalize LLM response to string", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bookExplainer.getSummary({
      bookName: "Think and Grow Rich",
    });

    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
