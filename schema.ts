/**
 * Agentic Insurance Protocol (AIP): schema, draft 0.1
 *
 * AIP defines how an AI agent finds, prices and subscribes to an insurance
 * product with any distributor, and what evidence each step leaves. Draft 0.1
 * covers the sale only. Servicing after the sale comes in a later draft.
 *
 * This file is the source of truth. `schema.json` is generated from it. Do not
 * edit `schema.json` by hand.
 *
 * AIP is an extension on top of two protocols:
 * - MCP (https://modelcontextprotocol.io/specification/2026-07-28) carries every
 *   call. Each tool in this file is an MCP tool. Results go in
 *   `structuredContent`, with a short plain-text summary in `content`.
 * - PAP (https://personalagentprotocol.org/docs/0.2/spec) carries the customer's
 *   session and every action with a business effect, through its `operations`
 *   extension. AIP defines only the insurance `terms` of those operations.
 *
 * The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
 * "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" are to be
 * read as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they
 * appear in all capitals.
 *
 * Status: DRAFT 0.1. A later draft MAY break compatibility with this one until 1.0.
 *
 * Inputs for this draft: the MCP tools of a pet insurer (FR, DE, SE), of a home
 * and motor insurer (ES) and of a US commercial insurer, the list of agent
 * actions that a US insurer publishes, MCP 2026-07-28 and PAP draft 0.2.
 */

/* ========================================================================== */
/* 1. Identity of the extension                                               */
/* ========================================================================== */

/**
 * Identifier of AIP in MCP `capabilities.extensions` and in the PAP
 * `poppy.json` `extensions` field. It uses the reverse domain of
 * openfinancialagent.org, as MCP asks for third-party extensions.
 */
export const EXTENSION_ID = "org.openfinancialagent/ofap";

/** Version of this draft. */
export const PROTOCOL_VERSION = "0.1";

/**
 * Conformance level that a distributor declares.
 *
 * - 1 Inform: `get_distributor`, `list_products`, `get_documents`
 * - 2 Quote: level 1, plus `get_question_set`, `quote` and `validate_answers`
 * - 3 Subscribe: level 2, plus `submit_application` or `conclude`
 *
 * A server that declares a level MUST implement every tool of that level and
 * of the levels below it, except that level 3 needs only one of
 * `submit_application` and `conclude`. A server at level 2 can give binding
 * offers, because it implements `validate_answers`.
 */
export type ConformanceLevel = 1 | 2 | 3;

/** How a distributor exposes the protocol. */
export type InterfaceKind =
  /** Each primitive is an MCP tool with the name given in `TOOL_NAMES`. */
  | "tools"
  /**
   * PROPOSED, NOT DECIDED. The distributor exposes a company agent (a PAP
   * conversation or a chat tool) and returns AIP objects in the structured
   * data of its messages. See `ConversationData`.
   */
  | "conversation";

/**
 * Settings object of the extension. A server puts it under
 * `capabilities.extensions["org.openfinancialagent/ofap"]` in its MCP
 * `server/discover` response, and under the same key in the `extensions` field
 * of its PAP `poppy.json`.
 */
export interface AipSettings {
  /** Protocol version the server implements. */
  version: string;
  conformance_level: ConformanceLevel;
  interfaces: InterfaceKind[];
  /** Product lines the server can quote. */
  lines: ProductLine[];
  /** Countries where the server's products are sold. */
  countries: CountryCode[];
  /**
   * True when the server can conclude an agreement inside the agent
   * (`conclude`). False when the customer always finishes on the
   * distributor's own page.
   */
  can_conclude: boolean;
}

/* ========================================================================== */
/* 2. Common types                                                            */
/* ========================================================================== */

/**
 * ISO 3166-1 alpha-2 country code, upper case.
 * @pattern ^[A-Z]{2}$
 */
export type CountryCode = string;

/**
 * ISO 3166-2 subdivision code, upper case, for example "US-CA" for California.
 * @pattern ^[A-Z]{2}-[A-Z0-9]{1,3}$
 */
export type SubdivisionCode = string;

/**
 * ISO 4217 currency code.
 * @pattern ^[A-Z]{3}$
 */
export type CurrencyCode = string;

/**
 * Legal Entity Identifier (ISO 17442): 18 letters or digits, then 2 check digits.
 * @pattern ^[A-Z0-9]{18}[0-9]{2}$
 */
export type Lei = string;

/**
 * BCP 47 language tag, for example `fr` or `es-ES`.
 * @pattern ^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$
 */
export type LanguageTag = string;

/**
 * Calendar date, ISO 8601.
 * @format date
 */
export type DateString = string;

/**
 * Date and time with offset, ISO 8601.
 * @format date-time
 */
export type DateTimeString = string;

