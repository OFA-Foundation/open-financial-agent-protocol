# Open Financial Agent Protocol (OFAP)

OFAP defines how an AI agent finds, prices, subscribes to and services a regulated financial product with any distributor. It also defines the evidence that each step leaves, so that a sale through an agent meets the same rules as a sale on the distributor's own site.

Draft 0.1 covers insurance. The core does not depend on the sector, and each sector comes as a module on top of it. Credit and investment can follow as modules with no change to the core.

OFAP is an extension on top of two protocols. MCP carries every call. PAP carries the customer's session and every action with a business effect. OFAP defines only what is specific to regulated financial products.

Status: **draft 0.1**. A later draft can break this one until 1.0.

## Why

Personal agents and AI assistants now quote, buy and manage insurance for people. Each distributor exposes a different shape. The MCP servers we looked at for this draft quote with different tool names, different inputs and different flows. An agent cannot compare two offers or do the same action twice in the same way.

MCP and PAP do not cover what insurance regulation asks for:

- **Right to sell.** Who holds a licence, from which regulator, in which role.
- **Pre-contract information.** The IPID and the general conditions must reach the customer before they commit.
- **Demands and needs.** The distributor records them before the contract (IDD Art. 20) and says if it gave advice.
- **Declaration.** The answers the customer commits to, with the exact questions they answered.
- **Parties.** Subscriber, insured, beneficiary and payer can be different people.
- **Withdrawal period** after a distance sale.

Credit and investment ask for the same kinds of evidence in their own form. That is why the core stays sector-neutral.

## Files

