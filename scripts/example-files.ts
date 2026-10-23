import { join } from "node:path";
import type {
  GetDistributorResult,
  GetDocumentsResult,
  GetQuestionSetResult,
  QuoteParams,
  QuoteResult,
  SubmitApplicationParams,
  SubmitApplicationResult,
} from "../schema";

export const EXAMPLES_DIR = join(import.meta.dir, "..", "examples");

/** Each example file, by name, with the schema type it must match. */
export interface Examples {
  "insurance-01-get_distributor.result": GetDistributorResult;
  "insurance-02-get_documents.result": GetDocumentsResult;
  "insurance-03-get_question_set.result": GetQuestionSetResult;
  "insurance-04-quote.params.partial": QuoteParams;
  "insurance-05-quote.result.needs_input": QuoteResult;
  "insurance-06-quote.params.complete": QuoteParams;
  "insurance-07-quote.result.complete": QuoteResult;
  "insurance-08-quote.result.no_offer": QuoteResult;
  "insurance-09-submit_application.params": SubmitApplicationParams;
  "insurance-10-submit_application.result.proposed": SubmitApplicationResult;
  "insurance-11-operation.succeeded": SubmitApplicationResult;
}

export type ExampleName = keyof Examples;

/** The `schema.json` definition that each example file must match. */
export const EXAMPLE_DEFINITIONS: { [K in ExampleName]: string } = {
  "insurance-01-get_distributor.result": "GetDistributorResult",
  "insurance-02-get_documents.result": "GetDocumentsResult",
  "insurance-03-get_question_set.result": "GetQuestionSetResult",
  "insurance-04-quote.params.partial": "QuoteParams",
  "insurance-05-quote.result.needs_input": "QuoteResult",
  "insurance-06-quote.params.complete": "QuoteParams",
  "insurance-07-quote.result.complete": "QuoteResult",
  "insurance-08-quote.result.no_offer": "QuoteResult",
  "insurance-09-submit_application.params": "SubmitApplicationParams",
  "insurance-10-submit_application.result.proposed": "SubmitApplicationResult",
  "insurance-11-operation.succeeded": "SubmitApplicationResult",
};

export function examplePath(name: ExampleName): string {
  return join(EXAMPLES_DIR, `${name}.json`);
}

/** Reads an example file. The caller validates it against `schema.json` before it relies on the type. */
export async function readExample<K extends ExampleName>(name: K): Promise<Examples[K]> {
  return (await Bun.file(examplePath(name)).json()) as Examples[K];
}
