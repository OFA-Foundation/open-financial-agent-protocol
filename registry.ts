/**
 * Agentic Insurance Protocol (AIP): registry, draft 0.1
 *
 * The registry is one MCP server that a buying agent calls before it sends
 * anything to a seller. It answers three questions, and it needs no customer
 * data to answer them:
 * - Which sellers speak AIP in this country, for this line?
 *   (`search_distributors`)
 * - Does this seller, or the insurer behind an offer, hold an active licence
 *   for this country and line? (`verify_licence`)
 * - Which rules must an agent follow in this country? (`get_country_rules`)
 *
 * Each insurer or distributor runs its own server, with the tools of
 * `schema.ts`. The registry finds these servers and checks their licences in
 * the public registers. It does not price, it does not check the underwriting
 * scope of a product, and it does not copy what a server publishes. Those stay
 * on the server of each seller.
 *
 * One operator runs the registry. This file gives the rules that the operator
 * follows, and the rules that an agent follows when it uses a result.
 *
 * This file follows the conventions of `schema.ts` and imports its common
 * types. `schema.json` is generated from both files.
 *
 * The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
 * "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" are to be
 * read as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they
 * appear in all capitals.
 *
 * Status: DRAFT 0.1. A later draft MAY break compatibility with this one until 1.0.
 */

import type {
  ConformanceLevel,
  CountryCode,
  DateString,
  DateTimeString,
  DistributorRole,
  InsuredFamily,
  LanguageTag,
  Lei,
  ProductLine,
  RegisterIdentifierType,
  SessionRequirement,
  Sha256,
  SubdivisionCode,
  Url,
} from "./schema";

/* ========================================================================== */
/* 1. Registry server                                                         */
/* ========================================================================== */

/**
 * Identifier of the registry extension in MCP `capabilities.extensions`. It
 * uses the same vendor prefix as `EXTENSION_ID` in `schema.ts`, and changes
 * with it.
 */
export const REGISTRY_EXTENSION_ID = "org.openfinancialagent/registry";

/**
 * Settings object of the registry extension. The registry puts it under
 * `capabilities.extensions["org.openfinancialagent/registry"]` in its MCP
 * `server/discover` response.
 *
 * The registry SHOULD also serve the buyer skill through the MCP Skills
 * extension (`io.modelcontextprotocol/skills`). An agent whose host loads
 * skills over MCP then gets the whole skill from the registry, and
 * `get_country_rules` serves the same country files to the other agents.
 */
export interface RegistrySettings {
  /** Protocol version the registry implements. */
  version: string;
  /** Countries where the registry checks licences and lists servers. */
  countries: CountryCode[];
  /** Countries that have a rules file in `get_country_rules`. */
  rules_countries: CountryCode[];
  /** Every public register the registry reads. */
  sources: RegisterSource[];
  /**
   * Page where the operator publishes how it lists servers, how it checks
   * licences, how it maps register categories to lines, and how to reach it.
   */
  policy_url: Url;
}

/** How the registry reads a public register. */
export type SourceAccess =
  /** An official API of the register. */
  | "api"
  /** A file that the register publishes for download. */
  | "bulk_file"
  /** The public web page of each entry. */
  | "web_page";

/** The kind of party that a register lists. */
export type RegisterCoverage = "intermediaries" | "insurers";

/** A public register that the registry reads. */
export interface RegisterSource {
  country: CountryCode;
  /** Subdivisions that this source covers, for example one US state. Omit when it covers the whole country. */
  subdivisions?: SubdivisionCode[];
  /** Name of the register, for example "ORIAS" or "FCA Register". */
  register: string;
  /** Authority that keeps the register, or that supervises its entries. */
  regulator: string;
  covers: RegisterCoverage[];
  identifier_type: RegisterIdentifierType;
  access: SourceAccess;
  /** Public home page of the register. */
  url: Url;
}

/* ========================================================================== */
/* 2. Common types                                                            */
/* ========================================================================== */

/**
 * Host name, lower case, with no scheme, port or path, for example
 * "pets.example.com".
 * @pattern ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$
 */
export type DomainName = string;