/** @format uri */
export type Url = string;

/**
 * Lower-case hex SHA-256 digest.
 * @pattern ^[a-f0-9]{64}$
 */
export type Sha256 = string;

/**
 * A decimal number as a string, so that no value is lost to floating point,
 * for example "12.90".
 * @pattern ^-?[0-9]+(\.[0-9]+)?$
 */
export type Decimal = string;

export interface Money {
  amount: Decimal;
  currency: CurrencyCode;
}

/**
 * Product line. Servers SHOULD use a value of `KnownProductLine`. Other values
 * MUST be lower case with underscores.
 * @pattern ^[a-z][a-z0-9_]*$
 */
export type ProductLine = string;

/** Lines that have, or will have, a profile in AIP. */
export type KnownProductLine =
  // Personal
  | "pet"
  | "home"
  | "renters"
  | "motor"
  | "travel"
  | "health"
  | "life"
  | "funeral"
  | "borrower_insurance"
  // Commercial
  | "professional_liability"
  | "general_liability"
  | "business_owners_policy"
  | "workers_compensation";

/**
 * Family of what a product insures: a kind of person, or a kind of good.
 * Servers SHOULD use a value of `KnownInsuredFamily`. Other values MUST be lower
 * case with underscores.
 * @pattern ^[a-z][a-z0-9_]*$
 */
export type InsuredFamily = string;

/** Families that the known product lines need. */
export type KnownInsuredFamily =
  // People
  /** A person, for example in travel, health, life, funeral and borrower insurance. */
  | "person"
  /** A company or another organisation, in the commercial lines. */
  | "organisation"
  // Goods
  /** A pet. Kinds, for example "cat" and "dog". */
  | "pet"
  /** A building where people live. Kinds, for example "house" and "apartment". */
  | "dwelling"
  /** The furniture and the belongings in a home. */
  | "contents"
  /** A vehicle. Kinds, for example "car", "motorcycle" and "van". */
  | "vehicle";

/* ========================================================================== */
/* 3. Distributor (level 1)                                                   */
/* ========================================================================== */

/**
 * Role of a party in the distribution chain. The provider roles are in
 * `ProviderRole`.
 */
export type DistributorRole =
  | ProviderRole
  // Intermediaries
  | "broker"
  | "agent"
  | "mga"
  | "comparator";

/** Kind of public register identifier. */
export type RegisterIdentifierType =
  /** France, ORIAS (insurance intermediaries). */
  | "orias_number"
  /** France, SIREN company number (9 digits), for example in REGAFI (insurers). */
  | "siren"
  /** United Kingdom, FCA Firm Reference Number. */
  | "fca_frn"
  /** United States, National Producer Number (NIPR, insurance). */
  | "npn"
  /** Spain, DGSFP registration key (insurance). */
  | "dgsfp_key"
  /** United States, NAIC company code of an insurer (5 digits). */
  | "naic_cocode"
  /** Legal Entity Identifier (ISO 17442), any country. Use it when the register lists the entry by its LEI. */
  | "lei"
  /** Any other register. Name it in `register`. */
  | "other";

/** One entry in a public register that gives the right to sell a product, or to carry its risk. */
export interface Licence {
  country: CountryCode;
  /** Supervising authority, for example "ACPR", "FCA", "DGSFP". */
  regulator: string;
  /** Name of the public register, for example "ORIAS", "REGAFI", "FCA Register", "NIPR". */
  register: string;
  identifier_type: RegisterIdentifierType;
  identifier: string;
  role: DistributorRole;
  /**
   * Register categories, for example ORIAS "COA" (insurance broker) or "AGA"
   * (tied insurance agent).
   */
  categories?: string[];
  /**
   * Subdivisions where the licence applies, for example US states as ISO
   * 3166-2 codes ("US-CA"). Omit when the licence covers the whole country.
   */
  subdivisions?: SubdivisionCode[];
  /** Public page where anyone can check the entry. */
  verification_url?: Url;
}

/** Params of `get_distributor`. No params. */
export interface GetDistributorParams {}

export interface GetDistributorResult {
  legal_name: string;
  trading_name?: string;
  /** Domain the distributor controls. It MUST match the server's own domain. */
  domain: string;
  /** Legal Entity Identifier, when the distributor has one. The registry uses it to match one company across registers. */
  lei?: Lei;
  roles: DistributorRole[];
  /** Every licence the distributor relies on to sell the listed products. */
  licences: Licence[];
  countries: CountryCode[];
  /** Where a customer can complain. Required by most regulators. */
  complaints_url?: Url;
  /** Settings the server declares for AIP. */
  aip: AipSettings;
}

/* ========================================================================== */
/* 4. Products (level 1)                                                      */
/* ========================================================================== */

