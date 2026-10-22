/**
 * Open Financial Agent Protocol (OFAP): schema, draft 0.1
 *
 * OFAP defines how an AI agent finds, prices, subscribes to and services a
 * regulated financial product with any distributor, and what evidence each
 * step leaves. Draft 0.1 covers insurance.
 *
 * This file is the source of truth. `schema.json` is generated from it. Do not
 * edit `schema.json` by hand.
 *
 * OFAP is an extension on top of two protocols:
 * - MCP (https://modelcontextprotocol.io/specification/2026-07-28) carries every
 *   call. Each tool in this file is an MCP tool. Results go in
 *   `structuredContent`, with a short plain-text summary in `content`.
 * - PAP (https://personalagentprotocol.org/docs/0.2/spec) carries the customer's
 *   session and every action with a business effect, through its `operations`
 *   extension. OFAP defines only the financial `terms` of those operations.
 *
 * The protocol has a sector-neutral core and one module per sector. A module
 * adds the pricing, the needs assessment and the documents that the law of
 * that sector asks for. Draft 0.1 defines one module: insurance. Section 8
 * gives the rules for a later module, for example credit or investment.
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
 * Identifier of OFAP in MCP `capabilities.extensions` and in the PAP
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
 * - 2 Quote: level 1, plus `get_question_set` and `quote`
 * - 3 Subscribe: level 2, plus `submit_application` or `conclude`
 * - 4 Service: level 3, plus `get_agreement` and `amend_agreement`
 *
 * A server that declares a level MUST implement every tool of that level and
 * of the levels below it, except that level 3 needs only one of
 * `submit_application` and `conclude`.
 */
export type ConformanceLevel = 1 | 2 | 3 | 4;

/** How a distributor exposes the protocol. */
export type InterfaceKind =
  /** Each primitive is an MCP tool with the name given in `TOOL_NAMES`. */
  | "tools"
  /**
   * PROPOSED, NOT DECIDED. The distributor exposes a company agent (a PAP
   * conversation or a chat tool) and returns OFAP objects in the structured
   * data of its messages. See `ConversationData`.
   */
  | "conversation";

/**
 * Settings object of the extension. A server puts it under
 * `capabilities.extensions["org.openfinancialagent/ofap"]` in its MCP
 * `server/discover` response, and under the same key in the `extensions` field
 * of its PAP `poppy.json`.
 */
