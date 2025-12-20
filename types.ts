export type OpenAIChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GoogleChatMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};
