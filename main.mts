#!/usr/bin/env node
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import readline from "node:readline"; /* interactive prompt */
import os from "node:os"; /* detect platform */
import { spawnSync } from "node:child_process"; /* copy to clipboard */
import { Option, program } from "commander"; /* CLI framework */
import chalk from "chalk"; /* terminal colors */

import type { OpenAIChatMessage, GoogleChatMessage } from "./types";

export const OPENAI_API_KEY = getEnv("OPENAI_CLI");
export const GOOGLE_API_KEY = getEnv("GOOGLE_CLI");

const PROVIDER_MODELS = {
  openai: "gpt-5-mini",
  google: "gemini-2.5-flash",
} as const;
type Provider = keyof typeof PROVIDER_MODELS;
type Model = (typeof PROVIDER_MODELS)[Provider];
const PROVIDERS = Object.keys(PROVIDER_MODELS) as Provider[];
const MODELS = Object.values(PROVIDER_MODELS) as Model[];

/***************/
/* cli options */

program.addOption(
  new Option("-p, --provider <provider>", "model provider")
    .choices(PROVIDERS)
    .default(PROVIDERS[0]), // default model
);
program.addOption(new Option("-d, --debug", "enable debug log"));

program.addHelpText(
  "after",
  `
Prompt:
  For multiline input, use ^^^ (triple carat) to signal the start and end.

  .provider          log the current provider
  .model             log the current model
  .system            log the current system prompt
  .out               copy history to clipboard
  .new               clear history
  .help              show this help message
  `,
);
program.showHelpAfterError();
program.parse(process.argv);

const { provider, debug } = program.opts<{
  provider: Provider;
  debug?: boolean;
}>();
const modelName = PROVIDER_MODELS[provider];
const system = "Answer concisely.";

/* model providers */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const google = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

let openAIHistory: OpenAIChatMessage[];
let googleHistory: GoogleChatMessage[];

let multiline = false; /* multiline input flag */
let multilineBuffer = ""; /* buffer for multiline input */

/**********************/
/* initialize history */

function initialize() {
  openAIHistory = [];
  googleHistory = [];
}

/**********************/
/* interactive prompt */

const userPrompt = chalk.cyan("? ");
const llmPrompt = chalk.green("> ");
const breakPrompt = chalk.green(". . .\n");
const smoothDelay = 2; /* ms delay for smooth typing effect */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: userPrompt,
});

let message: string; /* current line input */
initialize();
rl.prompt();
rl.on("line", async (line) => {
  if (line.trim() === "^^^") {
    // flip multiline state
    multiline = !multiline;
    if (multiline) {
      /* start multiline input */
      multilineBuffer = ""; /* reset multiline buffer */
      rl.setPrompt(`".. "`);
      rl.setPrompt(`${chalk.cyan("..")}`);
      rl.prompt();
      return;
    } else {
      /* end multiline input */
      line = multilineBuffer; /* use accumulated multiline input */
      rl.setPrompt(userPrompt);
    }
  }
  if (multiline) {
    /* middle of multiline input */
    multilineBuffer += line + "\n";
    rl.prompt();
    return;
  }

  switch (line.trim()) {
    case "":
      /* empty line */
      break;
    case ".help":
      /* show help */
      program.outputHelp();
      break;
    case ".provider":
      /* log current provider */
      process.stdout.write(`${chalk.yellow("system:")} ${provider}\n`);
      break;
    case ".model":
      /* log current model */
      process.stdout.write(`${chalk.yellow("system:")} ${modelName}\n`);
      break;
    case ".system":
      /* log current system prompt */
      process.stdout.write(`${chalk.yellow("system:")} ${system}\n`);
      break;
    case ".out":
      copyToClipboard();
      break;
    case ".new":
      /* clear history */
      initialize();
      process.stdout.write(`${chalk.yellow("system:")} cleared history\n`);
      break;
    default:
      message = line;
      await chat();
      // push history inside chat fn
      break;
  }
  rl.prompt();
}).on("close", () => {
  /* ctrl-c/d */
  process.stdout.write(`\n${chalk("system:")} done\n`);
  process.exit(0);
});

/********/
/* chat */

async function chat() {
  process.stdout.write(llmPrompt);
  switch (provider) {
    case "openai":
      openAIHistory.push({
        role: "user",
        content: message,
      });
      const response = await OpenAIChat();
      openAIHistory.push(response);
      break;
    case "google":
      googleHistory.push({
        role: "user",
        parts: [{ text: message }],
      });
      const googleResponse = await GoogleChat();
      googleHistory.push(googleResponse);
      break;
    default:
      process.stdout.write(`${chalk.red("error:")} model provider not found\n`);
      process.exit(1);
  }
  process.stdout.write(breakPrompt); // spacing
}

/**********************/
/* openai api request */

async function OpenAIChat(): Promise<OpenAIChatMessage> {
  try {
    const stream = await openai.responses.create({
      instructions: system,
      model: modelName,
      input: openAIHistory,
      stream: true,
    });
    let fullContent = "";
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        const chunk = event.delta;
        for (const char of chunk) {
          process.stdout.write(`${char}`);
          await sleep(smoothDelay); // smooth typing effect
        }
        fullContent += chunk;
      }
    }
    process.stdout.write(`\n`); // prompt will overwrite last line otherwise
    return {
      role: "assistant",
      content: fullContent,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    process.stderr.write(
      `${chalk.red("error:")} openai request failed: ${err.message}\n`,
    );

    throw error;
  }
}

/**********************/
/* google api request */

async function GoogleChat(): Promise<GoogleChatMessage> {
  try {
    const response = await google.models.generateContentStream({
      model: modelName,
      config: {
        systemInstruction: system,
      },
      contents: googleHistory,
    });
    let fullContent = "";
    for await (const chunk of response) {
      if (!chunk.text) {
        continue;
      }
      for (const char of chunk.text) {
        process.stdout.write(`${char}`);
        await sleep(smoothDelay); // smooth typing effect
      }
      fullContent += chunk.text;
    }
    process.stdout.write(`\n`); // prompt will overwrite last line otherwise
    return {
      role: "model",
      parts: [{ text: fullContent }],
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    process.stderr.write(
      `${chalk.red("error:")} google request failed: ${err.message}\n`,
    );

    throw error;
  }
}

/*********************/
/* copy to clipboard */

function copyToClipboard() {
  const merged = [...openAIHistory, ...googleHistory];
  const text = JSON.stringify(merged, null, 2);
  switch (os.platform()) {
    case "darwin" /* macOS */:
      spawnSync("pbcopy", { input: text });
      break;
    case "linux" /* Linux */:
      spawnSync("xclip", ["-selection", "clipboard"], { input: text });
      break;
    case "win32" /* Windows */:
      spawnSync("clip", { input: text });
      break;
    default:
      process.stdout.write(`${chalk.red("error:")} unsupported platform\n`);
  }
}

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    process.stderr.write(
      `${chalk.red("error:")} environment variable ${key} is required\n`,
    );
    process.exit(1);
  }
  return val;
}

/* Sleep for some time */
async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
