// Builds the worked insurance flow. All companies, people and prices are fictional.
// List the products with their scope, quote a cat, quote an older dog that gets no
// offer and a pet outside the scope, have the customer validate the answers, get
// binding offers, then apply for the cat.
import type {
  AnswerSource,
  AnswerSources,
  Answers,
  ApplicationOutcome,
  ApplicationTerms,
  ContactConsent,
  CoverLimit,
  CoverSummary,
  Declaration,
  DeliveredDocument,
  DateTimeString,
  EvidenceRecord,
  InsuranceDocument,
  NeedsAssessment,
  Offer,
  Operation,
  Party,
  Product,
  ProductOption,
  ProviderRef,
  QuestionSet,
  QuestionSetRef,
  UnderwritingScope,
  ValidationOutcome,
  ValidationTerms,
} from "../schema";
import { canonicalSha256, sha256 } from "./canonical";
import { examplePath, type ExampleName, type Examples } from "./example-files";

async function write<K extends ExampleName>(name: K, data: Examples[K]): Promise<void> {
  await Bun.write(examplePath(name), JSON.stringify(data, null, 2) + "\n");
}

function delivered(documents: InsuranceDocument[], deliveredAt: DateTimeString): DeliveredDocument[] {
  return documents.map((document) => ({
    document_id: document.document_id,
    version: document.version,
    sha256: document.sha256,
    delivered_at: deliveredAt,
  }));
}

/** Every answer comes from the customer. */
function allFromCustomer(answers: Answers): AnswerSources {
  return Object.fromEntries(Object.keys(answers).map((key) => [key, fromCustomer]));
}

/* Distributor */

const insurer: ProviderRef = {
  name: "Example Mutual",
  legal_name: "Example Mutual Assurances SA",
  role: "insurer",
  domain: "mutual.example.com",
  lei: "EXAMPLEMUTUAL0000042",
  licences: [
    {
      country: "FR",
      regulator: "ACPR",
      register: "REGAFI",
      identifier_type: "lei",
      identifier: "EXAMPLEMUTUAL0000042",
      role: "insurer",
      verification_url: "https://www.regafi.fr/",
    },
  ],
};

await write("insurance-01-get_distributor.result", {
  legal_name: "Example Pets SAS",
  trading_name: "Example Pets",
  domain: "pets.example.com",
  roles: ["broker"],
  licences: [
    {
      country: "FR",
      regulator: "ACPR",
      register: "ORIAS",
      identifier_type: "orias_number",
      identifier: "00000000",
      role: "broker",
      categories: ["COA"],
      verification_url: "https://www.orias.fr/",
    },
  ],
  countries: ["FR"],
  complaints_url: "https://pets.example.com/complaints",
  aip: {
    version: "0.1",
    conformance_level: 3,
    interfaces: ["tools"],
    lines: ["pet"],
    countries: ["FR"],
    can_conclude: false,
  },
});

/* Products and their scope */

const vetCosts70: CoverLimit = {
  key: "vet_costs_per_year",
  label: "Frais vétérinaires par an",
  limit: { amount: "1500.00", currency: "EUR" },
  reimbursement_rate: 0.7,
};
const cover70: CoverSummary = {
  included: ["Accident", "Illness", "Surgery"],
  limits: [vetCosts70],
  excess: { amount: "0.00", currency: "EUR" },
  main_exclusions: ["Pre-existing conditions"],
  waiting_period_days: 45,
};
const prevention: ProductOption = {
  key: "prevention",
  label: "Forfait prévention",
  price: { amount: { amount: "3.00", currency: "EUR" }, period: "month", taxes_included: true },
};

const scope: UnderwritingScope = {
  version: "2026-09",
  geography: { countries: ["FR"] },
  insured: [{ family: "pet", kinds: ["cat", "dog"] }],
  conditions: [
    "The pet lives with the subscriber, in France.",
    "The pet is identified by a microchip or a tattoo.",
    "Not for a dog of category 1 or 2 under French law (attack, guard and defence dogs).",
    "Not for a pet kept for breeding or for professional use.",
  ],
};
const product: Product = {
  product_id: "pet-fr-essentiel",
  name: "Essentiel",
  line: "pet",
  provider: insurer,
  underwriting_scope: scope,
  summary: "Pays back the vet costs of a cat or a dog after an accident or an illness, at 70% or 90%.",
  details: { cover: cover70, options: [prevention] },
  subscription_paths: ["application", "handoff"],
};

await write("insurance-02-list_products.params", { country: "FR", insured_family: "pet" });
await write("insurance-03-list_products.result", { products: [product] });

/* Documents and question set */