/** Role of the party that carries the risk. */
export type ProviderRole = "insurer";

/** The party that carries the risk. */
export interface ProviderRef {
  name: string;
  legal_name?: string;
  role: ProviderRole;
  /** Domain the provider controls, so that an agent can find it in the registry. */
  domain?: string;
  /** Legal Entity Identifier, when the provider has one. */
  lei?: Lei;
  /**
   * The register entries that allow the provider to carry the risk, for
   * example its authorisation as an insurer. At least one.
   * @minItems 1
   */
  licences: Licence[];
}

/** How a customer can subscribe to a product. */
export type SubscriptionPath =
  /** The agent concludes the agreement with `conclude`. */
  | "conclude"
  /** The agent sends `submit_application`, and the customer finishes on the distributor's page. */
  | "application"
  /** The customer goes to the distributor's page with an offer reference. */
  | "handoff";

export interface Product {
  product_id: string;
  name: string;
  line: ProductLine;
  /** Provider of the product, when it is not the distributor. */
  provider?: ProviderRef;
  /** The risks the product can cover. A product MUST publish it. */
  underwriting_scope: UnderwritingScope;
  summary: string;
  details: ProductDetails;
  subscription_paths: SubscriptionPath[];
}

/**
 * The risks a product can cover. `list_products` gives it with no customer
 * data, so that an agent can drop a product that cannot cover the customer
 * before it asks a question.
 *
 * `geography` and `insured` are the structured part, which a machine can check
 * against the answers. A server MUST NOT return an offer for a risk outside the
 * structured part. An agent MUST NOT send answers to `quote` for a product
 * whose structured part excludes the customer. `conditions` holds the rest.
 */
export interface UnderwritingScope {
  /** Version of the scope. A change in any part MUST change it. */
  version: string;
  geography: Geography;
  /**
   * What the product insures. At least one.
   * @minItems 1
   */
  insured: InsuredType[];
  /**
   * The conditions that a machine cannot check, in plain words, for example
   * "Houses built after 1950 only" or "Not for people over 70". Empty when there
   * are none. An agent SHOULD check them against what the customer said before
   * it quotes, and ask the customer when it is not sure.
   */
  conditions: string[];
}

/** Where the insured person lives, or where the insured good is. */
export interface Geography {
  /**
   * Countries the product covers. At least one.
   * @minItems 1
   */
  countries: CountryCode[];
  /**
   * Subdivisions the product covers, for example US states. Each one MUST
   * belong to a country in `countries`. The product covers the whole of each
   * country that has no subdivision in this list.
   */
  subdivisions?: SubdivisionCode[];
}

/** A family of insured, and the kinds of it that a product covers. */
export interface InsuredType {
  family: InsuredFamily;
  /**
   * Kinds that the product covers, for example "cat" and "dog". Omit when it
   * covers every kind. When the line profile names a `kind_key` for this family,
   * each kind MUST be a value that this question accepts.
   */
  kinds?: string[];
}

/** What the product covers, and the options a customer can add. */
export interface ProductDetails {
  cover: CoverSummary;
  options?: ProductOption[];
}

/**
 * Params of `list_products`. Each filter is optional. The server MUST return
 * only the products whose line and underwriting scope match every filter given.
 */
export interface ListProductsParams {
  country?: CountryCode;
  /** Products that cover this subdivision. */
  subdivision?: SubdivisionCode;
  line?: ProductLine;
  /** Products that insure this family. */
  insured_family?: InsuredFamily;
  cursor?: string;
}

export interface ListProductsResult {
  products: Product[];
  next_cursor?: string;
}

/* ========================================================================== */
/* 5. Documents (level 1)                                                     */
/* ========================================================================== */

/** Kind of document. */
export type DocumentType =
  | "pre_contract_information"
  | "terms_of_business"
  | "other"
  /** EU Insurance Product Information Document (IDD). */
  | "ipid"
  | "general_conditions"
  /** Conditions particulières, specific to one agreement. */
  | "special_conditions"
  /** Statement of the customer's demands and needs (IDD Art. 20). */
  | "demands_and_needs"
  | "proof_of_insurance";

export interface InsuranceDocument {
  document_id: string;
  type: DocumentType;
  title: string;
  language: LanguageTag;
  /** Version label set by the distributor. A new text MUST get a new version. */
  version: string;
  url: Url;
  media_type: string;
  /** Digest of the exact file at `url`. Used as evidence of what was delivered. */
  sha256: Sha256;
  /**
   * True when the law requires that the customer receives this document
   * before they commit, for example the IPID.
   */
  required_before_commitment: boolean;
}

/** Params of `get_documents`. Give exactly one of the two references. */
export type GetDocumentsParams =
  | { product_id: string; country?: CountryCode; language?: LanguageTag }
  | { offer_id: string; language?: LanguageTag };

