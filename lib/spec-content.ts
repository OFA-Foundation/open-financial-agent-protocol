// Builds the Markdown of each docs page. The spec page is hand-written in
// content/, with markers that this file replaces by tables generated from the
// source. The reference and the worked example are generated in full.
import { PROFILES } from "../profiles";
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
} from "./schema-source";
import { REFERENCE_HREF, repoFileUrl } from "./site";

export const SESSION_LABELS: Record<SessionRequirement, string> = {
  none: "None",
  signed_out_or_none: "None, or signed out",
  signed_in_read: "Signed in, read scope",
  signed_in_write: "Signed in, write scope",
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

/** README "Rules the checks cover" is one paragraph. The site shows one rule per line. */
function rulesList(): string {
  return readmeSection("Rules the checks cover")
    .split(/(?<=\.) (?=R\d+ )/)
    .map((rule) => rule.replace(/^(R\d+) /, "- **$1** "))
    .join("\n");
}

const MARKERS: Record<string, () => string> = {
  levels: levelsTable,
  tools: toolsTable,
  errors: errorsTable,
  profiles: profilesSection,
  "readme Rules the checks cover": rulesList,
  "readme Open points": () => readmeSection("Open points"),
};

/** Replaces each `<!-- ofap:name -->` marker with its generated Markdown. */
export function expandMarkers(markdown: string): string {
  return markdown.replace(/<!-- ofap:(.+?) -->/g, (_, name: string) => {
    const generate = MARKERS[name];
    if (!generate) throw new Error(`Unknown marker <!-- ofap:${name} -->`);
    return generate();
  });
}

export function specMarkdown(): string {
  return expandMarkers(readRepoFile("content/spec-0.1.md"));
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
  const sections = schemaSections().map((section) => {
    const names = section.types.flatMap((type) =>
      Object.keys(definitions).filter((name) => name === type || name.startsWith(`${type}<`)),
    );
    names.forEach((name) => placed.add(name));
    const body = names.map((name) => definitionMarkdown(name, definitions[name] ?? {})).join("\n\n");
    return `## ${section.number}. ${section.title}\n\n${body || "No types."}`;
  });
  const unplaced = Object.keys(definitions).filter((name) => !placed.has(name));
  if (unplaced.length) throw new Error(`Definitions with no section in schema.ts: ${unplaced.join(", ")}`);
  return [
    "# Schema reference, draft 0.1",
    `Every type of OFAP draft 0.1, generated from [\`schema.ts\`](${repoFileUrl("schema.ts")}) through [\`schema.json\`](/schemas/0.1/schema.json). The sections follow \`schema.ts\`. The rules in the descriptions use the RFC 2119 keywords.`,
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
    text: "The agent asks who sells and under which licence. Example Pets is a broker in the ORIAS register, and it declares level 4 for pet insurance in France.",
  },
  {
    file: "insurance-02-get_documents.result",
    title: "Get the documents",
    tool: "get_documents, result",
    text: "Two documents must reach the customer before they commit: the IPID and the general conditions. Each one has a version and the hash of its file.",
  },
  {
    file: "insurance-03-get_question_set.result",
    title: "Get the questions",
    tool: "get_question_set, result",
    text: "The questions come as a JSON Schema that builds on the `insurance/pet@0.1` profile. The microchip number is collected on the distributor's page, so the agent never asks for it.",
  },
  {
    file: "insurance-04-quote.params.partial",
    title: "Quote with partial answers",
    tool: "quote, params",
    text: "The agent quotes with the five answers it has.",
  },
  {
    file: "insurance-05-quote.result.needs_input",
    title: "Get the missing fields",
    tool: "quote, result",
    text: "The server lists what is missing. The agent asks Camille.",
  },
  {
    file: "insurance-06-quote.params.complete",
    title: "Quote with every answer",
    tool: "quote, params",
    text: "The agent sends the full answers to the same question set version.",
  },
  {
    file: "insurance-07-quote.result.complete",
    title: "Compare the offers",
    tool: "quote, result",
    text: "Two offers, one per tier, in the same shape. `answers_sha256` is the hash of the answers that the prices use.",
  },
  {
    file: "insurance-08-quote.result.no_offer",
    title: "Get a reason when there is no offer",
    tool: "quote, result",
    text: "For a dog born in 2015, the insurer makes no offer and gives a stable reason code.",
  },
  {
    file: "insurance-09-submit_application.params",
    title: "Apply",
    tool: "submit_application, params",
    text: "The agent applies for the first offer. It sends the parties, the declaration, the demands and needs, the documents it delivered and the contact consent.",
  },
  {
    file: "insurance-10-submit_application.result.proposed",
    title: "Get a PAP operation",
    tool: "submit_application, result",
    text: "Nothing is committed yet. The server returns a PAP operation whose terms hold the whole application, and Camille must approve this revision.",
  },
  {
    file: "insurance-11-operation.succeeded",
    title: "Keep the evidence",
    tool: "PAP operation, after confirmation",
    text: "Camille approves, and the agent confirms at the PAP operations endpoint. The operation succeeds and carries the evidence record, with the hash of the confirmed terms.",
  },
  {
    file: "insurance-12-amend_agreement.result.proposed",
    title: "Add a dog",
    tool: "amend_agreement, result",
    text: "Later, Camille adds a dog. The premium changes and a subject is added, so Camille must approve this revision too.",
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
    `A broker, Example Pets, sells the pet insurance of an insurer, Example Mutual, in France. An agent quotes a cat called Miso for Camille Martin, applies, and later adds a dog to the policy. All companies, people and prices are fictional. The repository writes these files with [\`scripts/examples.ts\`](${repoFileUrl("scripts/examples.ts")}) and checks them against the [schema](${REFERENCE_HREF}) and the rules on every push.`,
    ...steps,
  ].join("\n\n");
}
