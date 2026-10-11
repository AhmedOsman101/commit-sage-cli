import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Log } from "@/lib/logger.ts";
import ConfigService from "@/services/config.ts";
import type { ProviderRunContext } from "@/services/providerAdapter.ts";
import { defineProvider, registerAdapter } from "@/services/providerAdapter.ts";

/** Gemini 2.5 Pro is the one 2.5 model that cannot switch thinking off. */
const GEMINI_PRO_MIN_THINKING_BUDGET = 128;

function createGoogleModel(ctx: ProviderRunContext) {
  return createGoogleGenerativeAI({ apiKey: ctx.apiKey })(ctx.modelId);
}

/**
 * Leading numeric version of a `gemini-` model id (`gemini-2.5-flash` →
 * 2.5, `gemini-3-flash-preview` → 3); 0 when the id carries no version.
 */
function geminiFamilyVersion(modelId: string): number {
  const match = /gemini-(\d+(?:\.\d+)?)/.exec(modelId);
  return match?.[1] ? Number.parseFloat(match[1]) : 0;
}

/**
 * `thinkingConfig` is family-specific and the API rejects the wrong knob,
 * so gate on the model version rather than sending both:
 *   - Gemini 3.x → `thinkingLevel` (explicit key, else the generic
 *     reasoning level, else `low`; thinking cannot be disabled)
 *   - Gemini 2.5 → `thinkingBudget` (`0` disables, `-1` lets the model
 *     decide, Pro models floor at 128)
 *   - Gemini 2.0, Gemma, anything unparseable → no thinking support,
 *     silently omit.
 *
 * Thinking tokens are drawn from `maxOutputTokens`, so the budget knob is
 * a runaway guard as much as a quality dial.
 */
async function geminiProviderOptions(
  reasoning: string | undefined,
  ctx: ProviderRunContext
) {
  const version = geminiFamilyVersion(ctx.modelId);
  if (version >= 3) {
    const configured = await ConfigService.resolveProviderValue(
      ctx.provider,
      ctx.modelId,
      "thinkingLevel"
    );
    const level =
      (typeof configured === "string" ? configured : undefined) ??
      reasoning ??
      "low";
    Log.debug(`[geminiThinking] model=${ctx.modelId} thinkingLevel="${level}"`);
    return {
      google: {
        thinkingConfig: {
          thinkingLevel: level,
        },
      },
    };
  }
  if (version >= 2.5) {
    const raw = await ConfigService.resolveProviderValue(
      ctx.provider,
      ctx.modelId,
      "thinkingBudget"
    );
    const budget =
      typeof raw === "number" && Number.isFinite(raw) ? Math.trunc(raw) : 0;
    if (budget < 0) {
      Log.debug(
        `[geminiThinking] model=${ctx.modelId} thinkingBudget=-1 (model decides)`
      );
      return {
        google: {
          thinkingConfig: {
            thinkingBudget: -1,
          },
        },
      };
    }
    const floor = ctx.modelId.includes("pro")
      ? GEMINI_PRO_MIN_THINKING_BUDGET
      : 0;
    const effective = Math.max(budget, floor);
    Log.debug(
      `[geminiThinking] model=${ctx.modelId} thinkingBudget=${effective}`
    );
    return {
      google: {
        thinkingConfig: {
          thinkingBudget: effective,
        },
      },
    };
  }
  return;
}

const geminiAdapter = defineProvider({
  name: "gemini",
  createModel: createGoogleModel,
  providerOptions: geminiProviderOptions,
});

registerAdapter(geminiAdapter);

export { geminiAdapter };
