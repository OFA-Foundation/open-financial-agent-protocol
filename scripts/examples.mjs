// Builds the worked insurance flow. All companies, people and prices are fictional.
//   Quote a cat, quote an older dog that gets no offer, apply for the cat, then
//   add a dog to the agreement.
import crypto from "node:crypto";
import fs from "node:fs";
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const canon = (v) => Array.isArray(v) ? `[${v.map(canon).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",")}}`
  : JSON.stringify(v);
const sha = (v) => crypto.createHash("sha256").update(typeof v === "string" ? v : canon(v)).digest("hex");
const write = (name, data) => fs.writeFileSync(`${out}/${name}.json`, JSON.stringify(data, null, 2) + "\n");
const delivered = (docs, at) => docs.map(d => ({ document_id: d.document_id, version: d.version, sha256: d.sha256, delivered_at: at }));

/* ---------------------------- Insurance flow ---------------------------- */
const insurer = { name: "Example Mutual", legal_name: "Example Mutual Assurances SA", role: "insurer" };
write("insurance-01-get_distributor.result", {
  legal_name: "Example Pets SAS", trading_name: "Example Pets", domain: "pets.example.com", roles: ["broker"],
  licences: [{ country: "FR", regulator: "ACPR", register: "ORIAS", identifier_type: "orias_number", identifier: "00000000", role: "broker", sectors: ["insurance"], categories: ["COA"], verification_url: "https://www.orias.fr/" }],
  countries: ["FR"], complaints_url: "https://pets.example.com/complaints",
  ofap: { version: "0.1", conformance_level: 4, interfaces: ["tools"], sectors: ["insurance"], lines: ["pet"], countries: ["FR"], can_conclude: false },
});
const ipid = { document_id: "doc-ipid-pet-fr", type: "ipid", title: "IPID Example Pets Essentiel", language: "fr", version: "2026-09", url: "https://pets.example.com/docs/ipid-essentiel-2026-09.pdf", media_type: "application/pdf", sha256: sha("ipid-essentiel-2026-09"), required_before_commitment: true };
const cg = { document_id: "doc-cg-pet-fr", type: "general_conditions", title: "Conditions générales", language: "fr", version: "2026-09", url: "https://pets.example.com/docs/cg-2026-09.pdf", media_type: "application/pdf", sha256: sha("cg-2026-09"), required_before_commitment: true };
write("insurance-02-get_documents.result", { documents: [ipid, cg] });
const qs = {
  question_set_id: "qs-pet-fr-essentiel", version: "3", product_id: "pet-fr-essentiel", sector: "insurance", line: "pet", profile: "insurance/pet@0.1",
  answers_schema: { type: "object", properties: {
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
    microchip_number: { type: "string", "x-collected-by": "distributor_page", description: "Collected on the distributor's page after the quote." },
  }, required: ["country", "postal_code", "species", "pet_name", "breed", "sex", "is_neutered", "date_of_birth", "currently_insured"] },
};
write("insurance-03-get_question_set.result", { question_set: qs });
const qsRef = { question_set_id: qs.question_set_id, version: qs.version };
const partial = { country: "FR", postal_code: "69003", species: "cat", pet_name: "Miso", breed: "European shorthair" };
write("insurance-04-quote.params.partial", { product_id: "pet-fr-essentiel", question_set: qsRef, answers: partial, language: "fr" });
write("insurance-05-quote.result.needs_input", { status: "needs_input", quote_request_id: "qr-7f3a", missing_fields: [
  { field: "sex", issue: "missing" }, { field: "is_neutered", issue: "missing" },
  { field: "date_of_birth", issue: "missing", message: "An approximate date is fine." }, { field: "currently_insured", issue: "missing" } ] });
const answers = { ...partial, sex: "female", is_neutered: true, date_of_birth: "2023-04-01", lifestyle: "indoor", currently_insured: false };
write("insurance-06-quote.params.complete", { product_id: "pet-fr-essentiel", question_set: qsRef, answers, language: "fr" });
const cover70 = { included: ["Accident", "Illness", "Surgery"], limits: [{ key: "vet_costs_per_year", label: "Frais vétérinaires par an", limit: { amount: "1500.00", currency: "EUR" }, reimbursement_rate: 0.7 }], excess: { amount: "0.00", currency: "EUR" }, main_exclusions: ["Pre-existing conditions"], waiting_period_days: 45 };
const prevention = { key: "prevention", label: "Forfait prévention", price: { amount: { amount: "3.00", currency: "EUR" }, period: "month", taxes_included: true } };
const offerA = { offer_id: "of-essentiel-70", product_id: "pet-fr-essentiel", sector: "insurance", tier: "Essentiel 70", provider: insurer, indicative: false,
  pricing: { sector: "insurance", premium: { amount: { amount: "14.90", currency: "EUR" }, period: "month", taxes_included: true },
    alternative_premiums: [{ amount: { amount: "171.00", currency: "EUR" }, period: "year", taxes_included: true }], cover: cover70, options: [prevention], start_date: "2026-11-01" },
  valid_until: "2026-11-19T23:59:59+01:00", subscription_paths: ["application", "handoff"], handoff_url: "https://pets.example.com/q/of-essentiel-70" };
