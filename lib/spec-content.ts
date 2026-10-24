// Builds the Markdown of each docs page. The spec and registry pages are
// hand-written in content/, with markers that this file replaces by tables
// generated from the source. The reference and the worked example are
// generated in full.
import { PROFILES } from "../profiles";
import { REGISTRY_TOOLS, type RegistryToolName } from "../registry";
import { TOOLS, type ConformanceLevel, type SessionRequirement, type ToolName } from "../schema";
import type { ExampleName } from "../scripts/example-files";
import {
  errorCodes,
  levelNames,
  readmeSection,
  readRepoFile,
  schemaDefinitions,
  schemaSections,
  toolSignatures,
  type JsonSchema,
  type TypeSource,
} from "./schema-source";
import { REFERENCE_HREF, repoFileUrl } from "./site";

export const SESSION_LABELS: Record<SessionRequirement, string> = {
  none: "None",
  signed_out_or_none: "None, or signed out",
};

/** The anchor of a definition in the reference, for example `Operation<ApplicationTerms>` → `Operation-ApplicationTerms`. */
export function definitionAnchor(name: string): string {
  return name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cell(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|");
}

function table(head: string[], rows: string[][]): string {
  return [
    `| ${head.join(" | ")} |`,
    `|${head.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

const toolNames = Object.keys(TOOLS) as ToolName[];

function levelsTable(): string {
  const names = levelNames();
  const levels = [...new Set(toolNames.map((tool) => TOOLS[tool].level))].sort() as ConformanceLevel[];
  return table(
    ["Level", "Adds the tools", "Session (PAP)"],
    levels.map((level) => {
      const tools = toolNames.filter((tool) => TOOLS[tool].level === level);
      const sessions = [...new Set(tools.map((tool) => SESSION_LABELS[TOOLS[tool].session]))];
      return [`${level}. ${names[level] ?? ""}`, tools.map((tool) => `\`${tool}\``).join(", "), sessions.join("; ")];
    }),
  );
}

function toolsTable(): string {
  const signatures = toolSignatures();
  return table(
    ["Tool", "Level", "Session (PAP)", "Effect", "Params → result"],
    toolNames.map((tool) => {
      const { level, session, readOnlyHint, returnsOperation } = TOOLS[tool];
      if (readOnlyHint === returnsOperation) throw new Error(`${tool} must be either read-only or return an operation`);
      const signature = signatures[tool];
      if (!signature) throw new Error(`ToolSignatures has no entry for ${tool}`);
      return [
        `\`${tool}\``,
        String(level),
        SESSION_LABELS[session],
        returnsOperation ? "Returns a PAP operation" : "Read-only",
        `\`${signature.params}\` → \`${signature.result}\``,
      ];
    }),
  );
}

function errorsTable(): string {
  return table(
    ["Code", "Meaning"],
    errorCodes().map(({ code, meaning }) => [`\`${code}\``, meaning]),
  );
}

function questionType(property: Record<string, unknown>): string {
  const values = property["enum"];
  if (Array.isArray(values)) return values.map((value) => `\`${String(value)}\``).join(", ");
  const parts = [String(property["type"] ?? "any")];
  if (typeof property["format"] === "string") parts.push(`(${property["format"]})`);
  return parts.join(" ");
}

function profilesSection(): string {
  return PROFILES.map((profile) => {
    const required = new Set(profile.answers_schema.required ?? []);
    const rows = Object.entries(profile.answers_schema.properties).map(([key, property]) => {
      const ask = typeof property["x-ask"] === "string" ? property["x-ask"] : "";
      const note = typeof property["description"] === "string" ? property["description"] : "";
      return [`\`${key}\``, questionType(property), required.has(key) ? "Yes" : "", [ask, note].filter(Boolean).join(" ")];
    });
    return [
      `#### \`${profile.id}\``,
      `Derived from: ${profile.derived_from.join("; ")}.`,
      table(["Key", "Type", "Required", "Question or note"], rows),
    ].join("\n\n");
  }).join("\n\n");
}