| File | What it is |
|---|---|
| `schema.ts` | Source of truth. Every type, with the rules in RFC 2119 keywords |
| `schema.json` | JSON Schema generated from `schema.ts`. Do not edit it by hand |
| `profiles.ts` | Line profiles: the common core of questions per product line |
| `examples/` | A worked pet insurance flow with fictional data: quote a cat, quote an older dog that gets no offer, apply, add a dog |
| `scripts/` | Generate the schema, build the examples, run the checks |
| `content/`, `app/`, `components/`, `lib/` | The website at [openfinancialagent.org](https://openfinancialagent.org). See `AGENTS.md` |

Run `bun install`, then `bun run check`. It type-checks the schema and the scripts, so each example must match its schema type. Then it generates `schema.json`, rebuilds the examples, validates them, and runs the rule checks. CI runs the same command on every push. `bun run dev` previews the website, and `bun run build` builds it.

## Core and sector modules

The core holds what every regulated financial product needs: the distributor and its licences, products, documents, question sets, the quote loop, parties, the declaration, PAP operations, evidence and agreements. A sector module adds what the law of its sector asks for.

| What a module adds | Insurance (draft 0.1) |
|---|---|
| Pre-contract documents | IPID, general conditions |
| Needs assessment | Demands and needs (IDD Art. 20) |
| Pricing | Premium, cover, limits, excess |
| Agreement | Policy |
| Line profiles | `insurance/pet`, `insurance/home` |

Section 8 of `schema.ts` lists what a module must define, and says that a module must not change a core type or a core rule. A server declares the modules it implements in `sectors`, next to its conformance level.

Candidate modules for a later draft:

- **Credit.** SECCI and ESIS before commitment, creditworthiness under the CCD and the MCD, APR and total cost of credit.
- **Investment.** KID under PRIIPs, suitability or appropriateness under MiFID II, fees and risk indicator.

## Conformance levels

| Level | Tools | Session (PAP) |
|---|---|---|
| 1. Inform | `get_distributor`, `list_products`, `get_documents` | None |
| 2. Quote | + `get_question_set`, `quote` | None, or signed out |
| 3. Subscribe | + `submit_application` or `conclude` | Signed out is enough. The action is a PAP operation |
| 4. Service | + `get_agreement`, `amend_agreement` | Signed in, read or write scope |

A server declares its level, sectors and lines under `capabilities.extensions["org.openfinancialagent/ofap"]` in MCP `server/discover`, and under the same key in PAP `poppy.json`.

## Line profiles

| Profile | Derived from |
|---|---|
| `insurance/pet@0.1` | A pet insurer (FR, DE, SE) |
| `insurance/home@0.1` | A home insurer (ES) |

A product's question set must include every required question of its profile with the same key. Two products of the same line can then be quoted from one set of answers. Each profile needs a second distributor before it is stable. Commercial lines have no profile yet.

## Design choices

**One `quote` loop.** Most of the servers we looked at use multi-step flow tools (`action`, `stateUpdates`, `sessionId`). `quote` accepts partial answers and returns `needs_input` with the missing fields. Some of those servers already work this way.

**A list of offers, or a reason.** A quote returns one offer per tier or provider. When there is none, it returns a `no_offer` reason code, for example when the insurer does not accept the pet's age.

**Asynchronous quotes.** A quote can return `in_progress` and be read again with its `quote_request_id`.

**Sensitive fields never pass through the agent.** A question marked `x-collected-by: distributor_page` (identity numbers, bank or card numbers, health details) is collected on the distributor's own page.

**No auth and no confirm step of our own.** Actions with a business effect return a PAP operation, and the agent confirms it at the PAP operations endpoint. `conclude`, any change of price or amount due, and any change that adds or removes a party or a subject need the customer's own approval of that revision. A standing permission is not enough.

**Evidence.** The terms of an application hold the parties, the declaration (answers, question set version, hash, accuracy confirmed), the needs assessment, every document delivered with its version and hash, and the contact consent. When the operation succeeds, the distributor keeps an `EvidenceRecord` with the hash of the confirmed terms. A PAP confirmation alone does not prove that the customer saw the terms. This record adds what was delivered and what was declared.

## Rules the checks cover

R1 profiles compile. R2 a question set has every required question of its profile. R3 answers match their question set. R4 no `distributor_page` field in agent answers. R5 `answers_sha256` is the SHA-256 of the canonical JSON (RFC 8785). R6 every document required before commitment was delivered, same version and digest. R7 accuracy confirmed before a proposal. R8 needs assessment and pricing match the offer's sector. R9 an application needs the customer's own approval. R10 a non-life insurance product has an IPID required before commitment. R11 the evidence hash matches the confirmed terms. R12 a price change, an amount due, or a change of party or subject needs the customer's own approval. R13 a handoff offer has a `handoff_url`. R14 an empty quote gives a reason.

## Open points

1. **Conversation-only distributors.** `ConversationData` is a proposal. Decide whether a distributor that exposes only a company agent can reach level 2 if it returns structured quotes.
2. **PAP fields.** `Operation` mirrors PAP draft 0.2 and rejects unknown fields. It must accept new PAP fields before 1.0.
3. **Credit and investment modules.** Draft each one on the rules for sector modules (section 8 of `schema.ts`), with at least two distributors as input.
4. **Profiles.** A second distributor for the pet and home profiles, and profiles for commercial lines.
5. **Legal review** of the IDD references, country by country.
6. **Governance.** FINOS (Linux Foundation) is a candidate home, next to MCP and A2A.

## Related work

- [MCP](https://modelcontextprotocol.io/specification/latest) and its [extensions](https://modelcontextprotocol.io/extensions/overview)
- [PAP draft 0.2](https://personalagentprotocol.org/docs/0.2/spec) and its [operations extension](https://personalagentprotocol.org/docs/0.2/extensions/operations)
- [AFSP](https://agenticfinanceprotocol.org/), which covers trust before a bank account opening. OFAP covers the product, the offer and the evidence, so the two can work together.
- [RFC 8785, JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)

## Feedback and contributions

The specification is a draft. To send feedback or line profile data, open an [issue](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new/choose). To change this repository, see [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately, as [SECURITY.md](SECURITY.md) describes.

## Licence

The specification, the schema and the examples are licensed under the [Apache License 2.0](LICENSE).
