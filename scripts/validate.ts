// Checks the examples against schema.json, then checks the MUST rules that a
// JSON Schema cannot express. This is the seed of the conformance tests.
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { join } from "node:path";
import { PROFILES } from "../profiles";
import type {
  AnswerSources,
  Answers,
  ApplicationOutcome,
  ListProductsParams,
  Product,
  QuoteParams,
  QuoteResult,
  UnderwritingScope,
  ValidationOutcome,
} from "../schema";
import { canonicalJson, canonicalSha256 } from "./canonical";
import { EXAMPLE_DEFINITIONS, readExample, type ExampleName } from "./example-files";

const schema = await Bun.file(join(import.meta.dir, "..", "schema.json")).json();
const draft07 = new Ajv({ allErrors: true, strict: false });
addFormats(draft07);
draft07.addSchema(schema, "aip");
const draft2020 = new Ajv2020({ allErrors: true, strict: false });
addFormats(draft2020);

let failures = 0;

function check(passed: boolean, message: string): void {
  console.log(`${passed ? "PASS" : "FAIL"}  ${message}`);
  if (!passed) failures++;
}

/** Validates data against one definition of schema.json. */
function matchesDefinition(definition: string, data: unknown): { valid: boolean; errors: string } {
  const validator = draft07.getSchema(`aip#/definitions/${definition}`);
  if (!validator) throw new Error(`schema.json has no definition ${definition}`);
  const valid = validator(data) === true;
  return { valid, errors: valid ? "" : ` ${JSON.stringify(validator.errors?.slice(0, 3))}` };
}

function quoted(params: QuoteParams): Extract<QuoteParams, { answers: Answers }> {
  if (!("answers" in params)) throw new Error("quote params have no answers");
  return params;
}

function completed(result: QuoteResult): Extract<QuoteResult, { status: "complete" }> {
  if (result.status !== "complete") throw new Error(`quote result is ${result.status}, not complete`);
  return result;
}

