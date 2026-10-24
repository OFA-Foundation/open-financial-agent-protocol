import { join } from "node:path";
import type {
  GetDistributorResult,
  GetDocumentsResult,
  GetQuestionSetResult,
  ListProductsParams,
  ListProductsResult,
  QuoteParams,
  QuoteResult,
  SubmitApplicationParams,
  SubmitApplicationResult,
  ValidateAnswersParams,
  ValidateAnswersResult,
} from "../schema";
import type {
  GetCountryRulesParams,
  GetCountryRulesResult,
  SearchDistributorsParams,
  SearchDistributorsResult,
  VerifyLicenceParams,
  VerifyLicenceResult,
} from "../registry";

export const EXAMPLES_DIR = join(import.meta.dir, "..", "examples");

/** Each example file, by name, with the schema type it must match. */
export interface Examples {
  "insurance-01-get_distributor.result": GetDistributorResult;
  "insurance-02-list_products.params": ListProductsParams;
  "insurance-03-list_products.result": ListProductsResult;
  "insurance-04-get_documents.result": GetDocumentsResult;
  "insurance-05-get_question_set.result": GetQuestionSetResult;
  "insurance-06-quote.params.partial": QuoteParams;
  "insurance-07-quote.result.needs_input": QuoteResult;
  "insurance-08-quote.params.complete": QuoteParams;
  "insurance-09-quote.result.indicative": QuoteResult;
  "insurance-10-quote.result.no_offer": QuoteResult;
  "insurance-11-quote.result.outside_scope": QuoteResult;
  "insurance-12-validate_answers.params": ValidateAnswersParams;
  "insurance-13-validate_answers.result.proposed": ValidateAnswersResult;
  "insurance-14-operation.validation.succeeded": ValidateAnswersResult;
  "insurance-15-quote.params.validated": QuoteParams;
  "insurance-16-quote.result.binding": QuoteResult;
  "insurance-17-submit_application.params": SubmitApplicationParams;
  "insurance-18-submit_application.result.proposed": SubmitApplicationResult;
  "insurance-19-operation.application.succeeded": SubmitApplicationResult;
  "registry-01-get_country_rules.params": GetCountryRulesParams;
  "registry-02-get_country_rules.result": GetCountryRulesResult;
  "registry-03-search_distributors.params": SearchDistributorsParams;
  "registry-04-search_distributors.result": SearchDistributorsResult;
  "registry-05-verify_licence.params.licensed": VerifyLicenceParams;
  "registry-06-verify_licence.result.licensed": VerifyLicenceResult;
  "registry-07-verify_licence.params.no_licence": VerifyLicenceParams;
  "registry-08-verify_licence.result.no_licence": VerifyLicenceResult;
  "registry-09-verify_licence.params.lapsed": VerifyLicenceParams;
  "registry-10-verify_licence.result.lapsed": VerifyLicenceResult;
  "registry-11-verify_licence.params.provider": VerifyLicenceParams;
  "registry-12-verify_licence.result.provider": VerifyLicenceResult;
}

export type ExampleName = keyof Examples;

/** The `schema.json` definition that each example file must match. */
export const EXAMPLE_DEFINITIONS: { [K in ExampleName]: string } = {
  "insurance-01-get_distributor.result": "GetDistributorResult",
  "insurance-02-list_products.params": "ListProductsParams",
  "insurance-03-list_products.result": "ListProductsResult",
  "insurance-04-get_documents.result": "GetDocumentsResult",
  "insurance-05-get_question_set.result": "GetQuestionSetResult",
  "insurance-06-quote.params.partial": "QuoteParams",
  "insurance-07-quote.result.needs_input": "QuoteResult",
  "insurance-08-quote.params.complete": "QuoteParams",
  "insurance-09-quote.result.indicative": "QuoteResult",
  "insurance-10-quote.result.no_offer": "QuoteResult",
  "insurance-11-quote.result.outside_scope": "QuoteResult",
  "insurance-12-validate_answers.params": "ValidateAnswersParams",
  "insurance-13-validate_answers.result.proposed": "ValidateAnswersResult",
  "insurance-14-operation.validation.succeeded": "ValidateAnswersResult",
  "insurance-15-quote.params.validated": "QuoteParams",
  "insurance-16-quote.result.binding": "QuoteResult",
  "insurance-17-submit_application.params": "SubmitApplicationParams",
  "insurance-18-submit_application.result.proposed": "SubmitApplicationResult",
  "insurance-19-operation.application.succeeded": "SubmitApplicationResult",
  "registry-01-get_country_rules.params": "GetCountryRulesParams",
  "registry-02-get_country_rules.result": "GetCountryRulesResult",
  "registry-03-search_distributors.params": "SearchDistributorsParams",
  "registry-04-search_distributors.result": "SearchDistributorsResult",
  "registry-05-verify_licence.params.licensed": "VerifyLicenceParams",
  "registry-06-verify_licence.result.licensed": "VerifyLicenceResult",
  "registry-07-verify_licence.params.no_licence": "VerifyLicenceParams",
  "registry-08-verify_licence.result.no_licence": "VerifyLicenceResult",
  "registry-09-verify_licence.params.lapsed": "VerifyLicenceParams",
  "registry-10-verify_licence.result.lapsed": "VerifyLicenceResult",
  "registry-11-verify_licence.params.provider": "VerifyLicenceParams",
  "registry-12-verify_licence.result.provider": "VerifyLicenceResult",
};

export function examplePath(name: ExampleName): string {
  return join(EXAMPLES_DIR, `${name}.json`);
}

/** Reads an example file. The caller validates it against `schema.json` before it relies on the type. */
export async function readExample<K extends ExampleName>(name: K): Promise<Examples[K]> {
  return (await Bun.file(examplePath(name)).json()) as Examples[K];
}