const offerB = { ...offerA, offer_id: "of-essentiel-90", tier: "Essentiel 90", handoff_url: "https://pets.example.com/q/of-essentiel-90",
  pricing: { ...offerA.pricing, premium: { amount: { amount: "21.40", currency: "EUR" }, period: "month", taxes_included: true },
    alternative_premiums: [{ amount: { amount: "246.00", currency: "EUR" }, period: "year", taxes_included: true }],
    cover: { ...cover70, limits: [{ ...cover70.limits[0], limit: { amount: "2500.00", currency: "EUR" }, reimbursement_rate: 0.9 }] } } };
write("insurance-07-quote.result.complete", { status: "complete", quote_request_id: "qr-7f3a", question_set: qsRef, answers_sha256: sha(answers), offers: [offerA, offerB] });
const olderDog = { country: "FR", postal_code: "69003", species: "dog", pet_name: "Rocky", breed: "Labrador retriever", sex: "male", is_neutered: true, date_of_birth: "2015-06-01", currently_insured: false };
write("insurance-08-quote.result.no_offer", { status: "complete", quote_request_id: "qr-8b21", question_set: qsRef, answers_sha256: sha(olderDog), offers: [],
  no_offer: { reason_code: "age_not_accepted", message: "Example Mutual does not start cover for a dog older than 9 years." } });
const parties = [{ party_ref: "p1", kind: "person", roles: ["subscriber", "insured", "payer"], display_name: "Camille Martin", country_of_residence: "FR" }];
const declaration = { question_set: qsRef, answers, answers_sha256: sha(answers), accuracy_confirmed: true };
const needs = { sector: "insurance", kind: "demands_and_needs", statement: "Cover vet bills for an indoor cat, with a budget under 20 EUR a month.", advice_given: false, recorded_at: "2026-10-20T10:02:00+02:00" };
const deliv = delivered([ipid, cg], "2026-10-20T10:03:00+02:00");
const consent = { channels: ["email"], details_collected_by: "distributor_page", providers_may_contact: false, purposes: ["this_application"] };
write("insurance-09-submit_application.params", { offer_id: offerA.offer_id, parties, declaration, needs_assessment: needs, documents_delivered: deliv, contact_consent: consent, start_date: "2026-11-01" });
const terms = { offer_id: offerA.offer_id, product_id: offerA.product_id, sector: "insurance", provider: insurer, pricing: offerA.pricing, options: [], start_date: "2026-11-01", parties, declaration, needs_assessment: needs, documents_delivered: deliv, contact_consent: consent, withdrawal_period_days: 14 };
const op = { operation_id: "op-51c2", revision: 1, state: "proposed", summary: "Apply for Essentiel 70 cat insurance for Miso with Example Mutual, 14.90 EUR a month from 1 November 2026. You finish on Example Pets' site.", terms, expires_at: "2026-10-20T11:00:00+02:00", user_approval_required: true, url: "https://pets.example.com/ops/op-51c2", confirmation: null, result: null };
write("insurance-10-submit_application.result.proposed", { operation: op });
const evidence = { record_id: "ev-90aa", operation_id: op.operation_id, revision: 1, approved_by: "user", confirmed_at: "2026-10-20T10:05:12+02:00", documents_delivered: deliv, question_set: qsRef, answers_sha256: sha(answers), needs_assessment: needs, contact_consent: consent, terms_sha256: sha(terms) };
const { expires_at, ...opNoExpiry } = op;
write("insurance-11-operation.succeeded", { operation: { ...opNoExpiry, state: "succeeded", confirmation: { revision: 1, approved_by: "user", confirmed_at: evidence.confirmed_at },
  result: { summary: "Application received. Camille finishes on Example Pets' site.", data: { application_id: "app-3310", evidence, handoff_url: "https://pets.example.com/a/app-3310" } } } });
const dog = { subject_ref: "pet-2", kind: "pet", display_name: "Pixel", attributes: { species: "dog", breed: "Beagle", sex: "male", is_neutered: false, date_of_birth: "2025-02-10" } };
const amendDecl = { question_set: qsRef, answers: dog.attributes, answers_sha256: sha(dog.attributes), accuracy_confirmed: true };
write("insurance-12-amend_agreement.result.proposed", { operation: { operation_id: "op-77d0", revision: 1, state: "proposed",
  summary: "Add Pixel (beagle, born February 2025) from 1 December 2026. The premium goes from 14.90 to 31.20 EUR a month.",
  terms: { agreement_number: "EXP-2026-004812", changes: [{ kind: "add_subject", subject: dog }], effective_date: "2026-12-01",
    pricing_before: offerA.pricing, pricing_after: { ...offerA.pricing, premium: { amount: { amount: "31.20", currency: "EUR" }, period: "month", taxes_included: true }, alternative_premiums: undefined },
    declaration: amendDecl, documents_delivered: deliv },
  expires_at: "2026-11-20T12:00:00+01:00", user_approval_required: true, confirmation: null, result: null } });

console.log("examples written");