/**
 * README "Rules the checks cover" lists the rules in running text: R1, R2… for
 * the insurer tools, then RG1, RG2… for the registry. The site shows the rules
 * of one prefix, one per line.
 */
function rulesList(prefix: "R" | "RG"): string {
  return readmeSection("Rules the checks cover")
    .split(/(?<=\.)\s+(?=RG?\d+ )/)
    .filter((rule) => new RegExp(`^${prefix}\\d+ `).test(rule))
    .map((rule) => rule.replace(/^(RG?\d+) /, "- **$1** "))
    .join("\n");
}

const registryToolNames = Object.keys(REGISTRY_TOOLS) as RegistryToolName[];

function registryToolsTable(): string {
  const signatures = toolSignatures("RegistryToolSignatures", "registry.ts");
  return table(
    ["Tool", "Session (PAP)", "Effect", "Params → result"],
    registryToolNames.map((tool) => {
      const { session, readOnlyHint } = REGISTRY_TOOLS[tool];
      const signature = signatures[tool];
      if (!signature) throw new Error(`RegistryToolSignatures has no entry for ${tool}`);
      return [
        `\`${tool}\``,
        SESSION_LABELS[session],
        readOnlyHint ? "Read-only" : "Changes data",
        `\`${signature.params}\` → \`${signature.result}\``,
      ];
    }),
  );
}

function registryErrorsTable(): string {
  return table(
    ["Code", "Meaning"],
    errorCodes("RegistryErrorCode", "registry.ts").map(({ code, meaning }) => [`\`${code}\``, meaning]),
  );
}

const MARKERS: Record<string, () => string> = {
  levels: levelsTable,
  tools: toolsTable,
  errors: errorsTable,
  profiles: profilesSection,
  "readme Rules the checks cover": () => rulesList("R"),
  "readme Open points": () => readmeSection("Open points"),
  "registry tools": registryToolsTable,
  "registry errors": registryErrorsTable,
  "registry rules": () => rulesList("RG"),
  "registry example": registryExampleSection,
};

/** Replaces each `<!-- aip:name -->` marker with its generated Markdown. */
export function expandMarkers(markdown: string): string {
  return markdown.replace(/<!-- aip:(.+?) -->/g, (_, name: string) => {
    const generate = MARKERS[name];
    if (!generate) throw new Error(`Unknown marker <!-- aip:${name} -->`);
    return generate();
  });
}

export function specMarkdown(): string {
  return expandMarkers(readRepoFile("content/spec-0.1.md"));
}

export function registryMarkdown(): string {
  return expandMarkers(readRepoFile("content/registry-0.1.md"));
}

/* Schema reference */

function refName(ref: string): string {
  return decodeURIComponent(ref.replace("#/definitions/", ""));
}

function typeLabel(schema: JsonSchema): string {
  if (schema.$ref) {
    const name = refName(schema.$ref);
    return `[\`${name}\`](#${definitionAnchor(name)})`;
  }
  if (schema.anyOf) return schema.anyOf.map(typeLabel).join(" or ");
  if (schema.enum) return `one of ${schema.enum.map((value) => `\`${String(value)}\``).join(", ")}`;
  if (schema.const !== undefined) return `\`${String(schema.const)}\``;
  const type = Array.isArray(schema.type) ? schema.type.join(" or ") : schema.type;
  if (type === "array") return `list of ${schema.items ? typeLabel(schema.items) : "any"}`;
  if (type === "object") {
    if (schema.properties) return `object with ${Object.keys(schema.properties).map((key) => `\`${key}\``).join(", ")}`;
    if (typeof schema.additionalProperties === "object") return `map of ${typeLabel(schema.additionalProperties)}`;
    return "object";
  }
  if (!type) return "any";
  return schema.format ? `${type} (${schema.format})` : type;
}

function fieldsTable(schema: JsonSchema): string {
  const required = new Set(schema.required ?? []);
  return table(
    ["Field", "Type", "Required", "Description"],
    Object.entries(schema.properties ?? {}).map(([key, property]) => [
      `\`${key}\``,
      typeLabel(property),
      required.has(key) ? "Yes" : "",
      property.description ?? "",
    ]),
  );
}

