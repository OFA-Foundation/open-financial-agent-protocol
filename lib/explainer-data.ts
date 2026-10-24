// The figures and payloads that the explainer shows. The AIP values come
// from the worked example, so that the animation and the spec cannot disagree.
// The PAP values (poppy.json, the Session Token) follow PAP draft 0.2.
import type { Examples, ExampleName } from "../scripts/example-files";
import { EXTENSION_ID, TOOLS, type ApplicationOutcome, type Money, type Offer, type QuoteResult, type ToolName } from "../schema";
import { highlightJsonHtml } from "./markdown";
import { readRepoJson } from "./schema-source";

/** One line of a payload, as highlighted HTML. `mark` sets off the lines that the step is about. */
export interface CodeLine {
  html: string;
  mark: boolean;
}

/** An excerpt of a message. `path` names the object that `lines` shows. */
export interface Payload {
  path: string;
  lines: CodeLine[];
}

export type PayloadId =
  | "poppy"
  | "token"
  | "distributor"
  | "documents"
  | "questions"
  | "needsInput"
  | "complete"
  | "operation"
  | "confirm"
  | "evidence";

export interface ExplainerData {
  customer: string;
  pet: string;
  /** What the customer says, built from the answers of the worked example. */
  firstMessage: string;
  secondMessage: string;
  distributor: { name: string; domain: string; role: string; register: string; identifier: string; level: number };
  /** The tools that the distributor's level requires, in level order. */
  tools: ToolName[];
  documents: { title: string; version: string }[];
  questionSet: { version: string; questions: number };
  partialAnswers: number;
  fullAnswers: number;
  missing: string[];
  offers: { tier: string; price: string; cover: string }[];
  insurer: string;
  operation: { id: string; revision: number; summary: string; price: string; start: string; withdrawal: string };
  evidenceId: string;
  handoff: string;
  /** The first characters of the Session Token, as PAP writes it in its examples. */
  sessionToken: string;
  /** Params of the calls, on one line. */
  params: { product: string; application: string; confirm: string };
  payloads: Record<PayloadId, Payload>;
}

function example<K extends ExampleName>(name: K): Examples[K] {
  return readRepoJson<Examples[K]>(`examples/${name}.json`);
}

function short(sha: string): string {
  return `${sha.slice(0, 8)}…`;
}

function money(value: Money): string {
  return `${value.amount} ${value.currency}`;
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function completed(result: QuoteResult): Offer[] {
  if (result.status !== "complete") throw new Error("the worked example has no complete quote");
  return result.offers;
}

/* Payload excerpts. The key MORE prints as "…", for the fields
   that the excerpt leaves out. A value fits on one line when the line stays
   within WIDTH characters, or when its key is in `inline`. */

const MORE = "…";
const WIDTH = 66;

function oneLine(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(oneLine).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).map(([key, item]) => (key === MORE ? MORE : `${JSON.stringify(key)}: ${oneLine(item)}`));
    return entries.length ? `{ ${entries.join(", ")} }` : "{}";
  }
  return JSON.stringify(value);
}

function pretty(value: unknown, inline: Set<string>, indent = "", prefix = "", key = ""): string[] {
  const single = `${indent}${prefix}${oneLine(value)}`;
  if (value === null || typeof value !== "object" || single.length <= WIDTH || inline.has(key)) return [single];
  const isArray = Array.isArray(value);
  const entries: [string, unknown][] = isArray ? value.map((item) => ["", item]) : Object.entries(value);
  const lines = [`${indent}${prefix}${isArray ? "[" : "{"}`];
  entries.forEach(([childKey, child], index) => {
    if (childKey === MORE) {
      lines.push(`${indent}  ${MORE}`);
      return;
    }
    const childLines = pretty(child, inline, `${indent}  `, isArray ? "" : `${JSON.stringify(childKey)}: `, childKey);
    const next = entries[index + 1];
    if (next) childLines[childLines.length - 1] += ",";
    lines.push(...childLines);
  });
  lines.push(`${indent}${isArray ? "]" : "}"}`);
  return lines;
}

function payload(path: string, value: unknown, mark: string[] = [], inline: string[] = []): Payload {
  const lines = pretty(value, new Set(inline)).map((line) => ({
    html: highlightJsonHtml(line),
    mark: mark.some((key) => line.includes(`"${key}":`)),
  }));
  return { path, lines };
}

