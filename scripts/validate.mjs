// Checks the examples against schema.json, then checks the MUST rules that a
// JSON Schema cannot express. This is the seed of the conformance tests.
import Ajv from "ajv"; import Ajv2020 from "ajv/dist/2020.js"; import addFormats from "ajv-formats";
import crypto from "node:crypto"; import fs from "node:fs";
const dir = process.argv[2];
const schema = JSON.parse(fs.readFileSync(`${dir}/schema.json`, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv); ajv.addSchema(schema, "ofap");
const ajv20 = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv20);
const ex = (n) => JSON.parse(fs.readFileSync(`${dir}/examples/${n}.json`, "utf8"));
const canon = (v) => Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",")}}` : JSON.stringify(v);
const sha = (v) => crypto.createHash("sha256").update(canon(v)).digest("hex");
let fails = 0; const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) fails++; };
const valid = (def, data) => { const v = ajv.getSchema(`ofap#/definitions/${def}`); const r = v(data); return [r, v.errors]; };

const map = {
  "insurance-01-get_distributor.result": "GetDistributorResult", "insurance-02-get_documents.result": "GetDocumentsResult",
  "insurance-03-get_question_set.result": "GetQuestionSetResult", "insurance-04-quote.params.partial": "QuoteParams",
  "insurance-05-quote.result.needs_input": "QuoteResult", "insurance-06-quote.params.complete": "QuoteParams",
  "insurance-07-quote.result.complete": "QuoteResult", "insurance-08-quote.result.no_offer": "QuoteResult",
  "insurance-09-submit_application.params": "SubmitApplicationParams", "insurance-10-submit_application.result.proposed": "SubmitApplicationResult",
  "insurance-11-operation.succeeded": "SubmitApplicationResult", "insurance-12-amend_agreement.result.proposed": "AmendAgreementResult",
};
for (const [file, def] of Object.entries(map)) { const [r, e] = valid(def, ex(file)); ok(r, `${file} is a valid ${def}${r ? "" : " " + JSON.stringify(e.slice(0, 3))}`); }
const outcome = ex("insurance-11-operation.succeeded").operation.result.data;
ok(valid("ApplicationOutcome", outcome)[0], "insurance-11 result.data is a valid ApplicationOutcome");

const { PROFILES } = await import(new URL(process.argv[3], `file://${process.cwd()}/`).href);
for (const p of PROFILES) ajv20.compile(p.answers_schema);
ok(true, `R1 the ${PROFILES.length} line profiles compile as JSON Schema 2020-12`);
const qs = ex("insurance-03-get_question_set.result").question_set; const answers = ex("insurance-06-quote.params.complete").answers;
const profile = PROFILES.find(p => p.id === qs.profile);
ok(profile && profile.answers_schema.required.every(k => qs.answers_schema.properties[k]), `R2 ${qs.question_set_id} has every required question of ${qs.profile}`);
ok(ajv20.compile(qs.answers_schema)(answers), `R3 answers match ${qs.question_set_id}`);
ok(!ajv20.compile(qs.answers_schema)(ex("insurance-04-quote.params.partial").answers), "R3 partial answers do not match, so needs_input is right");
const sensitive = Object.entries(qs.answers_schema.properties).filter(([, p]) => p["x-collected-by"] === "distributor_page").map(([k]) => k);
ok(sensitive.every(k => !(k in answers)), `R4 no distributor_page field in agent answers for ${qs.question_set_id} (${sensitive.join(", ")})`);
ok(ex("insurance-07-quote.result.complete").answers_sha256 === sha(answers), "R5 answers_sha256 is the SHA-256 of the canonical answers");

const application = ex("insurance-10-submit_application.result.proposed").operation;
const t = application.terms;
const docs = ex("insurance-02-get_documents.result").documents;
ok(docs.filter(d => d.required_before_commitment).every(d => t.documents_delivered.some(x => x.document_id === d.document_id && x.version === d.version && x.sha256 === d.sha256)), "R6 every required document was delivered, same version and digest");
ok(t.declaration.accuracy_confirmed === true, "R7 accuracy confirmed before the proposal");
ok(t.needs_assessment.sector === t.sector && t.pricing.sector === t.sector, "R8 needs assessment and pricing are of the offer's sector");
ok(application.user_approval_required === true, "R9 the application needs the customer's own approval");
ok(docs.some(d => d.type === "ipid" && d.required_before_commitment), "R10 a non-life insurance product has an IPID required before commitment");
ok(outcome.evidence.terms_sha256 === sha(t), "R11 evidence terms_sha256 matches the confirmed terms");
const amend = ex("insurance-12-amend_agreement.result.proposed").operation;
const needsApproval = canon(amend.terms.pricing_before) !== canon(amend.terms.pricing_after) || amend.terms.amount_due_now !== undefined
  || amend.terms.changes.some(c => ["add_party", "remove_party", "add_subject", "remove_subject"].includes(c.kind));
ok(!needsApproval || amend.user_approval_required === true, "R12 a price change, an amount due, or a change of party or subject needs user_approval_required");
ok(ex("insurance-07-quote.result.complete").offers.every(o => !o.subscription_paths.includes("handoff") || o.handoff_url), "R13 handoff offers carry a handoff_url");
const nofer = ex("insurance-08-quote.result.no_offer");
ok(nofer.offers.length > 0 || (nofer.no_offer && nofer.no_offer.reason_code), "R14 an empty quote gives a no_offer reason");
console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed"); process.exit(fails ? 1 : 0);