function variantLabel(variant: JsonSchema, index: number): string {
  const discriminant = Object.entries(variant.properties ?? {}).find(([, property]) => property.const !== undefined);
  return discriminant ? `\`${discriminant[0]}: ${String(discriminant[1].const)}\`` : `Variant ${index + 1}`;
}

function definitionBody(schema: JsonSchema): string {
  if (schema.properties) return fieldsTable(schema);
  if (schema.anyOf?.every((variant) => variant.properties)) {
    return schema.anyOf.map((variant, index) => `**${variantLabel(variant, index)}**\n\n${fieldsTable(variant)}`).join("\n\n");
  }
  const facts = [`Type: ${typeLabel(schema)}.`];
  if (schema.pattern) facts.push(`Pattern: \`${schema.pattern}\`.`);
  return facts.join(" ");
}

function definitionMarkdown(name: string, schema: JsonSchema): string {
  return [`### \`${name}\``, schema.description ?? "", definitionBody(schema)].filter(Boolean).join("\n\n");
}

export function referenceMarkdown(): string {
  const definitions = schemaDefinitions();
  const placed = new Set<string>();
  // The registry sections come after the sections of schema.ts, numbered R1, R2…
  const sources: { file: TypeSource; prefix: string }[] = [
    { file: "schema.ts", prefix: "" },
    { file: "registry.ts", prefix: "R" },
  ];
  const sections = sources.flatMap(({ file, prefix }) =>
    schemaSections(file).map((section) => {
      const names = section.types.flatMap((type) =>
        Object.keys(definitions).filter((name) => !placed.has(name) && (name === type || name.startsWith(`${type}<`))),
      );
      names.forEach((name) => placed.add(name));
      const body = names.map((name) => definitionMarkdown(name, definitions[name] ?? {})).join("\n\n");
      return `## ${prefix}${section.number}. ${section.title}\n\n${body || "No types."}`;
    }),
  );
  const unplaced = Object.keys(definitions).filter((name) => !placed.has(name));
  if (unplaced.length) throw new Error(`Definitions with no section in schema.ts or registry.ts: ${unplaced.join(", ")}`);
  return [
    "# Schema reference, draft 0.1",
    `Every type of AIP draft 0.1, generated from [\`schema.ts\`](${repoFileUrl("schema.ts")}) and [\`registry.ts\`](${repoFileUrl("registry.ts")}) through [\`schema.json\`](/schemas/0.1/schema.json). The sections follow \`schema.ts\`, then \`registry.ts\` from R1. The rules in the descriptions use the RFC 2119 keywords.`,
    ...sections,
  ].join("\n\n");
}

/* Worked example */

interface ExampleStep {
  file: ExampleName;
  title: string;
  tool: string;
  text: string;
}