const ipid: InsuranceDocument = {
  document_id: "doc-ipid-pet-fr",
  type: "ipid",
  title: "IPID Example Pets Essentiel",
  language: "fr",
  version: "2026-09",
  url: "https://pets.example.com/docs/ipid-essentiel-2026-09.pdf",
  media_type: "application/pdf",
  sha256: sha256("ipid-essentiel-2026-09"),
  required_before_commitment: true,
};
const generalConditions: InsuranceDocument = {
  document_id: "doc-cg-pet-fr",
  type: "general_conditions",
  title: "Conditions générales",
  language: "fr",
  version: "2026-09",
  url: "https://pets.example.com/docs/cg-2026-09.pdf",
  media_type: "application/pdf",
  sha256: sha256("cg-2026-09"),
  required_before_commitment: true,
};

await write("insurance-04-get_documents.result", { documents: [ipid, generalConditions] });

const questionSet: QuestionSet = {
  question_set_id: "qs-pet-fr-essentiel",
  version: "3",
  product_id: product.product_id,
  line: "pet",
  profile: "pet@0.1",
  answers_schema: {
    type: "object",
    properties: {
      country: { type: "string", pattern: "^[A-Z]{2}$", "x-profile-key": "country" },
      postal_code: { type: "string", "x-profile-key": "postal_code", "x-ask": "What is your postal code?" },
      species: { type: "string", enum: ["dog", "cat"], "x-profile-key": "species" },
      pet_name: { type: "string", "x-profile-key": "pet_name" },
      breed: { type: "string", "x-profile-key": "breed" },
      sex: { type: "string", enum: ["female", "male"], "x-profile-key": "sex" },
      is_neutered: { type: "boolean", "x-profile-key": "is_neutered" },
      date_of_birth: { type: "string", format: "date", "x-profile-key": "date_of_birth" },
      lifestyle: { type: "string", enum: ["indoor", "outdoor"], "x-profile-key": "lifestyle" },
      currently_insured: { type: "boolean", "x-ask": "Is your pet insured with another company today?" },
      microchip_number: {
        type: "string",
        "x-collected-by": "distributor_page",
        description: "Collected on the distributor's page after the quote.",
      },
    },
    required: [
      "country",
      "postal_code",
      "species",
      "pet_name",
      "breed",
      "sex",
      "is_neutered",
      "date_of_birth",
      "currently_insured",
    ],
  },
};

await write("insurance-05-get_question_set.result", { question_set: questionSet });

/* Indicative quote. Camille gives most answers. The agent reads the breed from
   her photo, and her vet clinic gives the date of birth. */

const questionSetRef: QuestionSetRef = { question_set_id: questionSet.question_set_id, version: questionSet.version };
const fromCustomer: AnswerSource = { origin: "customer", validated_by_customer: true };
const partialAnswers = { country: "FR", postal_code: "69003", species: "cat", pet_name: "Miso", breed: "European shorthair" };
const partialSources: AnswerSources = {
  country: fromCustomer,
  postal_code: fromCustomer,
  species: fromCustomer,
  pet_name: fromCustomer,
  breed: { origin: "agent", validated_by_customer: false },
};

await write("insurance-06-quote.params.partial", {
  product_id: product.product_id,
  question_set: questionSetRef,
  answers: partialAnswers,
  answer_sources: partialSources,
  language: "fr",
});

await write("insurance-07-quote.result.needs_input", {
  status: "needs_input",
  quote_request_id: "qr-7f3a",
  missing_fields: [
    { field: "sex", issue: "missing" },
    { field: "is_neutered", issue: "missing" },
    { field: "date_of_birth", issue: "missing", message: "An approximate date is fine." },
    { field: "currently_insured", issue: "missing" },
  ],
});

const answers = {
  ...partialAnswers,
  sex: "female",
  is_neutered: true,
  date_of_birth: "2023-04-01",
  lifestyle: "indoor",
  currently_insured: false,
};
const sources: AnswerSources = {
  ...partialSources,
  sex: fromCustomer,
  is_neutered: fromCustomer,
  date_of_birth: { origin: "third_party", validated_by_customer: false, source_name: "veterinary clinic record (FR)" },
  lifestyle: fromCustomer,
  currently_insured: fromCustomer,
};

await write("insurance-08-quote.params.complete", {
  product_id: product.product_id,
  question_set: questionSetRef,
  answers,
  answer_sources: sources,
  language: "fr",
});