/** An entry in a public register, as an agent or a listing gives it. */
export interface RegisterIdentifier {
  /** Country of the register. */
  country: CountryCode;
  identifier_type: RegisterIdentifierType;
  identifier: string;
  /** Name of the register. Give it when `identifier_type` is "other". */
  register?: string;
}

/* ========================================================================== */
/* 3. Listing                                                                 */
/* ========================================================================== */

/**
 * Days between two checks of a listed server, at most.
 *
 * How a server gets listed. The operator follows these steps:
 * 1. The distributor asks to be listed, and gives its domain.
 * 2. The registry reads `https://{domain}/.well-known/poppy.json`. Its
 *    `organization.domain` MUST be the domain. As PAP requires, the document
 *    comes from that host, so it proves that the distributor controls the
 *    domain.
 * 3. It calls `get_distributor` on the MCP server that `poppy.json` names: the
 *    `url` of the `apis` entry whose `type` is "mcp". The `domain` of the
 *    result MUST be the domain.
 * 4. It checks each licence of the result in the public register of its
 *    country, as `verify_licence` does. It also confirms that the holder of
 *    each entry controls the domain: the register gives the domain for the
 *    entry, or the operator confirms it with the holder, through contact
 *    details that the register or the regulator gives. The claim in
 *    `get_distributor` alone is not enough, because any domain can claim any
 *    entry.
 * 5. It checks that the server has every tool of the level it declares
 *    (`TOOLS` in `schema.ts`), and that the results of the level 1 tools match
 *    `schema.json`.
 * 6. It lists the server.
 *
 * Rules for the operator:
 * - The registry MUST list a server only when steps 2 to 5 pass. A server that
 *   lacks one tool of its level MUST NOT be listed.
 * - The registry MUST NOT list a server that claims a licence whose status is
 *   "not_found" or "name_mismatch".
 * - The registry MUST NOT link a register entry to a second domain unless the
 *   holder of the entry confirms the second domain too.
 * - A listed server appears in a search for a country only while its verdict
 *   for that country, and for the subdivision and line asked, is "licensed".
 * - The registry MUST check each listed server again at least every
 *   `RECHECK_DAYS` days, and when the distributor or a regulator asks. It
 *   SHOULD also check again when anyone reports a problem.
 * - When a licence stops being active, the registry MUST remove what that
 *   licence covered from the listing before it answers another search.
 * - When `poppy.json` or the MCP server goes away, or the server fails step 5,
 *   the registry MUST remove the listing.
 * - The registry keeps the fields of `ListedDistributor` and the licences. It
 *   MUST NOT copy the products, the underwriting scopes, the prices or the
 *   documents of a server.
 */
export const RECHECK_DAYS = 7;

/** A server that the registry lists. */
export interface ListedDistributor {
  legal_name: string;
  trading_name?: string;
  lei?: Lei;
  domain: DomainName;
  /** MCP endpoint of the server: the `url` of the `apis` entry of type "mcp" in `poppy.json`. */
  mcp_url: Url;
  /** URL of the PAP `poppy.json` of the domain. */
  poppy_url: Url;
  roles: DistributorRole[];
  conformance_level: ConformanceLevel;
  /** Lines the server can quote, as it declares them. */
  lines: ProductLine[];
  /** Countries where the server sells, as it declares them. */
  countries: CountryCode[];
  /**
   * Subdivisions of the country asked where the server holds a licence. Omit
   * when its licence covers the whole country.
   */
  subdivisions?: SubdivisionCode[];
  /** Families of the insured in the underwriting scopes of its products. */
  insured_families?: InsuredFamily[];
  licence_check: ListingCheck;
  /** Date when the registry first listed the server. */
  listed_since: DateString;
}

/** The last licence check of a listed server, for the country asked. */
export interface ListingCheck {
  /**
   * The register entries that make the server licensed in the country asked.
   * @minItems 1
   */
  entries: RegisterIdentifier[];
  /** When the registry last read these entries in their registers. */
  checked_at: DateTimeString;
}

/* ========================================================================== */
/* 4. Search                                                                  */
/* ========================================================================== */

