# Agentic Insurance Protocol, draft 0.1

This is draft 0.1. A later draft can break it until 1.0. The source of truth is [`schema.ts`](https://github.com/OFA-Foundation/open-financial-agent-protocol/blob/main/schema.ts), and the [schema reference](/spec/0.1/reference) is generated from it. When this page and `schema.ts` differ, `schema.ts` wins.

## 1. Overview

AIP defines how an AI agent finds, prices and subscribes to an insurance product with any distributor. It also defines the evidence that each step leaves, so that a sale through an agent meets the same rules as a sale on the distributor's own site. Draft 0.1 covers the sale only. Servicing after the sale comes in a later draft.

AIP is an extension on top of two protocols:

- **MCP** carries every call. Each AIP primitive is an MCP tool. A tool puts its result in `structuredContent`, with a short plain-text summary in `content`.
- **PAP** carries the customer's session and every action with a business effect, through its [operations extension](https://personalagentprotocol.org/docs/0.2/extensions/operations). AIP defines only the insurance `terms` of those operations.

### 1.1 Roles

- **Agent.** The AI agent that acts for the customer. It calls the tools.
- **Distributor.** The company that runs the MCP server and sells the product: an insurer, a broker, a tied agent, an MGA or a comparator.
- **Provider.** The party that carries the risk. In insurance, the insurer. It can be the distributor itself.
- **Customer.** The person or organisation that buys. Every commitment needs their approval through PAP.

## 2. Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" are to be read as described in BCP 14 (RFC 2119, RFC 8174) when, and only when, they appear in all capitals.

- An amount is a `Money` object. Its `amount` is a decimal string such as `"14.90"`, so that no value is lost to floating point.
- Dates and times are ISO 8601. Countries are ISO 3166-1 alpha-2 codes, currencies ISO 4217 codes, and languages BCP 47 tags.
- A hash is a lower-case hex SHA-256. The hash of a JSON value is the SHA-256 of its canonical JSON ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)).

## 3. Discovery

A server declares AIP under `capabilities.extensions["org.openfinancialagent/ofap"]` in its MCP `server/discover` response, and under the same key in the `extensions` field of its PAP `poppy.json`. The value is an `AipSettings` object: the protocol version, the conformance level, the product lines and the countries the server covers, and whether it can conclude an agreement inside the agent.

## 4. Conformance levels

<!-- aip:levels -->

A server that declares a level MUST implement every tool of that level and of the levels below it. Level 3 needs only one of `submit_application` and `conclude`. A call to a tool above the declared level returns the error `not_supported`.

Level 2 includes `validate_answers`, so a server at level 2 can give binding offers. That tool returns a PAP operation, like the tools of level 3, so an agent needs the PAP operations extension to get a binding offer.

## 5. Tools

<!-- aip:tools -->

