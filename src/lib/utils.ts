import { wrapThrowable } from "lib-result";

const JsonParse = wrapThrowable(
  (
    text: string,
    reviver?: (this: any, key: string, value: any) => any
  ): any => {
    return JSON.parse(text, reviver);
  }
);
const JsonStringify = wrapThrowable(JSON.stringify);
const Encoder = new TextEncoder();
const Decoder = new TextDecoder();

export { Decoder, Encoder, JsonParse, JsonStringify };