function same(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function sameKeys(answers: Answers, sources: AnswerSources): boolean {
  return same(Object.keys(answers).sort(), Object.keys(sources).sort());
}

/**
 * The part of the structured scope that the answers fall outside, or null when
 * they fit. The line profile says which answer gives the kind. An answer that
 * is not there yet fits.
 */
function outsideScope(scope: UnderwritingScope, line: string, answers: Answers): string | null {
  const country = answers["country"];
  if (typeof country === "string" && !scope.geography.countries.includes(country)) return `country ${country}`;
  const profile = PROFILES.find((candidate) => candidate.line === line);
  if (!profile) return null;
  const type = scope.insured.find((candidate) => candidate.family === profile.insured_family);
  if (!type) return `family ${profile.insured_family}`;
  const kind = profile.kind_key ? answers[profile.kind_key] : undefined;
  if (typeof kind === "string" && type.kinds && !type.kinds.includes(kind)) return `kind ${kind}`;
  return null;
}

function matchesFilters(product: Product, filters: ListProductsParams): boolean {
  const { countries, subdivisions = [] } = product.underwriting_scope.geography;
  if (filters.country && !countries.includes(filters.country)) return false;
  if (filters.subdivision) {
    const country = filters.subdivision.slice(0, 2);
    const listed = subdivisions.filter((code) => code.startsWith(`${country}-`));
    if (!countries.includes(country) || (listed.length > 0 && !listed.includes(filters.subdivision))) return false;
  }
  if (filters.line && product.line !== filters.line) return false;
  const families = product.underwriting_scope.insured.map((type) => type.family);
  return !filters.insured_family || families.includes(filters.insured_family);
}

/* Every example matches its definition in schema.json */

for (const name of Object.keys(EXAMPLE_DEFINITIONS) as ExampleName[]) {
  const definition = EXAMPLE_DEFINITIONS[name];
  const { valid, errors } = matchesDefinition(definition, await readExample(name));
  check(valid, `${name} is a valid ${definition}${errors}`);
}

const filters = await readExample("insurance-02-list_products.params");
const products = (await readExample("insurance-03-list_products.result")).products;
const documents = (await readExample("insurance-04-get_documents.result")).documents;
const questionSet = (await readExample("insurance-05-get_question_set.result")).question_set;
const partialParams = quoted(await readExample("insurance-06-quote.params.partial"));
const completeParams = quoted(await readExample("insurance-08-quote.params.complete"));
const indicativeQuote = completed(await readExample("insurance-09-quote.result.indicative"));
const noOfferQuote = completed(await readExample("insurance-10-quote.result.no_offer"));
const outsideScopeQuote = completed(await readExample("insurance-11-quote.result.outside_scope"));
const validationParams = await readExample("insurance-12-validate_answers.params");
const validationProposed = (await readExample("insurance-13-validate_answers.result.proposed")).operation;
const validationSucceeded = (await readExample("insurance-14-operation.validation.succeeded")).operation;
const validatedParams = quoted(await readExample("insurance-15-quote.params.validated"));
const bindingQuote = completed(await readExample("insurance-16-quote.result.binding"));
const application = (await readExample("insurance-18-submit_application.result.proposed")).operation;
const succeeded = (await readExample("insurance-19-operation.application.succeeded")).operation;

const validationData: unknown = validationSucceeded.result?.data;
const validationCheck = matchesDefinition("ValidationOutcome", validationData);
check(validationCheck.valid, `insurance-14 result.data is a valid ValidationOutcome${validationCheck.errors}`);
const validation = (validationData as ValidationOutcome).validation;

const outcomeData: unknown = succeeded.result?.data;
const outcomeCheck = matchesDefinition("ApplicationOutcome", outcomeData);
check(outcomeCheck.valid, `insurance-19 result.data is a valid ApplicationOutcome${outcomeCheck.errors}`);
const outcome = outcomeData as ApplicationOutcome;

const answers = completeParams.answers;
const sources = completeParams.answer_sources;
const terms = application.terms;
const declaration = terms.declaration;
const quotes = [
  { params: completeParams, result: indicativeQuote },
  { params: validatedParams, result: bindingQuote },
];
const completeQuotes = [indicativeQuote, noOfferQuote, outsideScopeQuote, bindingQuote];
const bindingOffers = completeQuotes.flatMap((quote) => quote.offers).filter((offer) => !offer.indicative);

function productOf(productId: string): Product {
  const product = products.find((candidate) => candidate.product_id === productId);
  if (!product) throw new Error(`list_products has no product ${productId}`);
  return product;
}

/* Rules R1 to R22 */

const brokenProfiles = PROFILES.filter((profile) => {
  try {
    draft2020.compile(profile.answers_schema);
    return false;
  } catch {
    return true;
  }
});
check(brokenProfiles.length === 0, `R1 the ${PROFILES.length} line profiles compile as JSON Schema 2020-12`);

const profile = PROFILES.find((candidate) => candidate.id === questionSet.profile);
const requiredKeys = profile?.answers_schema.required ?? [];
check(
  profile !== undefined && requiredKeys.every((key) => key in questionSet.answers_schema.properties),
  `R2 ${questionSet.question_set_id} has every required question of ${questionSet.profile}`,
);

const matchesQuestionSet = draft2020.compile(questionSet.answers_schema);
check(matchesQuestionSet(answers) === true, `R3 answers match ${questionSet.question_set_id}`);
check(matchesQuestionSet(partialParams.answers) === false, "R3 partial answers do not match, so needs_input is right");

const sensitiveKeys = Object.entries(questionSet.answers_schema.properties)
  .filter(([, property]) => property["x-collected-by"] === "distributor_page")
  .map(([key]) => key);
check(
  sensitiveKeys.every((key) => !(key in answers)),
  `R4 no distributor_page field in agent answers for ${questionSet.question_set_id} (${sensitiveKeys.join(", ")})`,
);

const hashed = [
  ...quotes.map(({ params, result }) => ({ answers: params.answers, sources: params.answer_sources, hashes: result })),
  { answers: validationProposed.terms.answers, sources: validationProposed.terms.answer_sources, hashes: validationProposed.terms },
  { answers: declaration.answers, sources: declaration.answer_sources, hashes: declaration },
];
check(
  hashed.every(
    (item) =>
      item.hashes.answers_sha256 === canonicalSha256(item.answers) &&
      item.hashes.answer_sources_sha256 === canonicalSha256(item.sources),
  ),
  "R5 answers_sha256 and answer_sources_sha256 are the SHA-256 of the canonical answers and sources",
);

const requiredDocuments = documents.filter((document) => document.required_before_commitment);
check(
  requiredDocuments.every((document) =>
    terms.documents_delivered.some(
      (item) =>
        item.document_id === document.document_id && item.version === document.version && item.sha256 === document.sha256,
    ),
  ),
  "R6 every required document was delivered, same version and digest",
);
check(declaration.accuracy_confirmed, "R7 accuracy confirmed before the proposal");
check(
  application.user_approval_required && validationProposed.user_approval_required,
  "R8 the application and the validation need the customer's own approval",
);
check(
  documents.some((document) => document.type === "ipid" && document.required_before_commitment),
  "R9 a non-life insurance product has an IPID required before commitment",
);
check(outcome.evidence.terms_sha256 === canonicalSha256(terms), "R10 evidence terms_sha256 matches the confirmed terms");

check(
  completeQuotes
    .flatMap((quote) => quote.offers)
    .every((offer) => !offer.subscription_paths.includes("handoff") || offer.handoff_url !== undefined),
  "R11 handoff offers carry a handoff_url",
);
check(
  completeQuotes.every((quote) => quote.offers.length > 0 || (quote.no_offer?.reason_code ?? "") !== ""),
  "R12 an empty quote gives a no_offer reason",
);

check(
  products.every((product) => {
    const { countries, subdivisions = [] } = product.underwriting_scope.geography;
    const lineProfile = PROFILES.find((candidate) => candidate.line === product.line);
    const kindQuestion = lineProfile?.kind_key ? lineProfile.answers_schema.properties[lineProfile.kind_key] : undefined;
    const accepted = Array.isArray(kindQuestion?.["enum"]) ? (kindQuestion["enum"] as unknown[]) : undefined;
    const kinds = product.underwriting_scope.insured
      .filter((type) => type.family === lineProfile?.insured_family)
      .flatMap((type) => type.kinds ?? []);
    return (
      subdivisions.every((code) => countries.includes(code.slice(0, 2))) &&
      (accepted === undefined || kinds.every((kind) => accepted.includes(kind)))
    );
  }),
  "R13 each subdivision of a scope is in its countries, and each kind is a value of the profile's kind question",
);
check(
  products.every((product) => matchesFilters(product, filters)),
  `R14 list_products returns only products that match ${JSON.stringify(filters)}`,
);
check(
  quotes.every(
    ({ params, result }) =>
      result.offers.length === 0 ||
      outsideScope(productOf(params.product_id).underwriting_scope, productOf(params.product_id).line, params.answers) === null,
  ) &&
    outsideScopeQuote.offers.length === 0 &&
    outsideScopeQuote.no_offer?.reason_code === "outside_underwriting_scope",
  "R15 offers cover only risks inside the structured scope, and a risk outside it gets outside_underwriting_scope",
);
check(
  [partialParams, completeParams, validatedParams].every((params) => {
    const product = productOf(params.product_id);
    return outsideScope(product.underwriting_scope, product.line, params.answers) === null;
  }),
  "R16 the agent quotes only inside the structured scope of the product",
);
check(
  [
    partialParams,
    completeParams,
    validatedParams,
    validationParams,
    validationProposed.terms,
    declaration,
  ].every((item) => sameKeys(item.answers, item.answer_sources)),
  "R17 every answer has one source, and every source has an answer",
);
check(
  completeQuotes.every((quote) => {
    if (quote.offers.every((offer) => offer.indicative)) return true;
    return (
      quote.validation !== undefined &&
      same(quote.validation, validation) &&
      quote.validation.answers_sha256 === quote.answers_sha256 &&
      quote.validation.answer_sources_sha256 === quote.answer_sources_sha256
    );
  }) && bindingOffers.length > 0,
  "R18 a binding offer comes from a quote with the customer's validation of the same answers and sources",
);
check(
  validationSucceeded.state === "succeeded" &&
    declaration.validation.operation_id === validationSucceeded.operation_id &&
    declaration.validation.revision === validationSucceeded.confirmation?.revision &&
    declaration.validation.validated_at === validationSucceeded.confirmation?.confirmed_at &&
    declaration.validation.answers_sha256 === declaration.answers_sha256 &&
    declaration.validation.answer_sources_sha256 === declaration.answer_sources_sha256,
  "R19 the declaration of the application carries a succeeded validation of the same answers and sources",
);
const appliedOffer = bindingOffers.find((offer) => offer.offer_id === terms.offer_id);
check(
  outcome.evidence.answer_sources_sha256 === canonicalSha256(declaration.answer_sources) &&
    same(outcome.evidence.validation, declaration.validation) &&
    appliedOffer !== undefined &&
    outcome.evidence.underwriting_scope_version === appliedOffer.underwriting_scope_version &&
    appliedOffer.underwriting_scope_version === productOf(appliedOffer.product_id).underwriting_scope.version,
  "R20 the evidence keeps the hash of the sources, the validation and the scope version of the offer",
);
check(
  bindingOffers.every((offer) => offer.pricing.cover.excess !== undefined && offer.pricing.cover.limits !== undefined),
  "R21 a binding offer gives the excess and the limits of its cover",
);
check(
  appliedOffer !== undefined && same(terms.pricing, appliedOffer.pricing),
  "R22 the pricing of the application is the pricing of its offer",
);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