const STEPS: ExampleStep[] = [
  {
    file: "insurance-01-get_distributor.result",
    title: "Find the distributor",
    tool: "get_distributor, result",
    text: "The agent asks who sells and under which licence. Example Pets is a broker in the ORIAS register, and it declares level 3 for pet insurance in France.",
  },
  {
    file: "insurance-02-list_products.params",
    title: "Look for a product",
    tool: "list_products, params",
    text: "Camille lives in France and wants to insure her cat. The agent asks for the products that cover a pet in France.",
  },
  {
    file: "insurance-03-list_products.result",
    title: "Read the underwriting scope",
    tool: "list_products, result",
    text: "The product publishes its scope before any question: France only, cats and dogs, and four conditions in plain words. The agent checks the conditions against what Camille said, and asks her when it is not sure.",
  },
  {
    file: "insurance-04-get_documents.result",
    title: "Get the documents",
    tool: "get_documents, result",
    text: "Two documents must reach the customer before they commit: the IPID and the general conditions. Each one has a version and the hash of its file.",
  },
  {
    file: "insurance-05-get_question_set.result",
    title: "Get the questions",
    tool: "get_question_set, result",
    text: "The questions come as a JSON Schema that builds on the `pet@0.1` profile. The microchip number is collected on the distributor's page, so the agent never asks for it.",
  },
  {
    file: "insurance-06-quote.params.partial",
    title: "Quote with partial answers",
    tool: "quote, params",
    text: "The agent quotes with the five answers it has. Each answer has a source. Camille gave four of them, and the agent read the breed from her photo.",
  },
  {
    file: "insurance-07-quote.result.needs_input",
    title: "Get the missing fields",
    tool: "quote, result",
    text: "The server lists what is missing. The agent asks Camille, and her vet clinic's record gives the date of birth.",
  },
  {
    file: "insurance-08-quote.params.complete",
    title: "Quote with every answer",
    tool: "quote, params",
    text: "The agent sends the full answers and their sources to the same question set version. The date of birth comes from a third party, named in `source_name`.",
  },
  {
    file: "insurance-09-quote.result.indicative",
    title: "Compare indicative offers",
    tool: "quote, result",
    text: "Two offers, one per tier, in the same shape. They are indicative, because Camille has not validated the answers yet. The two hashes cover the answers and their sources.",
  },
  {
    file: "insurance-10-quote.result.no_offer",
    title: "Get a reason when there is no offer",
    tool: "quote, result",
    text: "For a dog born in 2015, the insurer makes no offer and gives a stable reason code.",
  },
  {
    file: "insurance-11-quote.result.outside_scope",
    title: "Refuse a risk outside the scope",
    tool: "quote, result",
    text: "A cat that lives in Belgium is outside the geography of the scope. An agent that follows the rules does not send this quote. The server refuses it anyway, with the reason `outside_underwriting_scope`.",
  },
  {
    file: "insurance-12-validate_answers.params",
    title: "Ask Camille to validate the answers",
    tool: "validate_answers, params",
    text: "Camille wants a firm price. The agent sends the answers and their sources for validation.",
  },
  {
    file: "insurance-13-validate_answers.result.proposed",
    title: "Get a validation operation",
    tool: "validate_answers, result",
    text: "The server returns a PAP operation. Its summary shows each answer and where it came from, and only Camille can approve it.",
  },
  {
    file: "insurance-14-operation.validation.succeeded",
    title: "Record the validation",
    tool: "PAP operation, after confirmation",
    text: "Camille approves, and the agent confirms at the PAP operations endpoint. The server records who validated, when, and the hashes of the answers and their sources.",
  },
  {
    file: "insurance-15-quote.params.validated",
    title: "Quote with the validation",
    tool: "quote, params",
    text: "The agent sends the same answers and sources with the validation.",
  },
  {
    file: "insurance-16-quote.result.binding",
    title: "Get binding offers",
    tool: "quote, result",
    text: "The answers are validated, so the offers are binding. Each one gives its excess and its limits, and the version of the scope it applied.",
  },
  {
    file: "insurance-17-submit_application.params",
    title: "Apply",
    tool: "submit_application, params",
    text: "The agent applies for the first offer. It sends the parties, the validated declaration, the demands and needs, the documents it delivered and the contact consent.",
  },
  {
    file: "insurance-18-submit_application.result.proposed",
    title: "Get a PAP operation",
    tool: "submit_application, result",
    text: "Nothing is committed yet. The server returns a PAP operation whose terms hold the whole application, and Camille must approve this revision.",
  },
  {
    file: "insurance-19-operation.application.succeeded",
    title: "Keep the evidence",
    tool: "PAP operation, after confirmation",
    text: "Camille approves, and the agent confirms at the PAP operations endpoint. The operation succeeds and carries the evidence record: the hash of the confirmed terms, the hashes of the answers and their sources, the validation and the version of the scope.",
  },
];

