import { wrapThrowable } from "lib-result";

const JsonParse = wrapThrowable(JSON.parse);
const JsonStringify = wrapThrowable(JSON.stringify);
const Encoder = new TextEncoder();
const Decoder = new TextDecoder();

export { Decoder, Encoder, JsonParse, JsonStringify };