export interface GetDocumentsResult {
  documents: InsuranceDocument[];
}

/* ========================================================================== */
/* 6. Question sets (level 2)                                                 */
/* ========================================================================== */

/**
 * Who collects the value of a question.
 * - `agent`: the agent MAY ask and send the value.
 * - `distributor_page`: the value MUST NOT pass through the agent. The customer
 *   gives it on the distributor's own page. Use it for identity numbers, bank
 *   account and card numbers, tax numbers, health details and passwords.
 */
export type CollectedBy = "agent" | "distributor_page";

/**
 * A JSON Schema (2020-12) object that describes the answers. Each property is
 * one question. AIP adds these keywords to each property:
 *
 * - `x-collected-by`: a `CollectedBy` value. Default `agent`.
 * - `x-profile-key`: the key of the matching question in the line profile,
 *   when the question is part of the common core.
 * - `x-ask`: a short question the agent can ask the customer, in plain words.
 */
export interface AnswersSchema {
  type: "object";
  properties: { [key: string]: { [keyword: string]: unknown } };
  required?: string[];
  [keyword: string]: unknown;
}

export interface QuestionSet {
  question_set_id: string;
  /** Version of this question set. A change in any question MUST change it. */
  version: string;
  product_id: string;
  line: ProductLine;
  /** Line profile and version this question set builds on, for example "pet@0.1". */
  profile?: string;
  answers_schema: AnswersSchema;
}

export interface GetQuestionSetParams {
  product_id: string;
  country?: CountryCode;
}

export interface GetQuestionSetResult {
  question_set: QuestionSet;
}

export interface QuestionSetRef {
  question_set_id: string;
  version: string;
}

/** Answers keyed by property name in `answers_schema`. */
export interface Answers {
  [key: string]: unknown;
}

/** Who produced the value of an answer. */
export type AnswerOrigin =
  /** The customer gave the value. */
  | "customer"
  /** The agent produced the value, for example from a photo or from earlier messages. */
  | "agent"
  /** A third party gave the value, for example a vehicle register or the previous insurer. */
  | "third_party";

/**
 * Where one answer comes from. `validated_by_customer` is true when the
 * customer confirmed this value before the agent sent it. It is always true
 * when the customer gave the value. An agent MUST NOT set
 * `validated_by_customer` to true when the customer did not validate that answer.
 */
export type AnswerSource =
  | { origin: "customer"; validated_by_customer: true }
  | { origin: "agent"; validated_by_customer: boolean }
  | {
      origin: "third_party";
      validated_by_customer: boolean;
      /** The third party, by its kind and country, for example "vehicle register (FR)". */
      source_name: string;
    };

/**
 * The source of each answer, keyed like `answers`. An agent MUST give a source
 * for each answer, and no source for a key that has no answer. Otherwise the
 * server returns `answers_invalid`.
 */
export interface AnswerSources {
  [key: string]: AnswerSource;
}

/* ========================================================================== */
/* 7. Quote (level 2)                                                         */
/* ========================================================================== */

/**
 * Params of `quote`.
 *
 * The agent MAY send partial answers. The server then returns `needs_input`
 * with the missing fields, and the agent calls `quote` again with more answers.
 * This one loop replaces the multi-step flow tools (`action`, `stateUpdates`,
 * `sessionId`) that most servers use. Some servers already work this way.
 *
 * Without `validation`, every offer is indicative. To get binding offers, the
 * agent first has the customer validate the answers with `validate_answers`,
 * then sends the same answers and sources with that `validation`.
 *
 * To read a quote that is still in progress, send only `quote_request_id`.
 */
export type QuoteParams =
  | {
      product_id: string;
      question_set: QuestionSetRef;
      answers: Answers;
      /** Where each answer comes from, keyed like `answers`. */
      answer_sources: AnswerSources;
      /**
       * The customer's validation of these answers and sources, from a
       * succeeded `validate_answers` operation. When it does not match them,
       * the server returns `answers_not_validated`.
       */
      validation?: AnswersValidation;
      /** Options the customer wants priced, by key (optional covers, extra services). */
      options?: string[];
      language?: LanguageTag;
    }
  | {
      quote_request_id: string;
    };

/**
 * One priced offer. A distributor can return several offers: one per tier, per
 * provider, or per duration.
 *
 * When a server implements `quote`, an agent MUST take the price, the cover,
 * the limits and the excess that it shows the customer from the offer, and
 * MUST NOT take them from a page made for people.
 */