/**
 * Params of `search_distributors`. The params describe a market, never a
 * person.
 */
export interface SearchDistributorsParams {
  /** Country where the customer buys. */
  country: CountryCode;
  /** Subdivision where the customer buys, for example a US state. */
  subdivision?: SubdivisionCode;
  line?: ProductLine;
  /** Family of the insured, as in the underwriting scope of a product, for example "pet" or "dwelling". */
  insured_family?: InsuredFamily;
  /** Return only servers of this level or above. */
  min_conformance_level?: ConformanceLevel;
  cursor?: string;
}

/**
 * Result of `search_distributors`.
 *
 * - Each server in `distributors` MUST match every param of the search: the
 *   country is in its `countries`, the line is in its `lines`, the subdivision
 *   is in its `subdivisions` when it has some, the insured family is in its
 *   `insured_families`, and its level is not below `min_conformance_level`.
 * - The registry MUST return every listed server that matches, across the
 *   pages.
 * - The order carries no meaning. The registry MUST NOT rank a server for a
 *   payment or for any commercial link. It SHOULD shuffle the order for each
 *   new search, and keep that order across the pages of the same search.
 * - An agent MUST NOT show the order to the customer as a ranking.
 * - A search result is not a licence check. An agent checks the seller with
 *   `verify_licence` before it sends any of the customer's answers.
 */
export interface SearchDistributorsResult {
  distributors: ListedDistributor[];
  next_cursor?: string;
}

/* ========================================================================== */
/* 5. Licence check                                                           */
/* ========================================================================== */

/**
 * Most days between the read of a register entry and a verdict that rests on
 * it. A read that is older counts as a register that did not answer.
 */
export const MAX_READ_AGE_DAYS = 7;

/**
 * Countries where a licence applies per subdivision. A check for one of them
 * MUST give the subdivision where the customer buys.
 */
export const PER_SUBDIVISION_COUNTRIES: CountryCode[] = ["US"];

/** A seller to check. The domain is where the customer's answers go. */
export interface SellerSubject {
  /** Domain of the MCP server or the website that receives the customer's answers. */
  domain: DomainName;
  /** Register entry that the seller shows, for example in the legal notice of its website. */
  identifier?: RegisterIdentifier;
  /** Legal name that the seller shows. */
  legal_name?: string;
}

/** A provider to check, for example from `Offer.provider`. Give its domain, a register entry, or both. */
export type ProviderSubject =
  | {
      domain: DomainName;
      identifier?: RegisterIdentifier;
      legal_name?: string;
    }
  | {
      identifier: RegisterIdentifier;
      legal_name?: string;
    };

/**
 * Params of `verify_licence` for a seller. Every distribution role counts,
 * including an insurer that sells its own products.
 *
 * The check MUST work for a seller that the registry does not list. An agent
 * can find a seller anywhere on the web, and the check matters most then.
 */
export interface DistributorCheckParams {
  capacity: "distributor";
  subject: SellerSubject;
  /** Country where the customer buys. */
  country: CountryCode;
  /**
   * Subdivision where the customer buys. REQUIRED for a country in
   * `PER_SUBDIVISION_COUNTRIES`, such as the United States.
   */
  subdivision?: SubdivisionCode;
  line?: ProductLine;
}

/**
 * Params of `verify_licence` for the party that carries the risk, for example
 * the insurer in `Offer.provider`. Only a provider role counts.
 */
export interface ProviderCheckParams {
  capacity: "provider";
  subject: ProviderSubject;
  /** Country where the customer buys. */
  country: CountryCode;
  /**
   * Subdivision where the customer buys. REQUIRED for a country in
   * `PER_SUBDIVISION_COUNTRIES`, such as the United States.
   */
  subdivision?: SubdivisionCode;
  line?: ProductLine;
}

/**
 * Params of `verify_licence`. The params name a company and a market, never a
 * person. A seller check always names the domain that receives the customer's
 * answers, because a register number alone does not prove who runs a website.
 */
export type VerifyLicenceParams = DistributorCheckParams | ProviderCheckParams;