export interface OfapSettings {
  /** Protocol version the server implements. */
  version: string;
  conformance_level: ConformanceLevel;
  interfaces: InterfaceKind[];
  /** Sector modules the server implements. */
  sectors: Sector[];
  /** Product lines the server can quote or serve. */
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
 * ISO 4217 currency code.
 * @pattern ^[A-Z]{3}$
 */
export type CurrencyCode = string;

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

/** Lines that have, or will have, a profile in OFAP. A sector module adds its own group. */
export type KnownProductLine =
  // Insurance, personal
  | "pet"
  | "home"
  | "renters"
  | "motor"
  | "travel"
  | "health"
  | "life"
  | "funeral"
  | "borrower_insurance"
  // Insurance, commercial
  | "professional_liability"
  | "general_liability"
  | "business_owners_policy"
  | "workers_compensation";

/* ========================================================================== */
/* 3. Distributor (core, level 1)                                             */
/* ========================================================================== */

/**
 * Role of a party in the distribution chain. The provider roles are in
 * `ProviderRole`. A sector module adds its intermediary roles here.
 */
export type DistributorRole =
  | ProviderRole
  // Insurance intermediaries
  | "broker"
  | "agent"
  | "mga"
  // Any sector
  | "comparator";

/** Kind of public register identifier. A sector module adds the registers of its sector. */
export type RegisterIdentifierType =
  /** France, ORIAS (insurance intermediaries). */
  | "orias_number"
  /** United Kingdom, FCA Firm Reference Number. */
  | "fca_frn"
  /** United States, National Producer Number (NIPR, insurance). */
  | "npn"
  /** Spain, DGSFP registration key (insurance). */
  | "dgsfp_key"
  /** Any other register. Name it in `register`. */
  | "other";

/** One entry in a public register that gives the right to distribute a product. */
export interface Licence {
  country: CountryCode;
  /** Supervising authority, for example "ACPR", "FCA", "DGSFP". */
  regulator: string;
  /** Name of the public register, for example "ORIAS", "FCA Register", "NIPR". */
  register: string;
  identifier_type: RegisterIdentifierType;
  identifier: string;
  role: DistributorRole;
  /** Sectors this entry covers. */
  sectors: Sector[];
  /**
   * Register categories, for example ORIAS "COA" (insurance broker) or "AGA"
   * (tied insurance agent).
   */
  categories?: string[];
  /**
   * Subdivisions where the licence applies, for example US states as ISO
   * 3166-2 codes ("US-CA"). Omit when the licence covers the whole country.
   */
  subdivisions?: string[];
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
  roles: DistributorRole[];
  /** Every licence the distributor relies on to sell the listed products. */
  licences: Licence[];
  countries: CountryCode[];
  /** Where a customer can complain. Required by most regulators. */
  complaints_url?: Url;
  /** Settings the server declares for OFAP. */
  ofap: OfapSettings;
}

/* ========================================================================== */
/* 4. Products (core, level 1)                                                */
/* ========================================================================== */

/**
 * Role of the party that carries the risk or provides the money. A sector
 * module adds its provider role, for example a lender.
 */
export type ProviderRole = "insurer";

/** The party that carries the risk or provides the money. */
export interface ProviderRef {
  name: string;
  legal_name?: string;
  role: ProviderRole;
  licence?: Licence;
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
  sector: Sector;
  line: ProductLine;
  /** Provider of the product, when it is not the distributor. */
  provider?: ProviderRef;
  countries: CountryCode[];
  summary: string;
  details: ProductDetails;
  subscription_paths: SubscriptionPath[];
}

/** Details of the product's sector. One member per sector module. */
export type ProductDetails = InsuranceProductDetails;

export interface ListProductsParams {
  country?: CountryCode;
  sector?: Sector;
  line?: ProductLine;
  cursor?: string;
}

export interface ListProductsResult {
  products: Product[];
  next_cursor?: string;
}

/* ========================================================================== */
/* 5. Documents (core, level 1)                                               */
/* ========================================================================== */

/** Kind of document. A sector module adds the documents that the law of its sector asks for. */
export type DocumentType =
  // Any sector
  | "pre_contract_information"
  | "terms_of_business"
  | "other"
  // Insurance
  /** EU Insurance Product Information Document (IDD). */
  | "ipid"
  | "general_conditions"
  /** Conditions particulières, specific to one agreement. */
  | "special_conditions"
  /** Statement of the customer's demands and needs (IDD Art. 20). */
  | "demands_and_needs"
  | "proof_of_insurance";

export interface FinancialDocument {
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

/** Params of `get_documents`. Give exactly one of the three references. */
export type GetDocumentsParams =
  | { product_id: string; country?: CountryCode; language?: LanguageTag }
  | { offer_id: string; language?: LanguageTag }
  | { agreement_number: string; language?: LanguageTag };

export interface GetDocumentsResult {
  documents: FinancialDocument[];
}

/* ========================================================================== */
/* 6. Question sets (core, level 2)                                           */
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
 * one question. OFAP adds these keywords to each property:
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
  sector: Sector;
  line: ProductLine;
  /** Line profile and version this question set builds on, for example "insurance/pet@0.1". */
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

/* ========================================================================== */
/* 7. Quote (core, level 2)                                                   */
/* ========================================================================== */

/**
 * Params of `quote`.
 *
 * The agent MAY send partial answers. The server then returns `needs_input`
 * with the missing fields, and the agent calls `quote` again with more answers.
 * This one loop replaces the multi-step flow tools (`action`, `stateUpdates`,
 * `sessionId`) that most servers use. Some servers already work this way.
 *
 * To read a quote that is still in progress, send only `quote_request_id`.
 */
export type QuoteParams =
  | {
      product_id: string;
      question_set: QuestionSetRef;
      answers: Answers;
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
 */
export interface Offer {
  offer_id: string;
  product_id: string;
  sector: Sector;
  /** Name of the tier or plan, for example "Terceros Ampliado" or "Band B". */
  tier?: string;
  provider: ProviderRef;
  pricing: Pricing;
  /** True when the offer is indicative and can change after checks. */
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

/** Price in the form of the offer's sector. One member per sector module. */
export type Pricing = InsurancePricing;

export type QuoteResult =
  | {
      status: "complete";
      quote_request_id: string;
      question_set: QuestionSetRef;
      /** SHA-256 of the canonical JSON (RFC 8785) of the answers used. */
      answers_sha256: Sha256;
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
  /**
   * Stable reason code, for example "risk_not_accepted", "age_not_accepted",
   * "breed_not_accepted", "claims_history_not_accepted",
   * "not_available_in_region".
   */
  reason_code: string;
  /** Plain-language explanation the agent can pass to the customer. */
  message: string;
}

export interface FieldIssue {
  field: string;
  issue: "missing" | "invalid" | "not_accepted";
  message?: string;
}

/* ========================================================================== */
/* 8. Sector modules                                                          */
/* ========================================================================== */

/**
 * Sector modules of this draft. Draft 0.1 defines one module: insurance
 * (section 9).
 *
 * The core is the same for every sector. A sector module adds what the law of
 * its sector asks for. A module MUST define:
 * - its value in `Sector`, and its group of lines in `KnownProductLine`;
 * - one member of `ProductDetails`, `Pricing` and `NeedsAssessment`, each with
 *   a `sector` field that holds the module's value;
 * - its values in `ProviderRole`, `DistributorRole`, `RegisterIdentifierType`,
 *   `DocumentType`, `PartyRole` and `AmendmentChange`, when the sector needs
 *   them;
 * - which of its documents are `required_before_commitment`;
 * - its line profiles in `profiles.ts`, and checks for the rules of its sector
 *   that a JSON Schema cannot express.
 *
 * A module MUST NOT change a core type or a core rule. The tools, the quote
 * loop, the declaration, the PAP operations and the evidence record stay the
 * same for every sector.
 *
 * A server declares the modules it implements in `OfapSettings.sectors`. An
 * agent MUST NOT show a product, an offer or an agreement of a sector it does
 * not implement as if it were of a known sector.
 *
 * Candidate modules for a later draft:
 * - credit: SECCI and ESIS, creditworthiness (CCD Art. 18, MCD Art. 18), APR
 *   and total cost of credit;
 * - investment: KID (PRIIPs), suitability or appropriateness (MiFID II Art.
 *   25), fees and risk indicator.
 */
export type Sector = "insurance";

/* ========================================================================== */
/* 9. Insurance module                                                        */
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

export interface InsuranceProductDetails {
  sector: "insurance";
  cover: CoverSummary;
  options?: ProductOption[];
}

export interface InsurancePricing {
  sector: "insurance";
  premium: Premium;
  /** The same price for another period, when the server can give it. */
  alternative_premiums?: Premium[];
  cover: CoverSummary;
  options?: ProductOption[];
  start_date?: DateString;
}

/** Demands and needs, recorded before the contract is concluded (IDD Art. 20(1)). */
export interface InsuranceNeedsAssessment {
  sector: "insurance";
  kind: "demands_and_needs";
  /** The need in the customer's words or a faithful summary. */
  statement: string;
  /** True when the distributor gave a personal recommendation (advice). */
  advice_given: boolean;
  /** Why the recommended offer meets the need. Required when `advice_given` is true. */
  advice_rationale?: string;
  recorded_at: DateTimeString;
}

/* ========================================================================== */
/* 10. Parties, needs and consent (core)                                      */
/* ========================================================================== */

/** Role of a party in the agreement. A sector module adds the roles of its sector. */
export type PartyRole =
  // Any sector
  | "subscriber"
  | "payer"
  // Insurance
  | "insured"
  | "beneficiary";

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

/** Needs assessment that the law of the sector asks for. One member per sector module. */
export type NeedsAssessment = InsuranceNeedsAssessment;

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

/** The answers the customer commits to. */
export interface Declaration {
  question_set: QuestionSetRef;
  answers: Answers;
  answers_sha256: Sha256;
  /**
   * True when the customer confirmed that the answers are true and complete.
   * The agent MUST NOT set it to true for invented or test data.
   */
  accuracy_confirmed: boolean;
}

/* ========================================================================== */
/* 11. PAP operations with financial terms (levels 3 and 4)                   */
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
 * is the authority for every field here except `terms` and `ofap_progress`.
 * When the two differ, PAP wins.
 *
 * An MCP tool returns it in `structuredContent.operation`. The agent confirms
 * it at the PAP operations endpoint, never through an OFAP tool.
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
   * OFAP reason why the operation is `in_progress`. Not a PAP field. Clients
   * that do not know OFAP ignore it.
   */
  ofap_progress?: OfapProgress;
}

export interface OfapProgress {
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
  sector: Sector;
  provider: ProviderRef;
  pricing: Pricing;
  options: string[];
  start_date?: DateString;
  parties: Party[];
  declaration: Declaration;
  /** It MUST be of the same sector as the offer. */
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
  documents: FinancialDocument[];
}

/* ========================================================================== */
/* 12. Evidence (core)                                                        */
/* ========================================================================== */

/**
 * What the distributor keeps when an operation succeeds. It links the exact
 * revision the customer accepted to the documents, the declaration, the needs
 * assessment and the consent. The distributor MUST keep it for the period the
 * law requires.
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
  needs_assessment: NeedsAssessment;
  contact_consent: ContactConsent;
  /** SHA-256 of the canonical JSON (RFC 8785) of the confirmed `terms`. */
  terms_sha256: Sha256;
}

/* ========================================================================== */
/* 13. Agreements (core, level 4)                                             */
/* ========================================================================== */

export type AgreementStatus =
  | "pending"
  | "active"
  | "suspended"
  | "lapsed"
  | "cancelled"
  | "closed"
  | "expired";

/** An agreement in force. In the insurance module, a policy. */
export interface Agreement {
  agreement_number: string;
  sector: Sector;
  status: AgreementStatus;
  product_id: string;
  line: ProductLine;
  provider: ProviderRef;
  parties: Party[];
  /** Price as agreed, in the form of the sector. */
  pricing: Pricing;
  options: string[];
  start_date: DateString;
  renewal_date?: DateString;
  end_date?: DateString;
  /** What the agreement covers: a pet, a home, a vehicle, a property. */
  subjects: Subject[];
  /** Includes the proof of insurance when the product has one. */
  documents: FinancialDocument[];
}

export interface Subject {
  subject_ref: string;
  kind: "pet" | "home" | "vehicle" | "property" | "valuable_item" | "business" | "person" | "other";
  display_name: string;
  /** Attributes of the subject, following the line profile. */
  attributes: { [key: string]: unknown };
}

/** Requires a signed-in PAP session with read scope. */
export interface GetAgreementParams {
  agreement_number: string;
}

export interface GetAgreementResult {
  agreement: Agreement;
}

/** One change to an agreement. A sector module adds the changes of its sector. */
export type AmendmentChange =
  // Any sector
  | { kind: "update_address"; country: CountryCode; postal_code: string; city: string; street: string }
  | { kind: "add_party"; party: Party }
  | { kind: "remove_party"; party_ref: string }
  | { kind: "add_option"; option: string }
  | { kind: "remove_option"; option: string }
  // Insurance
  | { kind: "change_excess"; excess: Money }
  | { kind: "add_subject"; subject: Subject }
  | { kind: "remove_subject"; subject_ref: string };

/** Requires a signed-in PAP session with write scope. */
export interface AmendAgreementParams {
  agreement_number: string;
  changes: AmendmentChange[];
  /** When the changes take effect. Default: the earliest date the provider accepts. */
  effective_date?: DateString;
  /** Required when a change adds a party or a subject that the provider must price. */
  declaration?: Declaration;
  needs_assessment?: NeedsAssessment;
  documents_delivered?: DeliveredDocument[];
}

export interface AmendmentTerms {
  agreement_number: string;
  changes: AmendmentChange[];
  effective_date: DateString;
  pricing_before: Pricing;
  pricing_after: Pricing;
  /** Amount the customer pays at once, or gets back when negative, for example a premium adjustment. */
  amount_due_now?: Money;
  declaration?: Declaration;
  needs_assessment?: NeedsAssessment;
  documents_delivered: DeliveredDocument[];
}

/**
 * Result of `amend_agreement`. The operation MUST have
 * `user_approval_required: true` when `pricing_after` differs from
 * `pricing_before`, when `amount_due_now` is set, or when a change adds or
 * removes a party or a subject. A standing permission is not enough for these.
 */
export interface AmendAgreementResult {
  operation: Operation<AmendmentTerms>;
}

/* ========================================================================== */
/* 14. Errors (core)                                                          */
/* ========================================================================== */

export type OfapErrorCode =
  /** The distributor holds no licence for this country, subdivision, sector or line. */
  | "not_licensed"
  /** The product is not sold where the customer is. */
  | "not_available_in_region"
  | "product_not_found"
  | "offer_not_found"
  | "offer_expired"
  /** The answers follow an old version of the question set. */
  | "question_set_outdated"
  /** A value marked `distributor_page` was sent through the agent. Nothing was stored. */
  | "sensitive_field_received"
  /** A document with `required_before_commitment` is not in `documents_delivered`. */
  | "documents_not_delivered"
  | "accuracy_not_confirmed"
  /** The needs assessment is missing, of another sector, or its outcome does not allow the application. */
  | "needs_assessment_invalid"
  | "agreement_not_found"
  | "amendment_not_allowed"
  /** The tool is above the conformance level the server declares. */
  | "not_supported";

/**
 * Error returned in an MCP tool result with `isError: true`, in
 * `structuredContent.error`. PAP errors (`insufficient_scope`,
 * `sign_in_required`, `terms_changed`) keep their PAP form.
 */
export interface OfapError {
  code: OfapErrorCode;
  message: string;
  fields?: FieldIssue[];
}

/* ========================================================================== */
/* 15. Conversation binding (PROPOSED, NOT DECIDED)                           */
/* ========================================================================== */

/**
 * PROPOSED. Some distributors expose only a company agent. If
 * OFAP accepts them at level 2, each message that carries an OFAP object puts
 * it here, in the message's structured data (`data` in a PAP conversation,
 * `structuredContent` in a chat tool).
 */
export interface ConversationData {
  question?: { field: string; ask: string; schema: { [keyword: string]: unknown } };
  quote?: QuoteResult;
  documents?: FinancialDocument[];
  operation?: Operation<ApplicationTerms | AmendmentTerms>;
}

/* ========================================================================== */
/* 16. Tool index                                                             */
/* ========================================================================== */

export const TOOL_NAMES = {
  get_distributor: "get_distributor",
  list_products: "list_products",
  get_documents: "get_documents",
  get_question_set: "get_question_set",
  quote: "quote",
  submit_application: "submit_application",
  conclude: "conclude",
  get_agreement: "get_agreement",
  amend_agreement: "amend_agreement",
} as const;

export type ToolName = keyof typeof TOOL_NAMES;

/** Session that a tool needs (PAP draft 0.2). */
export type SessionRequirement =
  | "none"
  | "signed_out_or_none"
  | "signed_in_read"
  | "signed_in_write";

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
  submit_application: { level: 3, session: "signed_out_or_none", readOnlyHint: false, returnsOperation: true },
  conclude: { level: 3, session: "signed_out_or_none", readOnlyHint: false, returnsOperation: true },
  get_agreement: { level: 4, session: "signed_in_read", readOnlyHint: true, returnsOperation: false },
  amend_agreement: { level: 4, session: "signed_in_write", readOnlyHint: false, returnsOperation: true },
};

/** Params and result type of each tool. */
export interface ToolSignatures {
  get_distributor: { params: GetDistributorParams; result: GetDistributorResult };
  list_products: { params: ListProductsParams; result: ListProductsResult };
  get_documents: { params: GetDocumentsParams; result: GetDocumentsResult };
  get_question_set: { params: GetQuestionSetParams; result: GetQuestionSetResult };
  quote: { params: QuoteParams; result: QuoteResult };
  submit_application: { params: SubmitApplicationParams; result: SubmitApplicationResult };
  conclude: { params: ConcludeParams; result: ConcludeResult };
  get_agreement: { params: GetAgreementParams; result: GetAgreementResult };
  amend_agreement: { params: AmendAgreementParams; result: AmendAgreementResult };
}
