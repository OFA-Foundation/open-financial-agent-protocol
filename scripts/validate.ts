// Checks the examples against schema.json, then checks the MUST rules that a
// JSON Schema cannot express. This is the seed of the conformance tests.
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { join } from "node:path";
import { PROFILES } from "../profiles";
import type { Answers, ApplicationOutcome, QuoteParams, QuoteResult } from "../schema";
import { canonicalSha256 } from "./canonical";
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

function answersOf(params: QuoteParams): Answers {
  if (!("answers" in params)) throw new Error("quote params have no answers");
  return params.answers;
}

function completed(result: QuoteResult): Extract<QuoteResult, { status: "complete" }> {
  if (result.status !== "complete") throw new Error(`quote result is ${result.status}, not complete`);
  return result;
}

/* Every example matches its definition in schema.json */

for (const name of Object.keys(EXAMPLE_DEFINITIONS) as ExampleName[]) {
  const definition = EXAMPLE_DEFINITIONS[name];
  const { valid, errors } = matchesDefinition(definition, await readExample(name));
  check(valid, `${name} is a valid ${definition}${errors}`);
}

const documents = (await readExample("insurance-02-get_documents.result")).documents;
const questionSet = (await readExample("insurance-03-get_question_set.result")).question_set;
const partialAnswers = answersOf(await readExample("insurance-04-quote.params.partial"));
const answers = answersOf(await readExample("insurance-06-quote.params.complete"));
const quote = completed(await readExample("insurance-07-quote.result.complete"));
const emptyQuote = completed(await readExample("insurance-08-quote.result.no_offer"));
const application = (await readExample("insurance-10-submit_application.result.proposed")).operation;
const succeeded = (await readExample("insurance-11-operation.succeeded")).operation;

const outcomeData: unknown = succeeded.result?.data;
const outcomeCheck = matchesDefinition("ApplicationOutcome", outcomeData);
check(outcomeCheck.valid, `insurance-11 result.data is a valid ApplicationOutcome${outcomeCheck.errors}`);
const outcome = outcomeData as ApplicationOutcome;

/* Rules R1 to R12 */

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
check(matchesQuestionSet(partialAnswers) === false, "R3 partial answers do not match, so needs_input is right");

const sensitiveKeys = Object.entries(questionSet.answers_schema.properties)
  .filter(([, property]) => property["x-collected-by"] === "distributor_page")
  .map(([key]) => key);
check(
  sensitiveKeys.every((key) => !(key in answers)),
  `R4 no distributor_page field in agent answers for ${questionSet.question_set_id} (${sensitiveKeys.join(", ")})`,
);

check(quote.answers_sha256 === canonicalSha256(answers), "R5 answers_sha256 is the SHA-256 of the canonical answers");

const terms = application.terms;
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
check(terms.declaration.accuracy_confirmed, "R7 accuracy confirmed before the proposal");
check(application.user_approval_required, "R8 the application needs the customer's own approval");
check(
  documents.some((document) => document.type === "ipid" && document.required_before_commitment),
  "R9 a non-life insurance product has an IPID required before commitment",
);
check(outcome.evidence.terms_sha256 === canonicalSha256(terms), "R10 evidence terms_sha256 matches the confirmed terms");

check(
  quote.offers.every((offer) => !offer.subscription_paths.includes("handoff") || offer.handoff_url !== undefined),
  "R11 handoff offers carry a handoff_url",
);
check(
  emptyQuote.offers.length > 0 || (emptyQuote.no_offer?.reason_code ?? "") !== "",
  "R12 an empty quote gives a no_offer reason",
);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
