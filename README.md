# Agentic Insurance Protocol (AIP)

AIP defines how an AI agent finds, prices and subscribes to an insurance product with any distributor. It also defines the evidence that each step leaves, so that a sale through an agent meets the same rules as a sale on the distributor's own site.

Draft 0.1 covers the sale only. Servicing after the sale comes in a later draft.

AIP is an extension on top of two protocols. MCP carries every call. PAP carries the customer's session and every action with a business effect. AIP defines only what is specific to insurance.

Status: **draft 0.1**. A later draft can break this one until 1.0.

## Why

Personal agents and AI assistants now quote and buy insurance for people. Each distributor exposes a different shape. The MCP servers we looked at for this draft quote with different tool names, different inputs and different flows. An agent cannot compare two offers or do the same action twice in the same way.

MCP and PAP do not cover what insurance regulation asks for:

- **Right to sell.** Who holds a licence, from which regulator, in which role. This covers the insurer that carries the risk too.
- **Underwriting scope.** Which risks a product can cover, published before any question, so that an agent does not buy cover that cannot apply to the customer.
- **Pre-contract information.** The IPID and the general conditions must reach the customer before they commit.
- **Demands and needs.** The distributor records them before the contract (IDD Art. 20) and says if it gave advice.
- **Declaration.** The answers the customer commits to, with the exact questions they answered, where each answer came from, and the customer's validation.
- **Parties.** Subscriber, insured, beneficiary and payer can be different people.
- **Withdrawal period** after a distance sale.

## Files

