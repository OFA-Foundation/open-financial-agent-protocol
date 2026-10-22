# Open Financial Agent Protocol

## Source of truth

`schema.ts` holds every type and its rules, in RFC 2119 keywords. `profiles.ts` holds the line profiles. `scripts/generate.ts` generates `schema.json` from `schema.ts`, and `scripts/examples.ts` writes the worked flow in `examples/`. Don't edit `schema.json` or `examples/` by hand.

## Checks

After a change, run `bun run check` and commit what it writes. It type-checks the schema and the scripts (each example in `scripts/examples.ts` has its schema type), regenerates `schema.json` and the examples, validates the examples against the schema, and runs the rule checks in `scripts/validate.ts`. CI fails when `schema.json` or `examples/` differ from what the scripts write.

When you add a MUST rule that a JSON Schema cannot express, add a check for it in `scripts/validate.ts` and list it under "Rules the checks cover" in the README.

## Sector modules

Draft 0.1 defines the core and the insurance module. Section 8 of `schema.ts` lists what a module must define. A new module adds its value to `Sector`, one member to `ProductDetails`, `Pricing` and `NeedsAssessment`, and its values to the lists that section names. It must not change a core type or a core rule.

## Names

Don't name a real company anywhere in the specification, the comments or the examples, and don't copy a company's tool names. This applies also when its server or API is public. Describe a source by its line and country, for example "a pet insurer (FR, DE, SE)". The examples use fictional companies on `example.com`. You can name public specifications (MCP, PAP, RFC 8785), laws (IDD) and public registers and regulators (ORIAS, ACPR, FCA).

## Writing

The README and the doc comments use short sentences and plain words. Use the RFC 2119 keywords in capitals only for rules.
