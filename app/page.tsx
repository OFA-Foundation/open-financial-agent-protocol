import Link from "next/link";
import { Explainer } from "../components/explainer/explainer";
import { explainerData } from "../lib/explainer-data";
import { highlightJsonHtml } from "../lib/markdown";
import { levelNames, readRepoJson } from "../lib/schema-source";
import { REPO_URL, SPEC_HREF } from "../lib/site";
import { SESSION_LABELS } from "../lib/spec-content";
import { EXTENSION_ID, TOOLS, type ConformanceLevel, type GetDistributorResult, type ToolName } from "../schema";

const ISSUE_FORMS = [
  { template: "1-feedback.yml", title: "Spec feedback", text: "A gap, an ambiguity or a risk in the schema or the rules." },
  { template: "2-implementation-report.yml", title: "Implementation report", text: "What you ran into as an agent or a distributor." },
  { template: "3-line-profile.yml", title: "Line profile data", text: "The questions your tariff asks, so that a profile becomes stable." },
  { template: "4-proposal.yml", title: "Sector module or new topic", text: "Credit, investment, or something the draft does not cover." },
];

const SECTORS = [
  {
    name: "Insurance",
    status: "Draft 0.1",
    current: true,
    items: ["IPID and general conditions before commitment", "Demands and needs (IDD Art. 20)", "Premium, cover, limits and excess", "Line profiles for pet and home"],
  },
  {
    name: "Credit",
    status: "Candidate module",
    current: false,
    items: ["SECCI and ESIS before commitment", "Creditworthiness under the CCD and the MCD", "APR and total cost of credit"],
  },
  {
    name: "Investment",
    status: "Candidate module",
    current: false,
    items: ["KID under PRIIPs", "Suitability or appropriateness under MiFID II", "Fees and risk indicator"],
  },
];

function serverDeclaration(): string {
  const settings = readRepoJson<GetDistributorResult>("examples/insurance-01-get_distributor.result.json").ofap;
  const json = JSON.stringify({ capabilities: { extensions: { [EXTENSION_ID]: settings } } }, null, 2);
  // Short arrays of values fit on one line.
  return json.replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, items: string) => `[${items.split(/,\s+/).join(", ")}]`);
}

function conformanceLevels() {
  const names = levelNames();
  const tools = Object.keys(TOOLS) as ToolName[];
  return ([1, 2, 3, 4] as ConformanceLevel[]).map((level) => {
    const added = tools.filter((tool) => TOOLS[tool].level === level);
    return {
      level,
      name: names[level] ?? "",
      tools: added,
      sessions: [...new Set(added.map((tool) => SESSION_LABELS[TOOLS[tool].session]))].join("; "),
    };
  });
}

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="label">Draft 0.1 · Insurance first</p>
          <h1 className="display">An open protocol for AI agents that sell regulated financial products.</h1>
          <p className="lede body-lg">
            OFAP gives every distributor the same tools for licences, documents, questions, offers and evidence. An agent can then quote, apply for and
            service a policy the same way with any of them, and each step leaves a record that meets the rules of a sale on the distributor&apos;s own site.
          </p>
          <div className="actions">
            <Link className="button primary" href={SPEC_HREF}>
              Read the spec
            </Link>
            <a className="button" href="#how-it-works">
              Watch how it works
            </a>
            <a className="button" href={REPO_URL}>
              GitHub
            </a>
          </div>
        </div>
        <aside className="declaration" aria-label="What a server declares">
          <p className="label">What a server declares</p>
          <pre>
            <code dangerouslySetInnerHTML={{ __html: highlightJsonHtml(serverDeclaration()) }} />
          </pre>
          <p className="declaration-note">
            In MCP <code>server/discover</code>, and under the same key in PAP <code>poppy.json</code>. Taken from the worked example.
          </p>
        </aside>
      </section>

      <section className="section" id="how-it-works">
        <header className="section-head">
          <h2 className="title-2">How it works</h2>
          <p>One pet insurance sale, from discovery to the evidence record. The OFAP data on screen comes from the worked example in the spec.</p>
        </header>
        <Explainer data={explainerData()} />
      </section>

      <section className="section" id="layers">
        <header className="section-head">
          <h2 className="title-2">Three layers, one sale</h2>
          <p>OFAP defines only what is specific to regulated financial products. The two protocols below it carry the rest.</p>
        </header>
        <div className="layers">
          <div className="layer layer-ofap">
            <span className="layer-name">OFAP</span>
            <p>
              The financial terms: licences, pre-contract documents, question sets, offers, the declaration, the needs assessment and the evidence record.{" "}
              <Link href={SPEC_HREF}>Read the spec</Link>
            </p>
          </div>
          <div className="layer layer-pap">
            <span className="layer-name">PAP</span>
            <p>
              The customer&apos;s session, and every action with a business effect. An OFAP application is a PAP operation that the customer approves.{" "}
              <a href="https://personalagentprotocol.org/docs/0.2/extensions/operations">PAP operations</a>
            </p>
          </div>
          <div className="layer layer-mcp">
            <span className="layer-name">MCP</span>
            <p>
              Every call between the agent and the distributor. Each OFAP primitive is an MCP tool, and its result sits in <code>structuredContent</code>.{" "}
              <a href="https://modelcontextprotocol.io/specification/latest">MCP specification</a>
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="levels">
        <header className="section-head">
          <h2 className="title-2">Four levels of conformance</h2>
          <p>A distributor declares a level and implements every tool up to it. Level 1 is enough to be found, and level 4 lets an agent service a policy after the sale.</p>
        </header>
        <div className="levels">
          {conformanceLevels().map((level) => (
            <div className="level" key={level.level}>
              <p className="label">Level {level.level}</p>
              <h3 className="title-3">{level.name}</h3>
              <ul>
                {level.tools.map((tool) => (
                  <li key={tool}>
                    <code>{tool}</code>
                  </li>
                ))}
              </ul>
              <p className="level-session">Session: {level.sessions}</p>
            </div>
          ))}
        </div>
        <p className="note">
          Level 3 needs only one of <code>submit_application</code> and <code>conclude</code>. Every tool that commits returns a PAP operation, and the
          customer approves it there.
        </p>
      </section>

      <section className="section" id="sectors">
        <header className="section-head">
          <h2 className="title-2">Insurance first</h2>
          <p>Draft 0.1 defines one sector module. The core does not depend on the sector, so credit and investment can follow as modules with no change to it.</p>
        </header>
        <div className="sectors">
          {SECTORS.map((sector) => (
            <div className={`sector ${sector.current ? "current" : ""}`} key={sector.name}>
              <span className={`pill ${sector.current ? "positive" : ""}`}>{sector.status}</span>
              <h3 className="title-3">{sector.name}</h3>
              <ul>
                {sector.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="feedback">
        <header className="section-head">
          <h2 className="title-2">Shape the draft</h2>
          <p>The draft changes with what implementers learn. Each link opens a GitHub issue form.</p>
        </header>
        <ul className="feedback">
          {ISSUE_FORMS.map((form) => (
            <li key={form.template}>
              <a href={`${REPO_URL}/issues/new?template=${form.template}`}>{form.title}</a>
              <span>{form.text}</span>
            </li>
          ))}
        </ul>
        <p className="note">
          To report a weakness that could harm a live implementation, use <a href={`${REPO_URL}/security/advisories/new`}>private vulnerability reporting</a>.
        </p>
      </section>
    </div>
  );
}