export interface Offer {
  offer_id: string;
  product_id: string;
  /** Name of the tier or plan, for example "Terceros Ampliado" or "Band B". */
  tier?: string;
  provider: ProviderRef;
  /** Version of the product's underwriting scope that the server applied. */
  underwriting_scope_version: string;
  /**
   * The price and the cover. A binding offer MUST give `cover.excess` and
   * `cover.limits`. An empty `limits` means that the cover has no limit.
   */
  pricing: Pricing;
  /**
   * True when the offer is indicative and can change after checks. False makes
   * the offer binding. A server MUST NOT return a binding offer unless the
   * quote carries the customer's validation of its answers and sources.
   */
  indicative: boolean;
  /** Last moment the offer can be accepted at this price. */
  valid_until: DateTimeString;
  subscription_paths: SubscriptionPath[];
  /**
   * Page where the customer can continue with this exact offer. Required when
   * `subscription_paths` contains `handoff`. It MUST NOT contain personal data.
   */
  handoff_url?: Url;
  /** True when the distributor recommends this offer after advice. */
  recommended?: boolean;
}

export type QuoteResult =
  | {
      status: "complete";
      quote_request_id: string;
      question_set: QuestionSetRef;
      /** SHA-256 of the canonical JSON (RFC 8785) of the answers used. */
      answers_sha256: Sha256;
      /** SHA-256 of the canonical JSON (RFC 8785) of the answer sources used. */
      answer_sources_sha256: Sha256;
      /** The validation the server applied. Required when an offer is binding. */
      validation?: AnswersValidation;
      offers: Offer[];
      /** Required when `offers` is empty. */
      no_offer?: NoOffer;
    }
  | {
      status: "needs_input";
      quote_request_id: string;
      /** Properties of `answers_schema` that are missing or not valid. */
      missing_fields: FieldIssue[];
    }
  | {
      status: "in_progress";
      quote_request_id: string;
      /** When the agent SHOULD read the quote again. */
      retry_after_seconds: number;
      /** Plain-language status, for example "Two insurers have answered, three to go". */
      message?: string;
    };

/** Why no offer is possible. */
export interface NoOffer {
  reason_code: NoOfferReason;
  /** Plain-language explanation the agent can pass to the customer. */
  message: string;
}

/**
 * Stable reason why no offer is possible. Servers SHOULD use a value of
 * `KnownNoOfferReason`. Other values MUST be lower case with underscores.
 * @pattern ^[a-z][a-z0-9_]*$
 */
export type NoOfferReason = string;

/**
 * Common reason codes. `outside_underwriting_scope` means that the risk is
 * outside the product's underwriting scope: its geography, its insured types or
 * its conditions. A quote for a risk outside the structured part MUST get this
 * reason.
 */
export type KnownNoOfferReason =
  /** The risk is outside the product's underwriting scope. */
  | "outside_underwriting_scope"
  /** The insurer does not accept the risk, and gives no more precise reason. */
  | "risk_not_accepted"
  /** The age of the insured person or animal is outside the insurer's limits. */
  | "age_not_accepted"
  | "breed_not_accepted"
  | "claims_history_not_accepted";

/* ========================================================================== */
/* 8. Validation of the answers (level 2)                                     */
/* ========================================================================== */

/**
 * Params of `validate_answers`. The agent calls it before it asks for binding
 * offers, and before an application. The answers MUST be complete for the
 * question set. Otherwise the server returns `answers_invalid`.
 */
export interface ValidateAnswersParams {
  product_id: string;
  question_set: QuestionSetRef;
  answers: Answers;
  /** Where each answer comes from, keyed like `answers`. */
  answer_sources: AnswerSources;
  /** Language of the operation `summary`. */
  language?: LanguageTag;
}

/**
 * Terms of a validation: the answers that the customer validates, and their
 * sources. The `summary` of the operation MUST show each answer and its source
 * in plain words, so that the customer can check each one.
 */
export interface ValidationTerms {
  product_id: string;
  question_set: QuestionSetRef;
  answers: Answers;
  answer_sources: AnswerSources;
  /** SHA-256 of the canonical JSON (RFC 8785) of `answers`. */
  answers_sha256: Sha256;
  /** SHA-256 of the canonical JSON (RFC 8785) of `answer_sources`. */
  answer_sources_sha256: Sha256;
}

/**
 * Result of `validate_answers`. The operation MUST have
 * `user_approval_required: true`, because only the customer can validate their
 * answers. The agent MUST ask the person who will be the subscriber to approve
 * it. When it succeeds, `result.data` holds a `ValidationOutcome`.
 */
export interface ValidateAnswersResult {
  operation: Operation<ValidationTerms>;
}

export interface ValidationOutcome {
  validation: AnswersValidation;
}

/**
 * The record that the customer validated a set of answers and their sources:
 * a succeeded `validate_answers` operation. The server keeps it. The agent
 * copies it into `quote` to get binding offers, and into the declaration of an
 * application.
 */
