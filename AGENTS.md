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

## Site

The site is a Next.js static export in `app/`, `components/` and `lib/`. The spec page is `content/spec-0.1.md`. Each `<!-- ofap:… -->` marker in it is replaced at build time by a table from `schema.ts`, `profiles.ts` or `README.md`, and `lib/spec-content.ts` generates the schema reference and the worked example. The build fails on a broken link, a duplicate heading id, or inline code that names a type `schema.json` does not define. Preview with `bun run dev`, and run `bun run build` before a pull request.

The explainer on the home page is in `components/explainer/`. `script.ts` holds the storyboard, and `lib/explainer-data.ts` reads its figures and payloads from the worked example. Each frame is a function of the time, set by one clock, so nothing renders while it plays. On `/?record`, `window.ofapExplainer` seeks that clock, so that a headless browser can render the video one frame at a time.

## Design

Take every colour, gap and radius from the tokens in `app/tokens.css`, which match the OFAP Design System. Write no literal colours in components. Orange (`--accent`) appears only in the mark and in one marker per view: the current page in the docs, the moving call in the explainer. Set text in IBM Plex Sans and code in IBM Plex Mono, from `app/fonts/`. Separate with `--line` borders, not shadows.

## Writing

The README and the doc comments use short sentences and plain words. Use the RFC 2119 keywords in capitals only for rules.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