function offers(ids: [string, string], indicative: boolean): [Offer, Offer] {
  const offer70: Offer = {
    offer_id: ids[0],
    product_id: product.product_id,
    tier: "Essentiel 70",
    provider: insurer,
    underwriting_scope_version: scope.version,
    indicative,
    pricing: {
      premium: { amount: { amount: "14.90", currency: "EUR" }, period: "month", taxes_included: true },
      alternative_premiums: [{ amount: { amount: "171.00", currency: "EUR" }, period: "year", taxes_included: true }],
      cover: cover70,
      options: [prevention],
      start_date: "2026-11-01",
    },
    valid_until: "2026-11-19T23:59:59+01:00",
    subscription_paths: ["application", "handoff"],
    handoff_url: `https://pets.example.com/q/${ids[0]}`,
  };
  const offer90: Offer = {
    ...offer70,
    offer_id: ids[1],
    tier: "Essentiel 90",
    handoff_url: `https://pets.example.com/q/${ids[1]}`,
    pricing: {
      ...offer70.pricing,
      premium: { amount: { amount: "21.40", currency: "EUR" }, period: "month", taxes_included: true },
      alternative_premiums: [{ amount: { amount: "246.00", currency: "EUR" }, period: "year", taxes_included: true }],
      cover: {
        ...cover70,
        limits: [{ ...vetCosts70, limit: { amount: "2500.00", currency: "EUR" }, reimbursement_rate: 0.9 }],
      },
    },
  };
  return [offer70, offer90];
}

await write("insurance-09-quote.result.indicative", {
  status: "complete",
  quote_request_id: "qr-7f3a",
  question_set: questionSetRef,
  answers_sha256: canonicalSha256(answers),
  answer_sources_sha256: canonicalSha256(sources),
  offers: offers(["of-3c81", "of-3c82"], true),
});

/* Two quotes with no offer */

const olderDogAnswers = {
  country: "FR",
  postal_code: "69003",
  species: "dog",
  pet_name: "Rocky",
  breed: "Labrador retriever",
  sex: "male",
  is_neutered: true,
  date_of_birth: "2015-06-01",
  currently_insured: false,
};

await write("insurance-10-quote.result.no_offer", {
  status: "complete",
  quote_request_id: "qr-8b21",
  question_set: questionSetRef,
  answers_sha256: canonicalSha256(olderDogAnswers),
  answer_sources_sha256: canonicalSha256(allFromCustomer(olderDogAnswers)),
  offers: [],
  no_offer: {
    reason_code: "age_not_accepted",
    message: "Example Mutual does not start cover for a dog older than 9 years.",
  },
});

// An agent that follows the rules does not send this quote, because the
// geography of the scope excludes Belgium. The server refuses it anyway.
const outsideScopeAnswers = {
  country: "BE",
  postal_code: "1000",
  species: "cat",
  pet_name: "Pixel",
  breed: "Maine Coon",
  sex: "male",
  is_neutered: true,
  date_of_birth: "2022-02-10",
  lifestyle: "indoor",
  currently_insured: false,
};

await write("insurance-11-quote.result.outside_scope", {
  status: "complete",
  quote_request_id: "qr-4e07",
  question_set: questionSetRef,
  answers_sha256: canonicalSha256(outsideScopeAnswers),
  answer_sources_sha256: canonicalSha256(allFromCustomer(outsideScopeAnswers)),
  offers: [],
  no_offer: {
    reason_code: "outside_underwriting_scope",
    message: "Essentiel covers pets that live in France. Pixel lives in Belgium.",
  },
});

/* Validation of the answers */

await write("insurance-12-validate_answers.params", {
  product_id: product.product_id,
  question_set: questionSetRef,
  answers,
  answer_sources: sources,
  language: "en",
});

const validationTerms: ValidationTerms = {
  product_id: product.product_id,
  question_set: questionSetRef,
  answers,
  answer_sources: sources,
  answers_sha256: canonicalSha256(answers),
  answer_sources_sha256: canonicalSha256(sources),
};
const validationProposed: Operation<ValidationTerms> = {
  operation_id: "op-2d71",
  revision: 1,
  state: "proposed",
  summary:
    "Check Miso's answers before Example Mutual gives a firm price. " +
    "You said: lives in France, postal code 69003, a female cat named Miso, spayed, stays indoors, not insured today. " +
    "Your assistant read the breed from your photo, and you have not checked it yet: European shorthair. " +
    "Your vet clinic's record gives the date of birth, and you have not checked it yet: 1 April 2023. " +
    "If an answer is false, Example Mutual can refuse to pay a claim or cancel the cover.",
  terms: validationTerms,
  expires_at: "2026-10-20T10:30:00+02:00",
  user_approval_required: true,
  url: "https://pets.example.com/ops/op-2d71",
  confirmation: null,
  result: null,
};

await write("insurance-13-validate_answers.result.proposed", { operation: validationProposed });