/** Status of one register entry, as the registry reads it. */
export type LicenceStatus =
  /** The entry is in force. */
  | "active"
  /** The entry ended with no sanction: not renewed, expired, or removed at the holder's request. */
  | "lapsed"
  /** The regulator suspended the entry for a time. */
  | "suspended"
  /** The regulator withdrew the entry, or struck it off as a sanction. */
  | "revoked"
  /** The register has no entry with this identifier. */
  | "not_found"
  /** The entry exists, but its name does not match the name that the seller declares or shows. */
  | "name_mismatch";

/** The result of reading one entry in one public register. */
export interface LicenceCheck {
  country: CountryCode;
  /** Supervising authority, for example "ACPR", "FCA", or a US state insurance department. */
  regulator: string;
  /** Name of the public register, for example "ORIAS", "FCA Register", "NIPR". */
  register: string;
  identifier_type: RegisterIdentifierType;
  identifier: string;
  /** Role that the entry gives. Omit when the status is "not_found". */
  role?: DistributorRole;
  status: LicenceStatus;
  /** The status in the words of the register, for example "Authorised" or "Inscrit". */
  register_status?: string;
  /** Register categories, for example ORIAS "COA" or US lines of authority. */
  categories?: string[];
  /**
   * Lines that the categories cover, mapped by the registry. Omit when the
   * categories cover every line.
   */
  lines?: ProductLine[];
  /** Subdivisions where the entry applies. Omit when it covers the whole country. */
  subdivisions?: SubdivisionCode[];
  /**
   * Other countries where the entry may operate, under the freedom to provide
   * services or the freedom of establishment (EU and EEA), as the register
   * shows them.
   */
  passports?: CountryCode[];
  /** Name of the holder in the register. */
  name_in_register?: string;
  /** Last day of the entry, when the register gives one. */
  valid_until?: DateString;
  /** How the registry read the register. */
  access: SourceAccess;
  /** Date of the data in the source, when it is older than the read, for example the date of a bulk file. */
  source_date?: DateString;
  /** When the registry read this entry. */
  checked_at: DateTimeString;
  /** Public page where anyone can check the entry, or the search page of the register. */
  source_url: Url;
}

/**
 * How the registry tied a domain to register entries. Only "register" and
 * "confirmed" support the verdict "licensed".
 */
export type DomainLink =
  /** The register gives this domain for the entry. */
  | "register"
  /**
   * The operator confirmed with the holder of the entry that the domain is
   * theirs, through contact details that the register or the regulator gives.
   */
  | "confirmed"
  /** Only the domain says that the entries are its own, for example in the `get_distributor` result of its AIP server. */
  | "claimed"
  /** Nothing ties the domain to the entries. */
  | "not_linked";

/** What the registry found about the party it checked. */
export interface CheckedSubject {
  /** Legal name, from the AIP server of the domain or from the register. */
  legal_name?: string;
  /** Legal entity identifier, from the AIP server of the domain or from the register. */
  lei?: Lei;
  domain?: DomainName;
  /** How the registry tied the domain to the entries. Present when the params give a domain. */
  domain_link?: DomainLink;
  /** True when the registry lists an AIP server on the domain. */
  listed: boolean;
  /** MCP endpoint of the listed server. */
  mcp_url?: Url;
}

/** Why a party holds no licence for what the agent asked. */
export type NotLicensedReason =
  /** The registers of the country have no entry for the party. */
  | "no_entry"
  /** Every entry found is lapsed, suspended or revoked. */
  | "licence_not_active"
  /** An entry is active, but its name does not match the name that the seller declares or shows. */
  | "name_mismatch"
  /** An entry is active, but its role does not allow the capacity asked, for example a broker checked as a provider. */
  | "role_not_covered"
  /** An entry is active, but not in the subdivision asked. */
  | "subdivision_not_covered"
  /** An entry is active, but its categories do not cover the line asked. */
  | "line_not_covered";

/** Why the registry cannot decide. */
export type UnknownReason =
  /** The registry reads no register for this country or subdivision. */
  | "country_not_covered"
  /** Licences in this country apply per subdivision, and the params give none. */
  | "subdivision_required"
  /** A register that applies did not answer, and the registry has no read that is recent enough. */
  | "register_unavailable"
  /** The params give only a domain, and the registry could not tie it to any entry. */
  | "subject_not_identified"
  /** An entry covers the question, but neither the register nor the holder of the entry confirms the domain. */
  | "domain_not_linked";

