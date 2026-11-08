import { it, expect, vi } from "vitest";
import { routeDraft, type Attempt } from "../functions/src/llm";
const providers = [
  { name: "primary", url: "https://a.test", key: "secret", model: "a" },
  { name: "fallback", url: "https://b.test", key: "secret", model: "b" },
];
it("falls back on error and records both attempts without prompts", async () => {
  const events: Attempt[] = [];
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Subjective: synthetic" } }],
          usage: { total_tokens: 42 },
        }),
      ),
    );
  const r = await routeDraft(
    "fictional prompt",
    providers,
    async (a) => {
      events.push(a);
    },
    fetcher,
  );
  expect(r.provider).toBe("fallback");
  expect(events.map((e) => e.status)).toEqual(["failure", "success"]);
  expect(JSON.stringify(events)).not.toContain("fictional prompt");
  expect(events[1].tokens).toBe(42);
  expect(events[1].costUsd).toBeNull();
});
it("rejects empty or malformed responses and exhausted providers", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
  await expect(
    routeDraft("x", providers, async () => {}, fetcher),
  ).rejects.toThrow("unavailable");
});
it("fails closed if telemetry cannot be persisted", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "draft" } }] }),
      ),
    );
  await expect(
    routeDraft(
      "x",
      providers,
      async () => {
        throw new Error("logging failed");
      },
      fetcher,
    ),
  ).rejects.toThrow("logging failed");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
