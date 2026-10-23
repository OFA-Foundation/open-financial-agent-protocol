# Security

## Reporting a vulnerability

Report anything that could harm a live implementation privately, through [GitHub's private vulnerability reporting](https://github.com/OFA-Foundation/open-financial-agent-protocol/security/advisories/new). This covers:

- Weaknesses in the specification that an attacker could use against agents, distributors or customers. For example, a way to conclude an agreement or submit an application without the customer's approval, to forge or replay evidence, to change a price after approval, or to move a `distributor_page` field through the agent.
- Problems in the schema, the profiles or the checks that could lead implementers to ship an insecure or non-compliant implementation.

Don't open a public issue, pull request or discussion for these. Include the file and the type or rule affected, how it could be used, and a suggested fix if you have one.

## Security questions in public

Questions and suggestions about the security or compliance design that don't expose a weakness in a live implementation are welcome as public [feedback](https://github.com/OFA-Foundation/open-financial-agent-protocol/issues/new?template=1-feedback.yml). If you aren't sure, report privately.