export function exampleMarkdown(): string {
  const steps = STEPS.map((step, index) =>
    [
      `## ${index + 1}. ${step.title}`,
      `*${step.tool}* · [\`examples/${step.file}.json\`](${repoFileUrl(`examples/${step.file}.json`)})`,
      step.text,
      "```json\n" + readRepoFile(`examples/${step.file}.json`).trimEnd() + "\n```",
    ].join("\n\n"),
  );
  return [
    "# Worked example: pet insurance",
    `A broker, Example Pets, sells the pet insurance of an insurer, Example Mutual, in France. An agent finds the product, quotes a cat called Miso for Camille Martin, has her validate the answers, and applies for the first binding offer. All companies, people and prices are fictional. The repository writes these files with [\`scripts/examples.ts\`](${repoFileUrl("scripts/examples.ts")}) and checks them against the [schema](${REFERENCE_HREF}) and the rules on every push.`,
    ...steps,
  ].join("\n\n");
}

/* Registry example */

interface RegistryStep {
  title: string;
  tool: RegistryToolName;
  files: ExampleName[];
  text: string;
}

const REGISTRY_STEPS: RegistryStep[] = [
  {
    title: "Load the rules of the country",
    tool: "get_country_rules",
    files: ["registry-01-get_country_rules.params", "registry-02-get_country_rules.result"],
    text: "Camille lives in France and wants to insure her cat. The agent first loads the rules of France. The file is the one of the buyer skill, with its version, its owner, its status and its hash. This example shows the start of a draft file.",
  },
  {
    title: "Find the sellers",
    tool: "search_distributors",
    files: ["registry-03-search_distributors.params", "registry-04-search_distributors.result"],
    text: "The agent asks the registry for the sellers of pet insurance in France that can at least quote. The registry returns Example Pets, with the register entry that its listing rests on.",
  },
  {
    title: "Check a listed seller",
    tool: "verify_licence",
    files: ["registry-05-verify_licence.params.licensed", "registry-06-verify_licence.result.licensed"],
    text: "Before it sends any answer, the agent checks the domain that will receive them. The registry reads the ORIAS entry again, and the entry gives the website of Example Pets, so the link is `register`. The verdict is `licensed`. The agent keeps this result with the record of the sale.",
  },
  {
    title: "Check a seller found on the web",
    tool: "verify_licence",
    files: ["registry-07-verify_licence.params.no_licence", "registry-08-verify_licence.result.no_licence"],
    text: "Another site sells pet cover and gives an ORIAS number in its legal notice. ORIAS has no such entry. The verdict is `not_licensed`, so the agent sends nothing to that site and tells Camille why.",
  },
  {
    title: "Check a seller whose licence lapsed",
    tool: "verify_licence",
    files: ["registry-09-verify_licence.params.lapsed", "registry-10-verify_licence.result.lapsed"],
    text: "In another sale, in the United States, a licence applies per state, so the agent gives the state. The operator confirmed the agency's domain when it listed it. The Texas licence lapsed, and the Oklahoma licence does not cover a customer in Texas. The verdict is `not_licensed`, and the reason comes from the Texas entry.",
  },
  {
    title: "Check the insurer",
    tool: "verify_licence",
    files: ["registry-11-verify_licence.params.provider", "registry-12-verify_licence.result.provider"],
    text: "Back in France, before it applies for the offer, the agent checks Example Mutual, the insurer that carries the risk. A provider check can use the register entry from `Offer.provider` alone. The ACPR register shows an active authorisation, so the verdict is `licensed`.",
  },
];

function registryExampleSection(): string {
  return REGISTRY_STEPS.map((step) =>
    [
      `### ${step.title}`,
      `*${step.tool}* · ${step.files.map((file) => `[\`examples/${file}.json\`](${repoFileUrl(`examples/${file}.json`)})`).join(" · ")}`,
      step.text,
      ...step.files.map((file) => "```json\n" + readRepoFile(`examples/${file}.json`).trimEnd() + "\n```"),
    ].join("\n\n"),
  ).join("\n\n");
}
