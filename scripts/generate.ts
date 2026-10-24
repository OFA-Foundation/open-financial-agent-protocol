// Generates schema.json from schema.ts and registry.ts, with one definition for
// each exported type that has no type parameters.
import { isDeepStrictEqual } from "node:util";
import { join } from "node:path";
import { createGenerator } from "ts-json-schema-generator";
import ts from "typescript";

const root = join(import.meta.dir, "..");
const sources = ["schema.ts", "registry.ts"];
const outPath = join(root, "schema.json");

function isExportedType(statement: ts.Statement): statement is ts.InterfaceDeclaration | ts.TypeAliasDeclaration {
  if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) return false;
  if (statement.typeParameters) return false;
  return statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

const definitions: Record<string, unknown> = {};
let exported = 0;

for (const file of sources) {
  const path = join(root, file);
  const source = ts.createSourceFile(path, await Bun.file(path).text(), ts.ScriptTarget.ES2022, true);
  const names = source.statements.filter(isExportedType).map((statement) => statement.name.text);
  exported += names.length;

  const generator = createGenerator({
    path,
    tsconfig: join(root, "tsconfig.json"),
    expose: "export",
    jsDoc: "extended",
    topRef: true,
    skipTypeCheck: true,
  });

  for (const name of names) {
    for (const [definition, value] of Object.entries(generator.createSchema(name).definitions ?? {})) {
      // registry.ts imports types from schema.ts, so a name can come twice. It must mean the same thing.
      if (definition in definitions && !isDeepStrictEqual(definitions[definition], value)) {
        throw new Error(`${file} defines ${definition} differently from an earlier file`);
      }
      definitions[definition] = value;
    }
  }
}

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://openfinancialagent.org/schemas/0.1/schema.json",
  title: "Agentic Insurance Protocol (AIP), draft 0.1",
  description: "Generated from schema.ts and registry.ts. Do not edit by hand.",
  definitions: Object.fromEntries(
    Object.keys(definitions)
      .sort()
      .map((name) => [name, definitions[name]]),
  ),
};

await Bun.write(outPath, JSON.stringify(schema, null, 2) + "\n");
console.log(`${exported} exported types, ${Object.keys(definitions).length} definitions`);