| File | What it is |
|---|---|
| `schema.ts` | Source of truth. Every type, with the rules in RFC 2119 keywords |
| `registry.ts` | The registry: its tools, its types and its rules, with the conventions of `schema.ts` |
| `schema.json` | JSON Schema generated from `schema.ts` and `registry.ts`. Do not edit it by hand |
| `profiles.ts` | Line profiles: the common core of questions per product line |
| `examples/` | A worked pet insurance flow with fictional data: find the product and its scope, quote a cat, quote an older dog and a pet outside the scope that get no offer, validate the answers, get binding offers, apply, keep the evidence. The `registry-` files show a search, three licence checks and the rules of France |
| `scripts/` | Generate the schema, build the examples, run the checks |
| `content/`, `app/`, `components/`, `lib/` | The website at [openfinancialagent.org](https://openfinancialagent.org). See `AGENTS.md` |

Run `bun install`, then `bun run check`. It type-checks the schema and the scripts, so each example must match its schema type. Then it generates `schema.json`, rebuilds the examples, validates them, and runs the rule checks. CI runs the same command on every push. `bun run dev` previews the website, and `bun run build` builds it.

## What insurance law asks for

A sale through an agent must leave the same record as a sale on the distributor's own site. `schema.ts` gives a type to each thing that insurance law asks for, and `profiles.ts` holds the common questions of each line.

| Topic | Draft 0.1 |
|---|---|
| Pre-contract documents | IPID, general conditions |
| Needs assessment | Demands and needs (IDD Art. 20) |
| Underwriting scope | Geography, insured types, conditions in plain words |
| Declaration | Answers, the source of each answer, the customer's validation |
| Pricing | Premium, cover, limits, excess |
| Agreement | Policy |
| Line profiles | `pet`, `home` |

## Conformance levels

| Level | Tools | Session (PAP) |
|---|---|---|
| 1. Inform | `get_distributor`, `list_products`, `get_documents` | None |
| 2. Quote | + `get_question_set`, `quote`, `validate_answers` | None, or signed out. `validate_answers` returns a PAP operation |
| 3. Subscribe | + `submit_application` or `conclude` | Signed out is enough. The action is a PAP operation |

A server declares its level and its lines under `capabilities.extensions["org.openfinancialagent/ofap"]` in MCP `server/discover`, and under the same key in PAP `poppy.json`.

## Registry

One central MCP server helps a buying agent before it calls any seller. `search_distributors` finds the sellers that speak AIP in a country. `verify_licence` checks a seller, or the insurer behind an offer, in the public registers, and gives a verdict: `licensed`, `not_licensed` or `unknown`. `get_country_rules` returns the rules of a country for the buyer skill. The registry needs no customer data and no session. It works for a seller that it does not list, because an agent can find a seller anywhere on the web.

The registry lists a server only when the server proves its domain with `poppy.json`, holds an active licence in a public register, and has every tool of its level. [`content/registry-0.1.md`](content/registry-0.1.md) gives the rules and the public registers of the United States, the United Kingdom and France. Checks RG1 to RG8 cover its rules.

## Line profiles

| Profile | Derived from |
|---|---|
| `pet@0.1` | A pet insurer (FR, DE, SE) |
| `home@0.1` | A home insurer (ES) |

A product's question set must include every required question of its profile with the same key. Two products of the same line can then be quoted from one set of answers. Each profile needs a second distributor before it is stable. Commercial lines have no profile yet.

## Design choices

**One `quote` loop.** Most of the servers we looked at use multi-step flow tools (`action`, `stateUpdates`, `sessionId`). `quote` accepts partial answers and returns `needs_input` with the missing fields. Some of those servers already work this way.

**A list of offers, or a reason.** A quote returns one offer per tier or provider. When there is none, it returns a `no_offer` reason code, for example when the insurer does not accept the pet's age.

**Asynchronous quotes.** A quote can return `in_progress` and be read again with its `quote_request_id`.

**The underwriting scope comes before the questions.** Each product publishes the countries and subdivisions it covers, what it insures (a family such as `pet` or `dwelling`, and its kinds), and the other conditions in plain words. The geography and the insured types are mandatory and structured, so an agent drops a product that cannot cover the customer before it asks a question, and `quote` refuses a risk outside them with `outside_underwriting_scope`. Conditions such as "Not for people over 70" stay in plain words, because a fixed list cannot hold them all. The agent checks them with the customer. The scope lives on the insurer's server. A registry does not copy it.

**Each answer keeps its source.** An answer comes from the customer, from the agent, or from a named third party, and says whether the customer validated it. The sources go with the answers to `quote`, into the declaration, and into the evidence, with their own hash. When an answer turns out to be false, the record shows who produced it.

**The customer validates the answers through PAP.** An indicative price needs no validation. A binding offer and an application need the customer's validation of the answers and their sources. `validate_answers` returns a PAP operation that only the customer can approve, and its summary lists each answer with its source. A flag in `quote` would save one call, and its only evidence would be the agent's word. The operation gives the insurer a record of who validated and when, with the mechanism that AIP already uses for every commitment.

**The price comes from the tools.** A page made for people can leave out the excess or show the price of another profile. An agent takes the price, the cover, the limits and the excess from `quote`, and a binding offer must state its excess and its limits.

**Sensitive fields never pass through the agent.** A question marked `x-collected-by: distributor_page` (identity numbers, bank or card numbers, health details) is collected on the distributor's own page.

**No auth and no confirm step of our own.** Actions with a business effect return a PAP operation, and the agent confirms it at the PAP operations endpoint. `conclude` needs the customer's own approval of that revision. A standing permission is not enough.

**Evidence.** The terms of an application hold the parties, the declaration (answers and their sources, question set version, hashes, accuracy confirmed, validation), the needs assessment, every document delivered with its version and hash, and the contact consent. When the operation succeeds, the distributor keeps an `EvidenceRecord` with the hash of the confirmed terms, the hashes of the answers and their sources, the validation, and the version of the underwriting scope. A PAP confirmation alone does not prove that the customer saw the terms. This record adds what was delivered and what was declared.

## Rules the checks cover

R1 profiles compile. R2 a question set has every required question of its profile. R3 answers match their question set. R4 no `distributor_page` field in agent answers. R5 `answers_sha256` and `answer_sources_sha256` are the SHA-256 of the canonical JSON (RFC 8785). R6 every document required before commitment was delivered, same version and digest. R7 accuracy confirmed before a proposal. R8 an application and a validation need the customer's own approval. R9 a non-life insurance product has an IPID required before commitment. R10 the evidence hash matches the confirmed terms. R11 a handoff offer has a `handoff_url`. R12 an empty quote gives a reason. R13 each subdivision of an underwriting scope is in its countries, and each kind is a value of the profile's kind question. R14 `list_products` returns only the products that match its filters. R15 offers cover only risks inside the structured scope, and a risk outside it gets `outside_underwriting_scope`. R16 the agent quotes only inside the structured scope. R17 every answer has one source, and every source has an answer. R18 a binding offer comes from a quote with the customer's validation of the same answers and sources. R19 the declaration of an application carries a succeeded validation of the same answers and sources. R20 the evidence keeps the hash of the sources, the validation and the scope version of the offer. R21 a binding offer gives the excess and the limits of its cover. R22 the pricing of an application is the pricing of its offer.

RG1 a search returns only listed servers that match every param. RG2 the verdict of a licence check follows from the entries it read and from the domain link. RG3 every entry was read at most seven days before the verdict. RG4 a licence check repeats the params of the call. RG5 a check in a country where licences apply per subdivision gives the subdivision. RG6 the hash and the front matter of a rules file match the file. RG7 the rules start with the file of the country. RG8 the registry tools need no session, and their params hold no customer data.

## Open points

1. **Conversation-only distributors.** `ConversationData` is a proposal. Decide whether a distributor that exposes only a company agent can reach level 2 if it returns structured quotes.
2. **PAP fields.** `Operation` mirrors PAP draft 0.2 and rejects unknown fields. It must accept new PAP fields before 1.0.
3. **Profiles.** A second distributor for the pet and home profiles, and profiles for commercial lines.
4. **Servicing after the sale.** Draft 0.1 stops at the sale. A later draft adds a level 4 for what comes after it: read and change an agreement, renew it, cancel it, and open and follow a claim.
5. **Legal review** of the IDD references, country by country.
6. **Governance.** FINOS (Linux Foundation) is a candidate home, next to MCP and A2A.
7. **Product lines and product lists.** Some insurers do not sort their products by line and country, and do not keep a fixed product list. Decide if `list_products` and the line profiles stay in this form.
8. **Who carries the risk.** The insurer's balance sheet carries the risk, and the customer has no way to see it today. Decide what a provider publishes about it, and how an agent shows it.
9. **Signed results.** An agent cannot prove what the insurer said, for example the price or the scope. Decide if results carry the insurer's signature, so that an agent can show them as the insurer's own words.
10. **Behaviour of the agent.** The checks cover what the examples show. They cannot check what happened in the conversation, for example whether the customer validated an answer or saw the summary. The buyer skill and test sandboxes can cover it.

## Related work

- [MCP](https://modelcontextprotocol.io/specification/latest) and its [extensions](https://modelcontextprotocol.io/extensions/overview)
- [PAP draft 0.2](https://personalagentprotocol.org/docs/0.2/spec) and its [operations extension](https://personalagentprotocol.org/docs/0.2/extensions/operations)
- [AFSP](https://agenticfinanceprotocol.org/), which covers trust before a bank account opening. AIP covers the product, the offer and the evidence, so the two can work together.
- [RFC 8785, JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)

## Feedback and contributions

The specification is a draft. To send feedback or line profile data, open an [issue](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new/choose). To change this repository, see [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately, as [SECURITY.md](SECURITY.md) describes.

## Licence

The specification, the schema and the examples are licensed under the [Apache License 2.0](LICENSE).