/** The answer to the question of the agent. */
export type LicenceVerdict =
  | {
      verdict: "licensed";
      /** Plain-language explanation that the agent can pass to the customer. */
      message: string;
    }
  | {
      verdict: "not_licensed";
      reason: NotLicensedReason;
      /** Plain-language explanation that the agent can pass to the customer. */
      message: string;
    }
  | {
      verdict: "unknown";
      reason: UnknownReason;
      /** Plain-language explanation that the agent can pass to the customer. */
      message: string;
    };

/**
 * Result of `verify_licence`.
 *
 * The registry tests each entry in this order. An entry covers the question
 * when it passes all five tests:
 * 1. Country: the entry exists, and its `country` is the country asked or its
 *    `passports` include it.
 * 2. Subdivision: it has no `subdivisions`, or they include the subdivision
 *    asked.
 * 3. Line: it has no `lines`, or no line is asked, or its `lines` include the
 *    line.
 * 4. Role: for the capacity "provider", its role is a provider role.
 * 5. Status: its status is "active".
 *
 * The verdict:
 * - "licensed" when at least one entry covers the question and, if the params
 *   give a domain, `domain_link` is "register" or "confirmed".
 * - "unknown" when no entry covers the question and the registry could not
 *   read every register that applies, or could not identify the party. Also
 *   when an entry covers the question but the domain link is "claimed" or
 *   "not_linked".
 * - "not_licensed" in every other case: the registry read every register that
 *   applies, and no entry covers the question. The reason comes from the entry
 *   that passed the most tests, and names the first test it failed: country
 *   "no_entry", subdivision "subdivision_not_covered", line
 *   "line_not_covered", role "role_not_covered", status "name_mismatch" or
 *   "licence_not_active".
 *
 * Rules for the registry:
 * - `licences` MUST list every entry that the registry read for the party in
 *   the registers that apply, including the entries that are not active.
 * - A verdict MUST rest only on reads made at most `MAX_READ_AGE_DAYS` days
 *   before `checked_at`. The registry SHOULD read the register again for each
 *   call when the register has an API or a web page.
 * - The registry SHOULD keep each result under its `check_id` for at least five
 *   years, so that it can confirm later what it said.
 *
 * Rules for the agent:
 * - An agent MUST check the seller, in the capacity "distributor", before it
 *   sends any of the customer's answers to that seller. The domain MUST be the
 *   domain of the server or the website that receives the answers. The agent
 *   gives the customer's country, the subdivision where licences apply per
 *   subdivision, and SHOULD give the line.
 * - An agent MUST check the provider of an offer, in the capacity "provider",
 *   before it applies or concludes, when the provider is not the seller.
 * - On "not_licensed", the agent MUST NOT send the customer's answers to that
 *   party, and MUST NOT apply or conclude through it. It MUST tell the customer
 *   why.
 * - On "unknown", the agent MUST tell the customer that the licence could not be
 *   checked, and why. It MUST NOT apply or conclude, and SHOULD NOT send the
 *   customer's answers. It MAY ask the seller for its register identifier and
 *   check again.
 * - An agent MUST keep each result that it relies on with the record of the
 *   sale, and SHOULD give the customer a copy.
 */
export interface VerifyLicenceResult {
  /** Identifier of this check, set by the registry. */
  check_id: string;
  /** The params of the call, so that the result is a complete record alone. */
  params: VerifyLicenceParams;
  subject: CheckedSubject;
  /** Every entry the registry read for the party. */
  licences: LicenceCheck[];
  outcome: LicenceVerdict;
  /** When the registry gave the verdict. */
  checked_at: DateTimeString;
}

/* ========================================================================== */
/* 6. Country rules                                                           */
/* ========================================================================== */

