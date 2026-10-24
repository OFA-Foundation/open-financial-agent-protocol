# AIP registry, draft 0.1

This is draft 0.1 of the registry. A later draft can break it until 1.0. The source of truth is [`registry.ts`](https://github.com/OFA-Foundation/open-financial-agent-protocol/blob/main/registry.ts), and its types are in the [schema reference](/spec/0.1/reference#r1-registry-server) from section R1. When this page and `registry.ts` differ, `registry.ts` wins. The tools of each seller are in the [specification](/spec/0.1).

## 1. Overview

A buying agent calls the registry before it sends anything to a seller. The registry answers three questions, and it needs no customer data to answer them:

- **Who sells here?** `search_distributors` returns the sellers that speak AIP in a country, for a line.
- **Can this seller sell here?** `verify_licence` checks a seller, or the insurer behind an offer, in the public registers. It works for a seller that the registry does not list.
- **Which rules apply here?** `get_country_rules` returns the rules of a country for the buyer skill.

Each seller runs its own MCP server with the tools of the specification. The registry is the global search, and the server of each seller is the one-to-one. The registry does not price, it does not check the underwriting scope of a product, and it does not copy what a server publishes. Those stay on the seller's server.

### 1.1 Roles

- **Operator.** The organisation that runs the registry. It follows the rules on this page.
- **Agent.** The AI agent that acts for the customer. It calls the registry, then the seller.
- **Seller.** A distributor: the company that runs an AIP server and sells the product.
- **Provider.** The insurer that carries the risk. It can be the seller itself.
- **Register.** A public list of licensed insurers or intermediaries, kept by a regulator or for one. The registry reads it and never replaces it.

## 2. Conventions

The [conventions of the specification](/spec/0.1#conventions) apply. A subdivision is an ISO 3166-2 code, such as `US-TX`. A domain is a lower-case host name with no scheme and no path, such as `pets.example.com`.

## 3. Discovery

The buyer skill gives the address of the registry. The registry declares its extension under `capabilities.extensions["org.openfinancialagent/registry"]` in its MCP `server/discover` response. The value is a `RegistrySettings` object: the version, the countries where the registry checks licences, the countries that have rules, every register it reads, and the page where the operator publishes its method.

The registry SHOULD also serve the buyer skill through the [MCP Skills extension](https://modelcontextprotocol.io/extensions/skills/overview). An agent whose host loads skills over MCP then gets the whole skill from the registry. `get_country_rules` serves the same country files to every other agent.

## 4. Tools

<!-- aip:registry tools -->

Every registry tool is read-only and needs no session, so the registry never learns who the customer is. The params describe a market or a company, never a person. A registry tool MUST refuse a call with a param that this draft does not define, return `invalid_params`, and keep nothing of the call.

## 5. Search

`search_distributors` takes a country, and optionally a subdivision, a line, an insured family and a minimum conformance level. It returns `ListedDistributor` objects: the legal and trading names, the domain, the MCP endpoint and the address of `poppy.json`, the roles, the conformance level, the lines, the countries, the insured families, and the last licence check with its date.

- Each result MUST match every param of the search.
- The registry MUST return every listed seller that matches, across the pages.
- For a country where it lists no seller, the registry returns `country_not_covered`. An agent then does not read an empty list as "no seller exists".
- The order carries no meaning. The registry MUST NOT rank a seller for a payment or for any commercial link, and it SHOULD shuffle the order for each new search. An agent MUST NOT show the order to the customer as a ranking.

A search result is not a licence check. The agent checks the seller with `verify_licence` before it sends any of the customer's answers.

## 6. Licence check

`verify_licence` answers one question: can this party sell, or carry the risk, for a customer in this country, subdivision and line? It MUST work for a seller that the registry does not list. An agent can find a seller anywhere on the web, and the check matters most then.

### 6.1 What the agent asks

The params are a `DistributorCheckParams` or a `ProviderCheckParams` object.

- **A seller**, with the capacity `distributor`. The agent gives the domain of the server or the website that will receive the customer's answers. It can add the register entry and the legal name that the seller shows, for example in the legal notice of its website. A register number alone does not prove who runs a website, so a seller check always names the domain.
- **A provider**, with the capacity `provider`, for example the insurer in `Offer.provider`. The agent gives its domain, a register entry, or both. Only a provider role counts.

Both give the customer's country and, when the agent knows it, the line. Where a licence applies per subdivision, the subdivision is REQUIRED. In draft 0.1 that is the United States, where each state grants its own licences.

### 6.2 What the registry reads

The result lists every register entry that the registry read for the party, as `LicenceCheck` objects, and that includes the entries that are not active. Each entry gives the register and the identifier, the role, the categories, the subdivisions, the countries of an EU passport, the name in the register, the time of the read, how the registry read it, and the public page where anyone can check it.

| Status | Meaning |
|---|---|
| `active` | The entry is in force |
| `pending` | The regulator has not approved the entry yet |
| `lapsed` | The entry ended with no sanction: not renewed, expired, or removed at the holder's request |
| `suspended` | The regulator suspended the entry for a time |
| `revoked` | The regulator withdrew the entry, or struck it off as a sanction |
| `not_found` | The register has no entry with this identifier |
| `name_mismatch` | The entry exists, but its name does not match the name that the seller declares or shows |

`register_status` keeps the status in the words of the register, for example "Authorised" or "Inscrit".

### 6.3 Domains

Any domain can claim any register entry, for example in the `get_distributor` result of its AIP server. That proves control of the domain and nothing more. `DomainLink` says how the registry tied the domain to the entries:

| Link | Meaning | Supports `licensed` |
|---|---|---|
| `register` | The register gives this domain for the entry | Yes |
| `confirmed` | The operator confirmed with the holder of the entry, through contact details that the register or the regulator gives | Yes |
| `claimed` | Only the domain says that the entries are its own | No |
| `not_linked` | Nothing ties the domain to the entries | No |

### 6.4 Verdict

The registry tests each entry in this order: the country (or an EU passport into it), the subdivision, the line, the role for a provider, then the status. An entry that passes the five tests covers the question.

| Verdict | When | Reasons |
|---|---|---|
| `licensed` | An entry covers the question, and the domain link, when a domain is given, is `register` or `confirmed` | None |
| `not_licensed` | The registry read every register that applies, and no entry covers the question. The reason names the first test that the closest entry failed | `no_entry`, `subdivision_not_covered`, `line_not_covered`, `role_not_covered`, `name_mismatch`, `licence_not_active` |
| `unknown` | The registry cannot decide | `country_not_covered`, `subdivision_required`, `register_unavailable`, `subject_not_identified`, `domain_not_linked` |

Each verdict comes with a message in plain words that the agent can pass to the customer. A verdict MUST rest only on reads made at most seven days before it (`MAX_READ_AGE_DAYS`). The registry SHOULD read the register again for each call when the register has an API or a web page.

### 6.5 What the agent does

| Verdict | The agent |
|---|---|
| `licensed` | Goes on, and keeps the result with the record of the sale |
| `not_licensed` | MUST NOT send the customer's answers to that party, and MUST NOT apply or conclude through it. It MUST tell the customer why |
| `unknown` | MUST tell the customer that the licence could not be checked, and why. It MUST NOT apply or conclude, and SHOULD NOT send the customer's answers. It MAY ask the seller for its register entry and check again |

The agent MUST check the seller before it sends any of the customer's answers. It MUST check the provider of an offer before it applies or concludes, when the provider is not the seller. It MUST keep each result that it relies on with the record of the sale, and SHOULD give the customer a copy. The result repeats the params of the call, so it is a complete record on its own.

## 7. Country rules

`get_country_rules` returns the rules files of the buyer skill for a country. The file of the country comes first. The file of the subdivision and the file of the line follow, when they exist. The agent MUST follow every file of the result. For a country with no file, the registry returns `country_not_covered`.

Each file is Markdown with a YAML front matter:

```yaml
---
country: FR
version: 0.1.0
owner: AIP maintainers
status: draft
sources:
  - title: Directive (EU) 2016/97 on insurance distribution
    url: https://eur-lex.europa.eu/eli/dir/2016/97/oj
---
```

- `owner` is the AIP maintainers, until a regulator takes the file over.
- `status` is `draft`, or `endorsed` when a regulator endorsed this version. An endorsed file names the regulator in `endorsed_by`.
- `reviewed_at` is the date of the last legal review. The key is absent when no review happened.
- A file of a subdivision or of a line adds `subdivision` or `line`.
- `sources` lists the legal texts that the file rests on.

A `RulesFile` gives the same values, the whole file in `content`, its SHA-256, its public address, and its URI in the skill that the registry serves over MCP. The text MUST be the same as the file of the same version in the skill, so the hash is the same in both places. When the registry does not answer, the agent uses the copy in its installed skill, and SHOULD tell the customer which version it used.

A regulator that takes over the rules of its country changes one file. Each agent that loads the rules from the registry gets the change on its next call.

## 8. Listing

A seller asks the operator to be listed. The operator follows these steps:

1. The seller asks to be listed, and gives its domain.
2. The registry reads `https://{domain}/.well-known/poppy.json`. Its `organization.domain` MUST be the domain. As PAP requires, the document comes from that host, so it proves that the seller controls the domain.
3. It calls `get_distributor` on the MCP server that `poppy.json` names, in the `apis` entry of type `mcp`. The `domain` of the result MUST be the domain.
4. It checks each licence of the result in the public register of its country, as `verify_licence` does. It also confirms with the holder of each entry that the domain is theirs: the register gives the domain, or the operator asks the holder through contact details that the register or the regulator gives.
5. It checks that the server has every tool of the level it declares, and that the results of the level 1 tools match the schema.
6. It lists the server.

Rules for the operator:

- The registry MUST list a server only when steps 2 to 5 pass. A server that lacks one tool of its level MUST NOT be listed.
- The registry MUST NOT list a server that claims a licence whose status is `not_found` or `name_mismatch`. It MUST NOT link a register entry to a second domain unless the holder of the entry confirms the second domain too.
- A listed server appears in a search for a country only while its verdict there is `licensed`.
- The registry MUST check each listed server again at least every seven days (`RECHECK_DAYS`), and when the seller or a regulator asks. It SHOULD also check again when anyone reports a problem.
- When a licence stops being active, the registry MUST remove what that licence covered from the listing before it answers another search.
- When `poppy.json` or the MCP server goes away, or the server fails step 5, the registry MUST remove the listing.
- The registry keeps the fields of `ListedDistributor` and the licences. It MUST NOT copy the products, the underwriting scopes, the prices or the documents of a server.

## 9. Data sources

The registry reads public registers. It MUST read a register only through an access that the terms of the register allow, and under an agreement when the terms ask for one. This table gives what we found on the official pages on 24 October 2026. "Not verified" marks each fact that no official page confirmed.

| Country | Register | Covers | Identifier | Access | Terms of use | Cost | Changes | At launch |
|---|---|---|---|---|---|---|---|---|
| US | [NIPR Producer Database](https://nipr.com/industry-solutions/reports-and-alerts) | Producers (people and agencies), with each state licence and its lines of authority. A carrier report covers insurers | NPN (format not published), and each state licence number | Batch reports and an alerts web service, for subscribers | Fair Credit Reporting Act: a "permissible purpose" only. Needs an access form and a licence agreement | Paid per report and per tracked NPN (current prices not verified) | Every weeknight | Agreement and payment |
| US | [State lookups of 34 jurisdictions](https://sbs.naic.org/solar-external-lookup/), run by the NAIC for the state departments | Licensees and companies of those jurisdictions. Not California, Florida, New York or Texas | Licence number, NPN | Web page only | Bans automated downloads and republishing | Free | Not verified | No |
| US | [Texas Department of Insurance open data](https://data.texas.gov/dataset/Insurance-agencies-and-businesses-approved-to-mana/3yqc-fcdt) | Texas agents, adjusters and agencies | NPN, TDI licence number | Bulk file and query API. No status column: the expiry date gives it | No licence stated (not verified) | Free | Not stated. Rows changed on 22 and 23 October 2026 | Yes, Texas only |
| US | [NAIC Consumer Insurance Search](https://content.naic.org/cis_consumer_information.htm) | Insurers, with their lines, their licensed states and their website | NAIC company code, 5 digits | Web page only | No terms on the page. The NAIC sells its data under a licence agreement | Free to view | Not verified | Agreement |
| UK | [FCA Financial Services Register](https://register.fca.org.uk/s/legal-information) and its API | Authorised firms: intermediaries, appointed representatives, and insurers, including those that the PRA authorises | FRN, 6 or 7 digits | Web pages, and a free API with a key, for one firm per call (50 requests per 10 seconds) | A data feed to another website needs the FCA's written permission. No robots. The terms of the API itself are behind a login (not verified) | Free with a key | About every 24 hours | Agreement to serve the data to agents |
| UK | [FCA Register Extract Service](https://www.fca.org.uk/publication/documents/register-extract-handbook.pdf) | Most Register data, with no websites or email addresses | FRN | Bulk files | Signed subscriber agreement. A "re-sale use" licence covers services that help users check if a firm is regulated | About £11,300 a year plus VAT, for weekly firm data | Weekly or monthly | Paid |
| FR | [ORIAS](https://www.orias.fr/webService/mentionsLegalesWebService) | Intermediaries in insurance, banking and finance, and EEA intermediaries that work in France (category EII) | ORIAS number, 8 digits (seen on every entry, rule not published), and SIREN | Web search, and a SOAP web service after authorisation | No commercial reuse, no derived database, no robots | Web search free. Web service cost not stated | Not verified. Each entry renews every year by 1 March | Agreement |
| FR | [ACPR REGAFI, insurance part](https://www.regafi.fr/pages/api-acpr) | Insurers, mutuals and provident institutions, EEA insurers on a passport, and branches of non-EEA insurers | SIREN, LEI, ACPR id | Open-data API and exports, with no account | The terms "have not been defined yet". No dataset licence | Free | Daily | Yes, after written confirmation from the ACPR |
| EU | [EIOPA Register of Insurance Undertakings](https://register.eiopa.europa.eu/registers/register-of-insurance-undertakings) | EEA insurers, with their cross-border status in each country and their website | National code, LEI | Web, and CSV or Excel export | Reproduction allowed with the source acknowledged | Free | Weekly, on Friday | Yes |
| EU | [EIOPA register of insurance intermediaries](https://www.eiopa.europa.eu/tools-and-data/registers-lists-and-databases/register-insurance-intermediaries_en) | Links to the national registers only | None | Links | Not applicable | Free | Not applicable | No data |
| All | [GLEIF](https://www.gleif.org/en/meta/lei-data-terms-of-use) | Legal entities | LEI, 20 characters | API with no key, and full files | CC0 | Free | Three times a day | Yes |

### 9.1 At launch

With no agreement, a first registry can check:

- the insurers of France, from REGAFI, after the ACPR confirms in writing that the registry may reuse the data;
- the insurers of the EEA, including those that sell in France on a passport, from the EIOPA register;
- the agents and agencies of Texas, from the open data of the Texas Department of Insurance;
- the legal identity of a company in any country, from GLEIF. The LEI and the SIREN join GLEIF to REGAFI, EIOPA and ORIAS.

The intermediaries of the three countries need an agreement: NIPR for the United States, the FCA for the United Kingdom, and ORIAS for France. The insurers of the United States need one with the NAIC. NIPR also asks for a "permissible purpose" under the Fair Credit Reporting Act, and we have not verified that a registry qualifies. Until these agreements exist, `verify_licence` returns `unknown` with the reason `country_not_covered` for what the registry cannot read. The FCA's "re-sale use" licence names the use of the registry: to help users find out if a firm is regulated.

### 9.2 Domains in the registers

ORIAS, the EIOPA register and the NAIC show the website of an entry. The FCA Register can show one, and we have not verified that its API returns it. NIPR and the Texas data show none. When a register gives the website, the registry can tie a domain to the entry with the link `register`. The firm declares its website to the register itself, so another firm cannot add its own domain to the entry. In the other cases, the operator confirms the domain with the holder of the entry.

### 9.3 Status labels

The registry maps the labels of each register to a `LicenceStatus`, and keeps the label in `register_status`:

| Register | Labels |
|---|---|
| NIPR | Active, Pending, Inactive. Lines of authority such as Property, Casualty, Personal Lines, Life, and Accident and Health or Sickness |
| FCA | Authorised, EEA Authorised, Appointed representative, Registered, No longer authorised, Cancelled, Lapsed, Suspended, Revoked |
| ORIAS | Inscrit, Radié for the entry. Inscrit or Supprimé for each category: AGA, COA, MA, MAL, MIA and EII in insurance |
| REGAFI | Actif for an authorisation. An event can say that the insurer may not sell new contracts |

## 10. Trust and privacy

- Every result says where its data comes from and when the registry read it: the register, the access (API, file or web page), the date of the data in the source, the time of the read, and the public page of the entry.
- The registry never receives customer data. Its tools need no session, and their params describe a market or a company. Check RG8 tests the params of each tool against a closed list of fields.
- The registry SHOULD keep each `verify_licence` result under its `check_id` for at least five years, so that it can confirm later what it said.
- Draft 0.1 does not sign results, so an agent cannot yet prove alone what the registry said. See the open points.

## 11. Errors

A registry tool returns an error in an MCP tool result with `isError: true`, as a `RegistryError` in `structuredContent.error`.

<!-- aip:registry errors -->

## 12. Worked example

These calls come before the [pet insurance flow](/spec/0.1/example). All companies are fictional.

<!-- aip:registry example -->

## 13. Checks

The repository checks the examples against `schema.json`, and against the registry rules that a JSON Schema cannot express:

<!-- aip:registry rules -->

The listing steps, the order of the search results and the schedule of the checks are rules about how the operator works. A test of a live registry can check them. The examples cannot.

## 14. Open points

1. **Signed results.** A signature on each `verify_licence` result would let an agent prove later what the registry said, with no call to the registry. Draft 0.1 leaves signatures out. A later draft can add them, for example with a key that `RegistrySettings` publishes.
2. **Reading a past check.** The registry keeps each result under its `check_id`, but no tool reads it back yet.
3. **Confirming a domain.** The operator confirms the link between a domain and a register entry with its own method. A later draft can define one channel for it, for example a code that the register or the regulator sends to the holder.
4. **Names and categories.** How the registry compares a name with the name in a register, and how it maps the categories of a register to lines, is the operator's method for now. The operator publishes it at `policy_url`.
5. **US states.** The rules files of the US states come later. The US file covers the common points and says that the rules differ by state.
6. **Data agreements.** The intermediaries of the United States, the United Kingdom and France need an agreement with NIPR, the FCA and ORIAS. The insurers of the United States need one with the NAIC. See [At launch](#at-launch).