export interface AnswersValidation {
  operation_id: string;
  revision: number;
  /** When the customer approved the operation: its `confirmation.confirmed_at`. */
  validated_at: DateTimeString;
  answers_sha256: Sha256;
  answer_sources_sha256: Sha256;
}

export interface FieldIssue {
  field: string;
  issue: "missing" | "invalid" | "not_accepted";
  message?: string;
}

/* ========================================================================== */
/* 9. Premium and cover                                                       */
/* ========================================================================== */

export type PremiumPeriod = "month" | "quarter" | "half_year" | "year" | "single";

export interface Premium {
  amount: Money;
  period: PremiumPeriod;
  /** True when taxes and mandatory levies are in `amount`. */
  taxes_included: boolean;
}

export interface CoverLimit {
  /** Stable key, for example "vet_costs_per_year". */
  key: string;
  label: string;
  limit?: Money;
  /** Share of a claim paid back, from 0 to 1. Used by pet and health cover. */
  reimbursement_rate?: number;
}

export interface CoverSummary {
  /** Covers included, as short labels. */
  included: string[];
  limits?: CoverLimit[];
  excess?: Money;
  /** Main exclusions. The full list is in the documents. */
  main_exclusions?: string[];
  waiting_period_days?: number;
}

/** An option the customer can add (optional cover, extra service). */
export interface ProductOption {
  key: string;
  label: string;
  /** Cost of the option, in the same form as the main price. */
  price?: Premium | Money;
}

/** The price of an offer, and the cover it buys. */
export interface Pricing {
  premium: Premium;
  /** The same price for another period, when the server can give it. */
  alternative_premiums?: Premium[];
  cover: CoverSummary;
  options?: ProductOption[];
  start_date?: DateString;
}

/* ========================================================================== */
/* 10. Parties, needs and consent                                             */
/* ========================================================================== */

/** Role of a party in the agreement. */
export type PartyRole = "subscriber" | "payer" | "insured" | "beneficiary";

/**
 * A person or organisation in the agreement. Data in a party MUST be limited
 * to what the product needs. Identity numbers MUST NOT be here (see
 * `CollectedBy`).
 */
export interface Party {
  /** Local reference, unique in one application. */
  party_ref: string;
  kind: "person" | "organisation";
  roles: PartyRole[];
  display_name: string;
  /** Relationship to the subscriber, for example "self", "spouse", "child", "employee". */
  relationship_to_subscriber?: string;
  date_of_birth?: DateString;
  country_of_residence?: CountryCode;
}

/** Demands and needs, recorded before the contract is concluded (IDD Art. 20(1)). */
export interface NeedsAssessment {
  kind: "demands_and_needs";
  /** The need in the customer's words or a faithful summary. */
  statement: string;
  /** True when the distributor gave a personal recommendation (advice). */
  advice_given: boolean;
  /** Why the recommended offer meets the need. Required when `advice_given` is true. */
  advice_rationale?: string;
  recorded_at: DateTimeString;
}

/** The customer's choice about later contact. */
export interface ContactConsent {
  /** Channels the distributor MAY use to contact the customer. Empty means none. */
  channels: ("email" | "phone" | "sms" | "post")[];
  /** When `distributor_page`, the contact details never pass through the agent. */
  details_collected_by: CollectedBy;
  /** True only when the customer agreed that providers may contact them too. */
  providers_may_contact: boolean;
  /** Purposes the customer agreed to, for example "this_application", "marketing". */
  purposes: string[];
}

export interface DeliveredDocument {
  document_id: string;
  version: string;
  sha256: Sha256;
  delivered_at: DateTimeString;
}

/** The answers the customer commits to, with their sources and the customer's validation. */
export interface Declaration {
  question_set: QuestionSetRef;
  answers: Answers;
  /** Where each answer comes from, keyed like `answers`. */
  answer_sources: AnswerSources;
  answers_sha256: Sha256;
  answer_sources_sha256: Sha256;
  /**
   * True when the customer confirmed that the answers are true and complete.
   * The agent MUST NOT set it to true for invented or test data.
   */
  accuracy_confirmed: boolean;
  /**
   * The customer's validation of these answers and sources. Its hashes MUST be
   * `answers_sha256` and `answer_sources_sha256`, and its operation MUST have
   * succeeded. Otherwise the server returns `answers_not_validated`.
   */
  validation: AnswersValidation;
}

/* ========================================================================== */
/* 11. PAP operations and applications (level 3)                              */
/* ========================================================================== */

export type OperationState =
  | "proposed"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired";

/**
 * A PAP operation. This mirrors the PAP operations extension (version 1). PAP
 * is the authority for every field here except `terms` and `aip_progress`.
 * When the two differ, PAP wins.
 *
 * An MCP tool returns it in `structuredContent.operation`. The agent confirms
 * it at the PAP operations endpoint, never through an AIP tool.
 */