/** Params of `get_country_rules`. */
export interface GetCountryRulesParams {
  country: CountryCode;
  /** Adds the file of this subdivision, when one exists. */
  subdivision?: SubdivisionCode;
  /** Adds the file of this line in the country, when one exists. */
  line?: ProductLine;
}

/** Review state of a rules file. */
export type RulesStatus =
  /** Written by the maintainers. No regulator has endorsed this version. */
  | "draft"
  /** A regulator endorsed this version. */
  | "endorsed";

/**
 * One rules file of the buyer skill. The file is Markdown with a YAML front
 * matter. The front matter holds `country`, `version`, `owner`, `status`, and
 * `endorsed_by` and `reviewed_at` when they apply, with the same values as the
 * fields of this object. It also holds `subdivision` and `line` for a file of a
 * subdivision or of a line.
 */
export interface RulesFile {
  country: CountryCode;
  /** Present for the file of a subdivision. */
  subdivision?: SubdivisionCode;
  /** Present for the file of a line. */
  line?: ProductLine;
  /** Version of the file. A change in the text MUST change it. */
  version: string;
  /** Who maintains the file: the AIP maintainers, until a regulator takes it over. */
  owner: string;
  status: RulesStatus;
  /** Regulator that endorsed this version. REQUIRED when `status` is "endorsed". */
  endorsed_by?: string;
  /** Date of the last legal review. Omit when no review happened. */
  reviewed_at?: DateString;
  language: LanguageTag;
  /** The whole file, unchanged, front matter included. */
  content: string;
  /** SHA-256 of `content` as UTF-8 bytes. */
  sha256: Sha256;
  /** Public HTTPS address of the same file. */
  url: Url;
  /** URI of the same file in the skill that the registry serves over MCP, when it does. */
  skill_uri?: string;
}

/**
 * Result of `get_country_rules`.
 *
 * - `files` MUST start with the file of the country. The file of the
 *   subdivision and then the file of the line follow, when they exist.
 * - Each file MUST be the same text as the file of the same version in the
 *   skill, so that `sha256` is the same in both places.
 * - An agent MUST follow every file of the result. When the registry does not
 *   answer, the agent uses the copy in its installed skill, and SHOULD tell the
 *   customer which version it used.
 */
export interface GetCountryRulesResult {
  /** @minItems 1 */
  files: RulesFile[];
}

/* ========================================================================== */
/* 7. Errors                                                                  */
/* ========================================================================== */

export type RegistryErrorCode =
  /** The registry lists no server in this country, or has no rules file for it. */
  | "country_not_covered"
  /** A param is missing, not valid, or not defined by this draft. The registry kept nothing of the call. */
  | "invalid_params";

/**
 * Error returned in an MCP tool result with `isError: true`, in
 * `structuredContent.error`.
 *
 * A registry tool MUST refuse a call with a param that this file does not
 * define, and MUST NOT keep its value. That is how the registry stays free of
 * customer data.
 */
export interface RegistryError {
  code: RegistryErrorCode;
  message: string;
}

/* ========================================================================== */
/* 8. Tool index                                                              */
/* ========================================================================== */

export const REGISTRY_TOOL_NAMES = {
  search_distributors: "search_distributors",
  verify_licence: "verify_licence",
  get_country_rules: "get_country_rules",
} as const;

export type RegistryToolName = keyof typeof REGISTRY_TOOL_NAMES;

/**
 * Session and MCP annotations of each registry tool. A registry tool MUST NOT
 * require a session or a sign-in, so that the registry never learns who the
 * customer is.
 */
export const REGISTRY_TOOLS: {
  [K in RegistryToolName]: { session: SessionRequirement; readOnlyHint: boolean };
} = {
  search_distributors: { session: "none", readOnlyHint: true },
  verify_licence: { session: "none", readOnlyHint: true },
  get_country_rules: { session: "none", readOnlyHint: true },
};

/** Params and result type of each registry tool. */
export interface RegistryToolSignatures {
  search_distributors: { params: SearchDistributorsParams; result: SearchDistributorsResult };
  verify_licence: { params: VerifyLicenceParams; result: VerifyLicenceResult };
  get_country_rules: { params: GetCountryRulesParams; result: GetCountryRulesResult };
}
