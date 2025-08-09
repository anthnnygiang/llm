export type OpenAIChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type AnthropicChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GoogleChatMessage = {
  role: "user" | "assistant";
  parts: string;
};