export function explainerData(): ExplainerData {
  const distributor = example("insurance-01-get_distributor.result");
  const licence = distributor.licences[0];
  if (!licence) throw new Error("the worked example has no licence");
  const documents = example("insurance-02-get_documents.result").documents;
  const questionSet = example("insurance-03-get_question_set.result").question_set;
  const partial = example("insurance-04-quote.params.partial");
  const needsInput = example("insurance-05-quote.result.needs_input");
  const complete = example("insurance-06-quote.params.complete");
  const quoted = example("insurance-07-quote.result.complete");
  const offers = completed(quoted);
  const operation = example("insurance-10-submit_application.result.proposed").operation;
  const succeeded = example("insurance-11-operation.succeeded").operation;
  const outcomeData: unknown = succeeded.result?.data;
  const outcome = outcomeData as ApplicationOutcome | undefined;
  if (!outcome || !succeeded.confirmation || !succeeded.result) throw new Error("the worked example has no evidence record");
  if (!("answers" in partial) || !("answers" in complete)) throw new Error("the worked example quotes without answers");
  if (needsInput.status !== "needs_input") throw new Error("the worked example has no needs_input quote");

  const terms = operation.terms;
  const party = terms.parties[0];
  const answers = complete.answers;
  const text = (key: string) => String(answers[key] ?? "");
  const country = new Intl.DisplayNames(["en"], { type: "region" }).of(text("country")) ?? text("country");
  const female = text("sex") === "female";
  const domain = distributor.domain;
  const level = distributor.aip.conformance_level;
  const firstOffer = offers[0];
  if (!firstOffer) throw new Error("the worked example has no offer");
  const productId = firstOffer.product_id;
  const sessionToken = "eyJhbGciOi…";
  const evidence = outcome.evidence;

  return {
    customer: party?.display_name.split(" ")[0] ?? "The customer",
    pet: text("pet_name"),
    firstMessage: `Please insure ${text("pet_name")}, my ${text("breed")} ${text("species")}. We live in ${text("postal_code")}, ${country}, and I want vet bills covered for under 20 EUR a month.`,
    secondMessage: [
      `${female ? "Female" : "Male"}, ${answers["is_neutered"] ? "neutered" : "not neutered"}, born ${longDate(text("date_of_birth"))}.`,
      `${female ? "She" : "He"} ${text("lifestyle") === "indoor" ? "stays indoors" : "goes outdoors"}`,
      answers["currently_insured"] ? "and is insured today." : "and has no insurance yet.",
    ].join(" "),
    distributor: {
      name: distributor.trading_name ?? distributor.legal_name,
      domain,
      role: distributor.roles.join(", "),
      register: licence.register,
      identifier: licence.identifier,
      level,
    },
    tools: (Object.keys(TOOLS) as ToolName[]).filter(
      (tool) => TOOLS[tool].level <= level && !(tool === "conclude" && !distributor.aip.can_conclude),
    ),
    documents: documents.map((document) => ({ title: document.title, version: document.version })),
    questionSet: { version: questionSet.version, questions: Object.keys(questionSet.answers_schema.properties).length },
    partialAnswers: Object.keys(partial.answers).length,
    fullAnswers: Object.keys(answers).length,
    missing: needsInput.missing_fields.map((field) => field.field),
    offers: offers.map((offer) => {
      const limit = offer.pricing.cover.limits?.[0];
      const rate = limit?.reimbursement_rate;
      return {
        tier: offer.tier ?? offer.offer_id,
        price: `${money(offer.pricing.premium.amount)} a ${offer.pricing.premium.period}`,
        cover: limit?.limit && rate ? `${Math.round(rate * 100)}% of vet bills, up to ${money(limit.limit)} a year` : "",
      };
    }),
    insurer: firstOffer.provider.name,
    operation: {
      id: operation.operation_id,
      revision: operation.revision,
      summary: operation.summary,
      price: `${money(terms.pricing.premium.amount)} a ${terms.pricing.premium.period}`,
      start: longDate(terms.start_date ?? ""),
      withdrawal: `${terms.withdrawal_period_days ?? 0} days`,
    },
    evidenceId: evidence.record_id,
    handoff: outcome.handoff_url.replace(/^https:\/\//, ""),
    sessionToken,
    params: {
      product: oneLine({ product_id: productId }),
      application: oneLine({ offer_id: firstOffer.offer_id, [MORE]: 0 }),
      confirm: oneLine({ revision: succeeded.confirmation.revision, approved_by: succeeded.confirmation.approved_by }),
    },
    payloads: {
      poppy: payload(
        "poppy.json",
        {
          apis: [{ type: "mcp", url: `https://${domain}/mcp` }],
          extensions: {
            operations: { version: "1", endpoint: `https://${domain}/poppy/operations` },
            [EXTENSION_ID]: {
              version: distributor.aip.version,
              conformance_level: level,
              lines: distributor.aip.lines,
              [MORE]: 0,
            },
          },
          [MORE]: 0,
        },
        ["type", "endpoint", "conformance_level"],
      ),
      token: payload(
        "Token response",
        { access_token: sessionToken, token_type: "DPoP", expires_in: 3600, scope: "", session_id: "ses_2Lm0", signed_in: false },
        ["token_type", "signed_in"],
      ),
      distributor: payload(
        "structuredContent",
        {
          legal_name: distributor.legal_name,
          roles: distributor.roles,
          licences: [
            {
              country: licence.country,
              regulator: licence.regulator,
              register: licence.register,
              identifier: licence.identifier,
              role: licence.role,
              [MORE]: 0,
            },
          ],
          complaints_url: distributor.complaints_url,
          [MORE]: 0,
        },
        ["regulator", "register", "identifier"],
      ),
      documents: payload(
        "structuredContent",
        {
          documents: documents.map((document, index) =>
            index === 0
              ? {
                  type: document.type,
                  title: document.title,
                  version: document.version,
                  sha256: short(document.sha256),
                  required_before_commitment: document.required_before_commitment,
                  [MORE]: 0,
                }
              : { type: document.type, version: document.version, [MORE]: 0 },
          ),
        },
        ["version", "sha256", "required_before_commitment"],
      ),
      questions: payload(
        "structuredContent.question_set",
        {
          question_set_id: questionSet.question_set_id,
          version: questionSet.version,
          profile: questionSet.profile,
          answers_schema: {
            properties: {
              species: { enum: questionSet.answers_schema.properties["species"]?.["enum"], [MORE]: 0 },
              date_of_birth: { format: "date", [MORE]: 0 },
              [MORE]: 0,
              microchip_number: {
                type: "string",
                "x-collected-by": questionSet.answers_schema.properties["microchip_number"]?.["x-collected-by"],
              },
            },
            required: questionSet.answers_schema.required,
          },
        },
        ["x-collected-by"],
        ["required"],
      ),
      needsInput: payload("structuredContent", needsInput, ["status", "field"]),
      complete: payload(
        "structuredContent",
        {
          status: quoted.status,
          answers_sha256: "answers_sha256" in quoted ? short(quoted.answers_sha256) : "",
          offers: offers.map((offer, index) =>
            index === 0
              ? {
                  offer_id: offer.offer_id,
                  tier: offer.tier,
                  provider: { name: offer.provider.name, role: offer.provider.role },
                  pricing: { premium: { amount: offer.pricing.premium.amount, period: offer.pricing.premium.period, [MORE]: 0 } },
                  [MORE]: 0,
                }
              : { offer_id: offer.offer_id, [MORE]: 0 },
          ),
        },
        ["status", "answers_sha256", "amount"],
      ),
      operation: payload(
        "structuredContent.operation",
        {
          operation_id: operation.operation_id,
          revision: operation.revision,
          state: operation.state,
          terms: {
            offer_id: terms.offer_id,
            parties: [{ roles: party?.roles, [MORE]: 0 }],
            declaration: { answers_sha256: short(terms.declaration.answers_sha256), accuracy_confirmed: terms.declaration.accuracy_confirmed, [MORE]: 0 },
            needs_assessment: { kind: terms.needs_assessment.kind, [MORE]: 0 },
            documents_delivered: terms.documents_delivered.map((document) => ({ document_id: document.document_id, [MORE]: 0 })),
            withdrawal_period_days: terms.withdrawal_period_days,
            [MORE]: 0,
          },
          user_approval_required: operation.user_approval_required,
          [MORE]: 0,
        },
        ["revision", "state", "user_approval_required"],
        ["parties", "documents_delivered"],
      ),
      confirm: payload(
        "Operation",
        {
          operation_id: succeeded.operation_id,
          revision: succeeded.revision,
          state: succeeded.state,
          confirmation: succeeded.confirmation,
          result: {
            summary: succeeded.result.summary,
            data: { application_id: outcome.application_id, evidence: { record_id: evidence.record_id, [MORE]: 0 }, handoff_url: outcome.handoff_url },
          },
          [MORE]: 0,
        },
        ["state", "approved_by"],
      ),
      evidence: payload(
        "result.data.evidence",
        {
          record_id: evidence.record_id,
          revision: evidence.revision,
          approved_by: evidence.approved_by,
          confirmed_at: evidence.confirmed_at,
          documents_delivered: evidence.documents_delivered.map((document) => ({ document_id: document.document_id, sha256: short(document.sha256) })),
          question_set: evidence.question_set,
          answers_sha256: short(evidence.answers_sha256),
          needs_assessment: { kind: evidence.needs_assessment.kind, [MORE]: 0 },
          contact_consent: { channels: evidence.contact_consent.channels, [MORE]: 0 },
          terms_sha256: short(evidence.terms_sha256),
        },
        ["sha256", "answers_sha256", "terms_sha256"],
      ),
    },
  };
}
