#! /usr/bin/env node

require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const { program } = require("commander");

/***************/
/* CLI OPTIONS */
program
  .version("1.0.0")
  .argument("<message>", "the message")
  .option(
    "-d, --debug" /* flags */,
    "output debug information" /* description */,
    false /* default value */
  )
  .option("-s, --stream", "stream text or not", false)
  .option(
    "-t, --temperature <temperature>",
    "temperature longer longer argument",
    parseFloat,
    1
  )
  .option(
    "-p, --presence-penalty <present-penalty>",
    "presence argument",
    parseFloat,
    1
  )
  .option(
    "-f, --frequency-penalty <frequency-penalty>",
    "frequency argument",
    parseFloat,
    1
  );
/* arguments originate from node */
program.parse(process.argv);
const flags = program.opts();
const { debug, stream, temperature, presencePenalty, frequencyPenalty } = flags;
const args = program.args;
const message = args.join(" ");
if (flags.debug) {
  console.log("#### DEBUG START: ");
  console.log("# OPTIONS:");
  console.log(flags);
  console.log("# ARGUMENTS:");
  console.log(args);
  console.log("# MESSAGE:");
  console.log(message);
  console.log("#### DEBUG END.\n");
}

/*******************/
/* NETWORK REQUEST */

async function chat({
  message,
  stream,
  temperature,
  presencePenalty,
  frequencyPenalty,
}) {
  const output = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: message }],
    stream: stream,
    temperature: temperature,
    presence_penalty: presencePenalty,
    frequency_penalty: frequencyPenalty,
  });
  console.log(output.data.choices[0].message.content); /* log to STDOUT */
  return output;
}
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
chat({
  message,
  stream,
  temperature,
  presencePenalty,
  frequencyPenalty,
  debug,
});
