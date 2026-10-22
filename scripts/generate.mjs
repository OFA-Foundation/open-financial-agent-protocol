import { createGenerator } from "ts-json-schema-generator";
import ts from "typescript";
import fs from "node:fs";
const [, , schemaPath, outPath] = process.argv;
const src = ts.createSourceFile(schemaPath, fs.readFileSync(schemaPath, "utf8"), ts.ScriptTarget.ES2022, true);
const names = [];
for (const s of src.statements) {
  const exported = s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
  if (exported && (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) && !s.typeParameters) names.push(s.name.text);
}
const gen = createGenerator({ path: schemaPath, tsconfig: "tsconfig.json", expose: "export", jsDoc: "extended", topRef: true, skipTypeCheck: true });
const definitions = {};
for (const n of names) Object.assign(definitions, gen.createSchema(n).definitions);
const out = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://openfinancialagent.org/schemas/0.1/schema.json",
  title: "Open Financial Agent Protocol (OFAP), draft 0.1",
  description: "Generated from schema.ts. Do not edit by hand.",
  definitions: Object.fromEntries(Object.keys(definitions).sort().map(k => [k, definitions[k]])),
};
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`${names.length} exported types, ${Object.keys(definitions).length} definitions`);
