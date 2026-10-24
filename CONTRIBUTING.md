# Contributing

AIP is a draft. Feedback on the specification, line profile data from distributors, and fixes to the schema, the examples and the checks are welcome.

## Feedback on the specification

Open an issue with the [spec feedback](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new?template=1-feedback.yml) template. Give the file and the type or rule, the kind of problem, and a suggested change if you have one.

If you implemented AIP as an agent or a distributor, send an [implementation report](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new?template=2-implementation-report.yml). Reports are useful at any stage, including if you stopped partway.

## Line profiles

A line profile needs a second distributor of the same line before it is stable. If you distribute a product in a line that has a profile, or in a line with no profile yet, open a [line profile](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new?template=3-line-profile.yml) issue with the questions your tariff asks. Do not include customer data, internal tool names, or anything under a confidentiality agreement.

## New topics

To propose something that many implementations need and the draft does not cover, open a [new topic](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new?template=4-proposal.yml) issue.

## Security

Report vulnerabilities privately, as [SECURITY.md](SECURITY.md) describes, not in a public issue or pull request.

## Changes to this repository

Open a pull request against `main`. Keep each pull request to one change, and describe what it changes and why.

`schema.ts` and `profiles.ts` are the source of truth. Do not edit `schema.json` or the files in `examples/` by hand. Change the source or the scripts, then regenerate. Before you open the pull request, run:

```sh
bun install --frozen-lockfile
bun run check
```

Commit `schema.json` and `examples/` when they change. CI fails when they are out of date.

## License for contributions

By submitting a contribution, you agree to license it under the [Apache License 2.0](LICENSE).
