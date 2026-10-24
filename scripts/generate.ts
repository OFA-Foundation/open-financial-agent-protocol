// Generates schema.json from schema.ts, with one definition for each exported
// type that has no type parameters.
import { join } from "node:path";
import { createGenerator } from "ts-json-schema-generator";
import ts from "typescript";

const root = join(import.meta.dir, "..");
const schemaPath = join(root, "schema.ts");
const outPath = join(root, "schema.json");

function isExportedType(statement: ts.Statement): statement is ts.InterfaceDeclaration | ts.TypeAliasDeclaration {
  if (!ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) return false;
  if (statement.typeParameters) return false;
  return statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

const source = ts.createSourceFile(schemaPath, await Bun.file(schemaPath).text(), ts.ScriptTarget.ES2022, true);
const names = source.statements.filter(isExportedType).map((statement) => statement.name.text);

const generator = createGenerator({
  path: schemaPath,
  tsconfig: join(root, "tsconfig.json"),
  expose: "export",
  jsDoc: "extended",
  topRef: true,
  skipTypeCheck: true,
});

const definitions: Record<string, unknown> = {};
for (const name of names) Object.assign(definitions, generator.createSchema(name).definitions);

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://openfinancialagent.org/schemas/0.1/schema.json",
  title: "Agentic Insurance Protocol (AIP), draft 0.1",
  description: "Generated from schema.ts. Do not edit by hand.",
  definitions: Object.fromEntries(
    Object.keys(definitions)
      .sort()
      .map((name) => [name, definitions[name]]),
  ),
};

await Bun.write(outPath, JSON.stringify(schema, null, 2) + "\n");
console.log(`${names.length} exported types, ${Object.keys(definitions).length} definitions`);
