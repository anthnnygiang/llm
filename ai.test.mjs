import { expect, test } from "vitest";
import { OpenAI } from "openai";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  OpenAIChat,
  AnthropicChat,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
} from "./ai.mjs";

test.concurrent("openAI API working?", async () => {
  /* arrange */
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const model = "o4-mini";
  const system = "You are a helpful assistant. Answer concisely.";
  const user = "Is this thing on?";
  const messages = [];
  messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });
  const temperature = 1;

  /* act */
  const response = await OpenAIChat(openai, model, messages, temperature);

  /* assert */
  expect(response).toHaveProperty("role", "assistant");
  expect(response).toHaveProperty("content");
});

test.concurrent("Anthropic API working?", async () => {
  /* arrange */
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const model = "claude-3-7-sonnet-latest";
  const temperature = 1;
  const system = "You are a helpful assistant. Answer concisely.";
  const user = "Is this thing on?";
  const messages = [];
  messages.push({ role: "user", content: user });

  /* act */
  const response = await AnthropicChat(
    anthropic,
    model,
    temperature,
    system,
    messages,
  );

  /* assert */
  expect(response).toHaveProperty("role", "assistant");
  expect(response).toHaveProperty("content");
});
