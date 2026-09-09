import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";
import { getOrCreateBookMetadata, formatBookMetadata } from "./bookMetadata";
import { getDb } from "./db";
import { books, savedSummaries, userSubscriptions, subscriptionPlans } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const BOOK_SUMMARY_SYSTEM_PROMPT = `Tu ek expert book explainer hai jo kisi bhi book ki summary deta hai — simple Hinglish mein (Hindi + English mix), jaise koi dost samjha raha ho.

Jab user koi book ka naam de, to tu:

1. **Book ka Parichay** — 2-3 lines mein book kya hai, kisne likhi, kab aayi.

2. **Main Theme / Core Idea** — Book ka sabse bada message kya hai? Ek line mein pakad.

3. **Chapter-wise / Part-wise Summary** — Har bade topic ko clearly explain kar. Asaan examples use kar jaise real-life situations, relatable analogies.

4. **Key Lessons** (kam se kam 5) — Bullet points mein, simple language mein.

5. **Visual Diagrams / Frameworks** — Jab bhi concept samjhaane ke liye visual help kare, to ASCII art ya structured text diagram use kar. Jaise:
   - Mind maps
   - Flowcharts (text-based)
   - Comparison tables
   - Before/After examples
   - Step-by-step processes

6. **Real-life Examples** — Har major concept ke liye ek real-life example do jo Indian context mein relatable ho.

7. **Quotes** — Book ki 2-3 most powerful quotes (real quotes jo book mein likhi hoon).

8. **Book Padhne Ki Zaroorat Hai Ya Nahi?** — Honest recommendation: kisko padhni chahiye, kisko nahi.

9. **Ek Line Mein Book** — Poori book ko ek powerful sentence mein summarize kar.

IMPORTANT RULES:
- Language: Hinglish (Hindi + English mix) — natural, conversational
- Tone: Dost jaisa, not formal
- Examples: Real, relatable, mostly Indian context
- Content: SIRF book mein likhi baatein — kuch bhi add mat kar jo book mein nahi
- Visual elements: Text-based diagrams, tables, emoji use karo to make it engaging
- Length: Comprehensive — reader ko lagey ki unhone puri book padh li

Format response in proper Markdown with headers, bullets, tables, and code blocks for diagrams.`;

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

  feedback: router({
    submitFeedback: publicProcedure
      .input(z.object({
        name: z.string().min(1, "Name is required").max(100),
        email: z.string().email("Valid email is required"),
        message: z.string().min(10, "Message must be at least 10 characters").max(2000),
      }))
      .mutation(async ({ input }) => {
        try {
          console.log("[Feedback] Received:", input);
          
          return {
            success: true,
            message: "Feedback bhej diya gaya! Shukriya! 🙏",
          };
        } catch (error) {
          console.error("[Feedback] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Feedback bhejne mein problem aa gayi. Please dobara try karo.",
          });
        }
      }),
  }),

  bookExplainer: router({
    getSummary: publicProcedure
      .input(z.object({
        bookName: z.string().min(1, "Book name is required").max(500),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!input.bookName.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Book name cannot be empty",
          });
        }

        try {
          // Check user subscription if authenticated
          if (ctx.user) {
            const db = await getDb();
            if (db) {
              const userSub = await db
                .select()
                .from(userSubscriptions)
                .where(eq(userSubscriptions.userId, ctx.user.id))
                .limit(1);

              if (userSub.length > 0) {
                const sub = userSub[0];
                const plan = await db
                  .select()
                  .from(subscriptionPlans)
                  .where(eq(subscriptionPlans.id, sub.planId))
                  .limit(1);

                if (plan.length > 0 && plan[0].summariesPerDay) {
                  if ((sub.summariesUsedToday || 0) >= plan[0].summariesPerDay) {
                    throw new TRPCError({
                      code: "FORBIDDEN",
                      message: `Aapka daily limit (${plan[0].summariesPerDay}) khatam ho gaya. Kal dobara try karo ya Premium upgrade karo! 💎`,
                    });
                  }
                }
              }
            }
          }

          // Generate summary via LLM
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: BOOK_SUMMARY_SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: `Book ka naam: "${input.bookName.trim()}"\n\nIs book ki complete detail summary do — Hinglish mein, examples aur visuals ke saath. Itna detailed do ki book padhne ki zaroorat na pade.`,
              },
            ],
          });

          const content = response.choices?.[0]?.message?.content;
          
          let summary = "";
          if (typeof content === "string") {
            summary = content;
          } else if (Array.isArray(content)) {
            summary = content
              .map((item: any) => (typeof item === "string" ? item : item.text || ""))
              .join("\n");
          }
          
          if (!summary) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate summary",
            });
          }

          // Fetch book metadata
          const bookMetadata = await getOrCreateBookMetadata(input.bookName.trim());

          // Update usage counter if user is authenticated
          if (ctx.user) {
            const db = await getDb();
            if (db) {
              const userSub = await db
                .select()
                .from(userSubscriptions)
                .where(eq(userSubscriptions.userId, ctx.user.id))
                .limit(1);

              if (userSub.length > 0) {
                await db.update(userSubscriptions)
                  .set({
                    summariesUsedToday: (userSub[0].summariesUsedToday || 0) + 1,
                  })
                  .where(eq(userSubscriptions.id, userSub[0].id));
              }
            }
          }

          return {
            bookName: input.bookName.trim(),
            summary,
            metadata: bookMetadata ? formatBookMetadata(bookMetadata) : null,
          };
        } catch (error) {
          console.error("[BookExplainer] Error generating summary:", error);
          
          if (error instanceof TRPCError) {
            throw error;
          }

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Kuch gadbad ho gayi! Please dobara try karo. 😅",
          });
        }
      }),

    saveSummary: protectedProcedure
      .input(z.object({
        bookTitle: z.string().min(1).max(255),
        summary: z.string().min(1),
        bookId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          await db.insert(savedSummaries).values({
            userId: ctx.user.id,
            bookId: input.bookId || null,
            bookTitle: input.bookTitle,
            summary: input.summary,
          });

          return {
            success: true,
            message: "Summary save ho gaya! 📚",
          };
        } catch (error) {
          console.error("[SaveSummary] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Summary save nahi ho saka",
          });
        }
      }),

    getSavedSummaries: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          const db = await getDb();
          if (!db) return [];

          const saved = await db
            .select()
            .from(savedSummaries)
            .where(eq(savedSummaries.userId, ctx.user.id));

          return saved;
        } catch (error) {
          console.error("[GetSavedSummaries] Error:", error);
          return [];
        }
      }),

    deleteSavedSummary: protectedProcedure
      .input(z.object({
        summaryId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          await db.delete(savedSummaries)
            .where(
              and(
                eq(savedSummaries.id, input.summaryId),
                eq(savedSummaries.userId, ctx.user.id)
              )
            );

          return {
            success: true,
            message: "Summary delete ho gaya",
          };
        } catch (error) {
          console.error("[DeleteSavedSummary] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Summary delete nahi ho saka",
          });
        }
      }),
  }),

  subscription: router({
    getCurrentPlan: publicProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          return {
            planName: "Free",
            summariesPerDay: 5,
            features: ["5 summaries/day", "Basic summaries"],
            isFreeTier: true,
          };
        }

        try {
          const db = await getDb();
          if (!db) {
            return {
              planName: "Free",
              summariesPerDay: 5,
              features: ["5 summaries/day", "Basic summaries"],
              isFreeTier: true,
            };
          }

          const userSub = await db
            .select()
            .from(userSubscriptions)
            .where(eq(userSubscriptions.userId, ctx.user.id))
            .limit(1);

          if (userSub.length === 0) {
            return {
              planName: "Free",
              summariesPerDay: 5,
              features: ["5 summaries/day", "Basic summaries"],
              isFreeTier: true,
            };
          }

          const plan = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, userSub[0].planId))
            .limit(1);

          if (plan.length === 0) {
            return {
              planName: "Free",
              summariesPerDay: 5,
              features: ["5 summaries/day", "Basic summaries"],
              isFreeTier: true,
            };
          }

          return {
            planName: plan[0].name,
            summariesPerDay: plan[0].summariesPerDay,
            summariesUsedToday: userSub[0].summariesUsedToday || 0,
            features: plan[0].features?.split(",") || [],
            isFreeTier: plan[0].price === 0,
          };
        } catch (error) {
          console.error("[GetCurrentPlan] Error:", error);
          return {
            planName: "Free",
            summariesPerDay: 5,
            features: ["5 summaries/day", "Basic summaries"],
            isFreeTier: true,
          };
        }
      }),

    getPlans: publicProcedure
      .query(async () => {
        try {
          const db = await getDb();
          if (!db) return [];

          const plans = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.isActive, 1));

          return plans.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            currency: p.currency,
            summariesPerDay: p.summariesPerDay,
            features: p.features?.split(",") || [],
          }));
        } catch (error) {
          console.error("[GetPlans] Error:", error);
          return [];
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
