/**
 * Client-safe AI settings types + defaults. Lives separate from
 * app/actions/ai-settings.ts because Next 16's "use server" files can
 * only export async functions — exporting a const object from there
 * silently fails the production build with "module has no exports".
 */

export type AIModelId =
  // OpenAI via AI Gateway
  | "openai/gpt-5"
  | "openai/gpt-5-mini"
  | "openai/gpt-5-nano"
  // Anthropic via AI Gateway
  | "anthropic/claude-opus-4-7"
  | "anthropic/claude-sonnet-4-6"
  | "anthropic/claude-haiku-4-5"

export type AISettings = {
  model: AIModelId
  contextScope: "full" | "operational" | "minimal"
  voiceTone: "direct" | "coaching" | "concise" | "custom"
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  model: "openai/gpt-5-mini",
  contextScope: "full",
  voiceTone: "direct",
}

export const ALLOWED_AI_MODELS: AIModelId[] = [
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "anthropic/claude-opus-4-7",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-haiku-4-5",
]