export interface Operation<TTerms> {
  operation_id: string;
  /** Starts at 1. Increases when the terms change. Only the latest revision can be confirmed. */
  revision: number;
  state: OperationState;
  /** Plain-language terms that the customer can decide from alone. */
  summary: string;
  terms: TTerms;
  /** Required while `proposed`. */
  expires_at?: DateTimeString;
  /** When true, a standing permission is not enough. The customer MUST approve this revision. */
  user_approval_required: boolean;
  url?: Url;
  confirmation: null | {
    revision: number;
    approved_by: "user" | "standing_permission";
    confirmed_at: DateTimeString;
  };
  result: null | { summary: string; data?: { [key: string]: unknown } };
  /**
   * AIP reason why the operation is `in_progress`. Not a PAP field. Clients
   * that do not know AIP ignore it.
   */
  aip_progress?: AipProgress;
}

export interface AipProgress {
  reason:
    /** A licensed person reviews the application. */
    | "licensed_review"
    /** The provider decides, for example the insurer underwrites the risk. */
    | "provider_decision"
    /** The customer must finish on the distributor's page (identity, signature, payment). */
    | "customer_action_on_distributor_page"
    | "payment_pending";
  url?: Url;
  expected_by?: DateTimeString;
}

/**
 * Terms of an application or a conclusion. Every field the law needs as
 * evidence is here, so that a confirmed revision records exactly what the
 * customer accepted.
 */
export interface ApplicationTerms {
  offer_id: string;
  product_id: string;
  provider: ProviderRef;
  /** The pricing of the offer, unchanged. It MUST be the `pricing` that `quote` returned for `offer_id`. */
  pricing: Pricing;
  options: string[];
  start_date?: DateString;
  parties: Party[];
  declaration: Declaration;
  needs_assessment: NeedsAssessment;
  /**
   * Documents delivered before this revision was proposed. Every document of
   * the offer with `required_before_commitment: true` MUST be in this list.
   */
  documents_delivered: DeliveredDocument[];
  contact_consent: ContactConsent;
  /** Days the customer has to withdraw after conclusion, when the law gives the right. */
  withdrawal_period_days?: number;
}

export interface SubmitApplicationParams {
  offer_id: string;
  parties: Party[];
  declaration: Declaration;
  needs_assessment: NeedsAssessment;
  documents_delivered: DeliveredDocument[];
  contact_consent: ContactConsent;
  options?: string[];
  start_date?: DateString;
}

/** When the operation succeeds, `result.data` holds an `ApplicationOutcome`. */
export interface SubmitApplicationResult {
  operation: Operation<ApplicationTerms>;
}

export interface ApplicationOutcome {
  application_id: string;
  evidence: EvidenceRecord;
  /** Page where the customer finishes the subscription. */
  handoff_url: Url;
}

export type ConcludeParams = SubmitApplicationParams;

/**
 * Result of `conclude`. The operation MUST have `user_approval_required: true`.
 * When it succeeds, `result.data` holds a `ConcludeOutcome`.
 */
export interface ConcludeResult {
  operation: Operation<ApplicationTerms>;
}

export interface ConcludeOutcome {
  agreement_number: string;
  evidence: EvidenceRecord;
  documents: InsuranceDocument[];
}

/* ========================================================================== */
/* 12. Evidence                                                               */
/* ========================================================================== */

/**
 * What the distributor keeps when an operation succeeds. It links the exact
 * revision the customer accepted to the documents, the declaration with its
 * sources and its validation, the needs assessment, the consent and the
 * underwriting scope. The distributor MUST keep it for the period the law
 * requires.
 *
 * A PAP confirmation proves that an agent stated the customer approved a
 * revision. It does not prove that the customer saw the terms. This record
 * adds what was delivered and what was declared. It still does not prove that
 * the customer read the documents.
 */
export interface EvidenceRecord {
  record_id: string;
  operation_id: string;
  revision: number;
  approved_by: "user" | "standing_permission";
  confirmed_at: DateTimeString;
  documents_delivered: DeliveredDocument[];
  question_set: QuestionSetRef;
  answers_sha256: Sha256;
  /** SHA-256 of the canonical JSON (RFC 8785) of the answer sources. The server MUST keep the sources with the declaration. */
  answer_sources_sha256: Sha256;
  /** The customer's validation of the answers and their sources. */
  validation: AnswersValidation;
  /** Version of the underwriting scope that the offer applied. */
  underwriting_scope_version: string;
  needs_assessment: NeedsAssessment;
  contact_consent: ContactConsent;
  /** SHA-256 of the canonical JSON (RFC 8785) of the confirmed `terms`. */
  terms_sha256: Sha256;
}