The session column follows PAP draft 0.2. A read-only tool sets the MCP `readOnlyHint` annotation. The tools that return an operation commit nothing on their own: see [Validation](#validation) and [Applications](#applications).

## 6. Distributor

`get_distributor` returns who sells, and under which licences. Its `domain` MUST match the server's own domain. Each `Licence` names the country, the regulator, the public register and the identifier, and the role. The registers of draft 0.1 are ORIAS in France, the FCA register in the United Kingdom, NIPR in the United States and the DGSFP register in Spain. A licence can apply to subdivisions only, for example some US states. `verification_url` is the public page where anyone can check the entry, and `complaints_url` is where a customer can complain.

The provider of a product or an offer is a `ProviderRef`. It lists its own licences, at least one, so that an agent can check the insurer that carries the risk as well as the distributor. For insurers, the register identifier can be the NAIC company code in the United States, or the LEI in any country.

## 7. Products and documents

`list_products` returns `Product` objects. It filters by country, subdivision, line and insured family, and it MUST return only the products that match every filter given. Each product gives its underwriting scope (see [Underwriting scope](#underwriting-scope)). The details of a product give its cover summary and the options a customer can add. Each product lists its subscription paths:

- `conclude`: the agent concludes the agreement with `conclude`.
- `application`: the agent sends `submit_application`, and the customer finishes on the distributor's page.
- `handoff`: the customer goes to the distributor's page with an offer reference.

`get_documents` returns the `InsuranceDocument` objects of a product or an offer: the IPID, the general and special conditions, the statement of demands and needs, or the proof of insurance. Each document has a version, set by the distributor, and the SHA-256 of the exact file at its `url`. A new text MUST get a new version. `required_before_commitment` is true when the law requires that the customer receives the document before they commit, for example the IPID.

### 7.1 Underwriting scope

Each product MUST publish its `UnderwritingScope`, with no customer data. An agent reads it before it asks a question, and drops a product that cannot cover the customer. The scope lives on the distributor's server, and a registry does not copy it.

| Part | What it holds |
|---|---|
| `geography` | The countries, and the ISO 3166-2 subdivisions such as US states. The product covers the whole of each country that has no subdivision in the list |
| `insured` | What the product insures: a family, such as `person`, `pet`, `dwelling` or `vehicle`, and the kinds it covers, for example `cat` and `dog` |
| `conditions` | Everything that a machine cannot check, in plain words, for example "Houses built after 1950 only" or "Not for people over 70" |

The geography and the insured types are the structured part, and the line profile tells which answers they apply to. A customer is inside the structured part when the `country` answer is one of its countries, and when the answer that the profile's `kind_key` names (for example `species` in `pet@0.1`) is one of the kinds of the profile's `insured_family`. Each kind in a scope MUST be a value that this question accepts.

- A server MUST NOT return an offer for a risk outside the structured part. `quote` then returns no offer, with the reason `outside_underwriting_scope`.
- An agent MUST NOT send answers to `quote` for a product whose structured part excludes the customer.
- Before it quotes, an agent SHOULD check the conditions against what the customer said, with one model call, and ask the customer when it is not sure.
- A change in any part of the scope MUST change its `version`. Each offer gives the version it applied, and the evidence record keeps it.

## 8. Question sets

`get_question_set` returns the questions of a product as a JSON Schema (2020-12) object, `answers_schema`. Each property is one question. AIP adds three keywords to a property:

| Keyword | Meaning |
|---|---|
| `x-collected-by` | `agent`, the default, or `distributor_page` |
| `x-profile-key` | The key of the matching question in the line profile |
| `x-ask` | A short question the agent can ask the customer, in plain words |

A value marked `distributor_page` MUST NOT pass through the agent. The customer gives it on the distributor's own page. Use it for identity numbers, bank account and card numbers, tax numbers, health details and passwords. A server that gets such a value anyway stores nothing and returns `sensitive_field_received`.

A change in any question MUST change the `version` of the question set. Answers to an old version get `question_set_outdated`.

### 8.1 Line profiles

A line profile is the common core of questions for one product line. A question set MUST include every required core question of its line, with the same key, and MAY add its own questions. Two products of the same line can then be quoted from the same answers. A profile needs a second distributor of the same line before it is stable.

<!-- aip:profiles -->

## 9. Quote

`quote` takes a product, a question set reference, the answers and their sources (see [Answer sources](#answer-sources)). The agent MAY send partial answers. The result has one of three states:

- `needs_input`: `missing_fields` lists the questions that are missing, not valid or not accepted. The agent asks the customer and calls `quote` again with more answers.
- `in_progress`: the agent reads the quote again after `retry_after_seconds`, and sends only the `quote_request_id`.
- `complete`: `offers` lists the priced offers. `answers_sha256` and `answer_sources_sha256` are the hashes of the answers and the sources used. When `offers` is empty, `no_offer` is REQUIRED. It gives a stable `reason_code`, such as `age_not_accepted` or `outside_underwriting_scope`, and a message the agent can pass to the customer. `KnownNoOfferReason` lists the common codes.

This one loop replaces the multi-step flow tools (`action`, `stateUpdates`, `sessionId`) that most servers use.

An `Offer` holds the provider, the version of the underwriting scope it applied, the pricing, the last moment it can be accepted (`valid_until`), and its subscription paths. An offer with the `handoff` path MUST have a `handoff_url`, and that URL MUST NOT contain personal data.

When `indicative` is true, the price can change after checks. Without a validation of the answers, every offer is indicative. A server MUST NOT return a binding offer (`indicative: false`) unless the quote carries the customer's validation of the same answers and sources (see [Validation](#validation)). The result then repeats that validation.

The `Pricing` of an offer holds the `Premium` (amount, period, and whether taxes are in it), the same price for other periods, the cover summary, the options and the start date. The `CoverSummary` lists what is included, the limits and reimbursement rates, the excess, the main exclusions and the waiting period. A binding offer MUST give the excess and the limits. An empty `limits` list means that the cover has no limit.

When a server implements `quote`, an agent MUST take the price, the cover, the limits and the excess that it shows the customer from the offer. It MUST NOT take them from a page made for people. Such a page can leave out the excess, show the price of another profile, or change after the agent reads it.

## 10. Answer sources and validation

The answers bind the contract. When an answer is false, the insurer can refuse a claim or cancel the cover, and today nobody can tell if the customer or the agent wrote it. AIP keeps the source of each answer, and the customer validates the answers before a binding offer.

### 10.1 Answer sources

Each call that sends answers also sends `answer_sources`: one `AnswerSource` for each answer, under the same key. An agent MUST give a source for each answer, and no source for a key that has no answer. Otherwise the server returns `answers_invalid`.

| `origin` | Who produced the value | `validated_by_customer` |
|---|---|---|
| `customer` | The customer | Always true |
| `agent` | The agent, for example from a photo or from earlier messages | True only when the customer confirmed this value |
| `third_party` | A third party, named in `source_name` by its kind and country, for example "vehicle register (FR)" | True only when the customer confirmed this value |

An agent MUST NOT set `validated_by_customer` to true when the customer did not validate that answer. The sources go with the answers in `quote`, in the validation, in the `Declaration` and in the evidence record, and `answer_sources_sha256` is their hash. The server MUST keep the sources with the declaration. The agent SHOULD keep a copy of what it sent.

### 10.2 Validation

An indicative price needs no validation. A binding offer and an application need answers that the customer validated, through `validate_answers`:

1. The agent sends the complete answers and their sources to `validate_answers`. When an answer is missing, the server returns `answers_invalid`.
2. The server returns a PAP operation. Its terms are a `ValidationTerms` object: the answers, the sources and their hashes. Its `summary` MUST show each answer and its source in plain words, so that the customer can check each one. The operation MUST have `user_approval_required: true`.
3. The agent MUST ask the person who will be the subscriber to approve the operation. Then it confirms at the PAP operations endpoint.
4. When the operation succeeds, `result.data` holds a `ValidationOutcome`. Its `AnswersValidation` records the operation and its revision, when the customer approved it, and the hashes of the answers and their sources. The server keeps it.
5. The agent sends the same answers and sources to `quote`, with the validation. The server can now return binding offers.
6. The application copies the validation into its `Declaration`, so the application freezes the validated answers. The server checks that the operation succeeded and that the hashes match. Otherwise it returns `answers_not_validated`.

`validated_by_customer` records the answers that the customer confirmed one by one during the conversation. The validation records that the customer approved the whole set, with its sources. The evidence keeps both, so an auditor can see which answers the customer checked only in the summary.

**Why a PAP operation.** A flag in the `quote` params would save one call, and the only evidence would be the agent's word. With an operation, the approval comes from the customer through PAP, so the insurer can prove who validated and when. AIP already uses the same mechanism for every commitment. The PAP operations extension is made for actions with a business effect, and a validated declaration has one: a false answer can cancel the cover. The extension does not ask for a payment or a contract.

## 11. Applications

`submit_application` and `conclude` return a PAP operation in `structuredContent.operation`. The agent confirms it at the PAP operations endpoint, never through an AIP tool. PAP is the authority for every field of the operation except `terms` and `aip_progress`. When the two differ, PAP wins.

The `terms` of an application are an `ApplicationTerms` object. They hold every field the law needs as evidence, so that a confirmed revision records exactly what the customer accepted:

- the offer, the provider, the pricing and the options;
- the parties, each with its roles, for example subscriber, insured, beneficiary or payer;
- the declaration: the answers and their sources, the question set version, their hashes, `accuracy_confirmed`, and the customer's validation;
- the needs assessment: the customer's demands and needs, recorded before the contract is concluded (IDD Art. 20(1));
- the documents delivered before this revision, each with its version and hash;
- the contact consent, and the withdrawal period when the law gives one.

Every document of the offer with `required_before_commitment: true` MUST be in `documents_delivered`. Otherwise the server returns `documents_not_delivered`. The pricing in the terms MUST be the pricing of the offer, unchanged. The declaration MUST carry a succeeded validation of the same answers and sources. Otherwise the server returns `answers_not_validated`.

When the distributor gave a personal recommendation, `advice_rationale` in the `NeedsAssessment` is REQUIRED and says why the offer meets the need.

`accuracy_confirmed` is true only when the customer confirmed that the answers are true and complete. The agent MUST NOT set it to true for invented or test data.

A `conclude` operation MUST have `user_approval_required: true`, so a standing permission is not enough. Only the latest revision of an operation can be confirmed, and the revision increases when the terms change. While an operation is `in_progress`, `aip_progress` can say why: a licensed person reviews the application, the provider decides, the customer must act on the distributor's page, or a payment is pending.

When the operation succeeds, `result.data` holds an `ApplicationOutcome` for an application, with the page where the customer finishes, or a `ConcludeOutcome` for a conclusion, with the agreement number and its documents. Both carry the evidence record.

## 12. Evidence

When an operation succeeds, the distributor keeps an `EvidenceRecord`. It links the exact revision the customer accepted to the documents delivered, the declaration, the needs assessment and the consent. It also keeps the hashes of the answers and of their sources, the customer's validation (operation and revision), and the version of the underwriting scope that the offer applied. Its `terms_sha256` is the hash of the confirmed `terms`. The distributor MUST keep the record for the period the law requires.

A PAP confirmation proves that an agent stated the customer approved a revision. It does not prove that the customer saw the terms. The evidence record adds what was delivered and what was declared. It still does not prove that the customer read the documents.

## 13. Errors

A tool returns an error in an MCP tool result with `isError: true`, as an `AipError` in `structuredContent.error`. PAP errors such as `insufficient_scope`, `sign_in_required` and `terms_changed` keep their PAP form.

<!-- aip:errors -->

## 14. Rules for the agent

Each rule below is in the section it comes from. This list puts the rules for an agent in one place, for the authors of agents and of the buyer skill.

- Read the underwriting scope before the quote. An agent MUST NOT send answers to `quote` for a product whose structured part excludes the customer, and SHOULD check the conditions with the customer (7.1).
- Values marked `distributor_page` MUST NOT pass through the agent (8).
- The price, the cover, the limits and the excess that the customer sees MUST come from `quote` when the server implements it, never from a page made for people (9).
- Each answer MUST have a source. The agent MUST NOT set `validated_by_customer` to true when the customer did not validate that answer (10.1).
- Before a binding offer or an application, the agent calls `validate_answers` and MUST ask the person who will be the subscriber to approve the operation (10.2).
- `accuracy_confirmed` MUST NOT be true for invented or test data (11).
- Operations are confirmed at the PAP operations endpoint, with the customer's approval, never through an AIP tool (10.2, 11).

## 15. Security and privacy

- Values marked `distributor_page` never pass through the agent.
- Data in a `Party` MUST be limited to what the product needs. Identity numbers MUST NOT be in a party.
- A `handoff_url` MUST NOT contain personal data.
- Every commitment goes through a PAP operation, and the evidence record keeps the hash of the terms the customer approved.
- The underwriting scope holds no customer data, so an agent can read it before it shares anything.

Report a weakness that could harm a live implementation privately, as [SECURITY.md](https://github.com/OFA-Foundation/open-financial-agent-protocol/blob/main/SECURITY.md) describes.

## 16. Checks

The repository builds a [worked pet insurance flow](/spec/0.1/example) and checks it against `schema.json` and against the rules that a JSON Schema cannot express:

<!-- aip:readme Rules the checks cover -->

## 17. Open points

<!-- aip:readme Open points -->

To give feedback, open an [issue](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new/choose).