const validationConfirmedAt = "2026-10-20T10:04:10+02:00";
const validationOutcome = {
  validation: {
    operation_id: validationProposed.operation_id,
    revision: validationProposed.revision,
    validated_at: validationConfirmedAt,
    answers_sha256: validationTerms.answers_sha256,
    answer_sources_sha256: validationTerms.answer_sources_sha256,
  },
} satisfies ValidationOutcome;
const validation = validationOutcome.validation;
const { expires_at: _validationExpiry, ...validationWithoutExpiry } = validationProposed;

await write("insurance-14-operation.validation.succeeded", {
  operation: {
    ...validationWithoutExpiry,
    state: "succeeded",
    confirmation: { revision: 1, approved_by: "user", confirmed_at: validationConfirmedAt },
    result: { summary: "Camille Martin validated the answers for Miso.", data: validationOutcome },
  },
});

/* Binding quote */

await write("insurance-15-quote.params.validated", {
  product_id: product.product_id,
  question_set: questionSetRef,
  answers,
  answer_sources: sources,
  validation,
  language: "fr",
});

const [binding70, binding90] = offers(["of-5d10", "of-5d11"], false);

await write("insurance-16-quote.result.binding", {
  status: "complete",
  quote_request_id: "qr-7f3a",
  question_set: questionSetRef,
  answers_sha256: canonicalSha256(answers),
  answer_sources_sha256: canonicalSha256(sources),
  validation,
  offers: [binding70, binding90],
});

/* Application */

const parties: Party[] = [
  {
    party_ref: "p1",
    kind: "person",
    roles: ["subscriber", "insured", "payer"],
    display_name: "Camille Martin",
    country_of_residence: "FR",
  },
];
const declaration: Declaration = {
  question_set: questionSetRef,
  answers,
  answer_sources: sources,
  answers_sha256: canonicalSha256(answers),
  answer_sources_sha256: canonicalSha256(sources),
  accuracy_confirmed: true,
  validation,
};
const needs: NeedsAssessment = {
  kind: "demands_and_needs",
  statement: "Cover vet bills for an indoor cat, with a budget under 20 EUR a month.",
  advice_given: false,
  recorded_at: "2026-10-20T10:02:00+02:00",
};
const documentsDelivered = delivered([ipid, generalConditions], "2026-10-20T10:03:00+02:00");
const consent: ContactConsent = {
  channels: ["email"],
  details_collected_by: "distributor_page",
  providers_may_contact: false,
  purposes: ["this_application"],
};

await write("insurance-17-submit_application.params", {
  offer_id: binding70.offer_id,
  parties,
  declaration,
  needs_assessment: needs,
  documents_delivered: documentsDelivered,
  contact_consent: consent,
  start_date: "2026-11-01",
});

const terms: ApplicationTerms = {
  offer_id: binding70.offer_id,
  product_id: binding70.product_id,
  provider: insurer,
  pricing: binding70.pricing,
  options: [],
  start_date: "2026-11-01",
  parties,
  declaration,
  needs_assessment: needs,
  documents_delivered: documentsDelivered,
  contact_consent: consent,
  withdrawal_period_days: 14,
};
const proposed: Operation<ApplicationTerms> = {
  operation_id: "op-51c2",
  revision: 1,
  state: "proposed",
  summary:
    "Apply for Essentiel 70 cat insurance for Miso with Example Mutual, 14.90 EUR a month from 1 November 2026. You finish on Example Pets' site.",
  terms,
  expires_at: "2026-10-20T11:00:00+02:00",
  user_approval_required: true,
  url: "https://pets.example.com/ops/op-51c2",
  confirmation: null,
  result: null,
};

await write("insurance-18-submit_application.result.proposed", { operation: proposed });

const evidence: EvidenceRecord = {
  record_id: "ev-90aa",
  operation_id: proposed.operation_id,
  revision: 1,
  approved_by: "user",
  confirmed_at: "2026-10-20T10:05:12+02:00",
  documents_delivered: documentsDelivered,
  question_set: questionSetRef,
  answers_sha256: declaration.answers_sha256,
  answer_sources_sha256: declaration.answer_sources_sha256,
  validation,
  underwriting_scope_version: binding70.underwriting_scope_version,
  needs_assessment: needs,
  contact_consent: consent,
  terms_sha256: canonicalSha256(terms),
};
const outcome = {
  application_id: "app-3310",
  evidence,
  handoff_url: "https://pets.example.com/a/app-3310",
} satisfies ApplicationOutcome;
const { expires_at: _expiresAt, ...proposedWithoutExpiry } = proposed;

await write("insurance-19-operation.application.succeeded", {
  operation: {
    ...proposedWithoutExpiry,
    state: "succeeded",
    confirmation: { revision: 1, approved_by: "user", confirmed_at: evidence.confirmed_at },
    result: { summary: "Application received. Camille finishes on Example Pets' site.", data: outcome },
  },
});

console.log("examples written");