/* ========================================================================== */
/* 13. Errors                                                                 */
/* ========================================================================== */

export type AipErrorCode =
  /** The distributor holds no licence for this country, subdivision or line. */
  | "not_licensed"
  /** The product is not sold in the country or subdivision of the request. In `quote`, a risk outside the scope gets `no_offer` instead. */
  | "not_available_in_region"
  /** No product has this `product_id`. */
  | "product_not_found"
  /** No offer has this `offer_id`. */
  | "offer_not_found"
  /** The offer is past its `valid_until`. */
  | "offer_expired"
  /** The answers follow an old version of the question set. */
  | "question_set_outdated"
  /** A value marked `distributor_page` was sent through the agent. Nothing was stored. */
  | "sensitive_field_received"
  /** A document with `required_before_commitment` is not in `documents_delivered`. */
  | "documents_not_delivered"
  /** An answer has no source, a source has no answer, or the answers to `validate_answers` are not complete. `fields` lists each one. */
  | "answers_invalid"
  /** A binding offer or an application asks for a validation that is missing, did not succeed, or does not match the answers and their sources. */
  | "answers_not_validated"
  /** The declaration does not have `accuracy_confirmed: true`. */
  | "accuracy_not_confirmed"
  /** The needs assessment is missing, or its outcome does not allow the application. */
  | "needs_assessment_invalid"
  /** The tool is above the conformance level the server declares. */
  | "not_supported";

/**
 * Error returned in an MCP tool result with `isError: true`, in
 * `structuredContent.error`. PAP errors (`insufficient_scope`,
 * `sign_in_required`, `terms_changed`) keep their PAP form.
 */
export interface AipError {
  code: AipErrorCode;
  message: string;
  fields?: FieldIssue[];
}

/* ========================================================================== */
/* 14. Conversation binding (PROPOSED, NOT DECIDED)                           */
/* ========================================================================== */

/**
 * PROPOSED. Some distributors expose only a company agent. If
 * AIP accepts them at level 2, each message that carries an AIP object puts
 * it here, in the message's structured data (`data` in a PAP conversation,
 * `structuredContent` in a chat tool).
 */
export interface ConversationData {
  question?: { field: string; ask: string; schema: { [keyword: string]: unknown } };
  quote?: QuoteResult;
  documents?: InsuranceDocument[];
  operation?: Operation<ApplicationTerms>;
}

/* ========================================================================== */
/* 15. Tool index                                                             */
/* ========================================================================== */

export const TOOL_NAMES = {
  get_distributor: "get_distributor",
  list_products: "list_products",
  get_documents: "get_documents",
  get_question_set: "get_question_set",
  quote: "quote",
  validate_answers: "validate_answers",
  submit_application: "submit_application",
  conclude: "conclude",
} as const;

export type ToolName = keyof typeof TOOL_NAMES;

/** Session that a tool needs (PAP draft 0.2). */
export type SessionRequirement = "none" | "signed_out_or_none";

/** Level, session and MCP annotations of each tool. */
export const TOOLS: {
  [K in ToolName]: {
    level: ConformanceLevel;
    session: SessionRequirement;
    readOnlyHint: boolean;
    returnsOperation: boolean;
  };
} = {
  get_distributor: { level: 1, session: "none", readOnlyHint: true, returnsOperation: false },
  list_products: { level: 1, session: "none", readOnlyHint: true, returnsOperation: false },
  get_documents: { level: 1, session: "none", readOnlyHint: true, returnsOperation: false },
  get_question_set: { level: 2, session: "none", readOnlyHint: true, returnsOperation: false },
  quote: { level: 2, session: "signed_out_or_none", readOnlyHint: true, returnsOperation: false },
  validate_answers: { level: 2, session: "signed_out_or_none", readOnlyHint: false, returnsOperation: true },
  submit_application: { level: 3, session: "signed_out_or_none", readOnlyHint: false, returnsOperation: true },
  conclude: { level: 3, session: "signed_out_or_none", readOnlyHint: false, returnsOperation: true },
};

/** Params and result type of each tool. */
export interface ToolSignatures {
  get_distributor: { params: GetDistributorParams; result: GetDistributorResult };
  list_products: { params: ListProductsParams; result: ListProductsResult };
  get_documents: { params: GetDocumentsParams; result: GetDocumentsResult };
  get_question_set: { params: GetQuestionSetParams; result: GetQuestionSetResult };
  quote: { params: QuoteParams; result: QuoteResult };
  validate_answers: { params: ValidateAnswersParams; result: ValidateAnswersResult };
  submit_application: { params: SubmitApplicationParams; result: SubmitApplicationResult };
  conclude: { params: ConcludeParams; result: ConcludeResult };
}
