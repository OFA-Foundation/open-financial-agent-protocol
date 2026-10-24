import Link from "next/link";
import { Explainer } from "../components/explainer/explainer";
import { Figures } from "../components/context";
import { AgentFlow } from "../components/home/agent-flow";
import { explainerData } from "../lib/explainer-data";
import { highlightJsonHtml } from "../lib/markdown";
import { levelNames, readRepoJson } from "../lib/schema-source";
import { CONTEXT_HREF, REPO_URL, SPEC_HREF } from "../lib/site";
import { SESSION_LABELS } from "../lib/spec-content";
import { EXTENSION_ID, TOOLS, type ConformanceLevel, type GetDistributorResult, type ToolName } from "../schema";

const PROBLEMS: { name: string; question: string; text: string; answers: { name: string; ours?: boolean }[] }[] = [
  {
    name: "Identification",
    question: "Who is this agent, and what does it want?",
    text: "On your site, a customer signs in and you know who they are. An agent needs the same: proof of who it is, who it acts for and what it may do. PAP defines this on top of OAuth, and AIP uses PAP as it is.",
    answers: [{ name: "PAP" }],
  },
  {
    name: "Communication",
    question: "How do you give the agent the full offer?",
    text: "An agent calls tools, the way a program calls an API. MCP carries those calls, but it does not say which tools an insurer needs. Each insurer picks its own, and the nine quote tools we studied have nine names and nine sets of inputs. AIP defines the tools and what each one returns.",
    answers: [{ name: "AIP", ours: true }, { name: "MCP" }],
  },
];

const STEPS: { step: string; tools: ToolName[]; text: string }[] = [
  { step: "Who sells", tools: ["get_distributor"], text: "The legal name, and each licence with its regulator and public register." },
  { step: "What is for sale", tools: ["list_products"], text: "The products by line and country, what they cover, and how the customer can subscribe." },
  { step: "What to read first", tools: ["get_documents"], text: "The IPID and the conditions, each with a version and the hash of the file." },
  {
    step: "What to ask",
    tools: ["get_question_set"],
    text: "The questions as JSON Schema, with a common core per product line. Sensitive fields stay on your own page.",
  },
  { step: "The price", tools: ["quote"], text: "Offers with the premium, the cover, the limits and the excess. When there is no offer, a reason." },
  {
    step: "The contract",
    tools: ["submit_application", "conclude"],
    text: "A PAP operation that the customer approves. Its terms hold the parties, the declaration, the demands and needs and the documents delivered, and you keep the evidence record.",
  },
];

const KEEPS = [
  {
    title: "The full offer",
    text: "Each offer carries its cover, limits, excess and documents. An agent compares all of it, and the customer sees what the price buys.",
  },
  {
    title: "Control stays with you",
    text: "You choose your level: inform, quote or subscribe. Sensitive data and the last step can stay on your own page, and nothing commits until the customer approves.",
  },
  {
    title: "Compliance in every step",
    text: "Each step leaves the evidence that a sale on your own site leaves: the licence, the documents delivered, the demands and needs and the declaration.",
  },
];

const ISSUE_FORMS = [
  { template: "1-feedback.yml", title: "Spec feedback", text: "A gap, an ambiguity or a risk in the schema or the rules." },
  { template: "2-implementation-report.yml", title: "Implementation report", text: "What you ran into as an agent or a distributor." },
  { template: "3-line-profile.yml", title: "Line profile data", text: "The questions your tariff asks, so that a profile becomes stable." },
  { template: "4-proposal.yml", title: "New topic", text: "Something many implementations need that the draft does not cover." },
];

function serverDeclaration(): string {
  const settings = readRepoJson<GetDistributorResult>("examples/insurance-01-get_distributor.result.json").aip;
  const json = JSON.stringify({ capabilities: { extensions: { [EXTENSION_ID]: settings } } }, null, 2);
  // Short arrays of values fit on one line.
  return json.replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, items: string) => `[${items.split(/,\s+/).join(", ")}]`);
}

function conformanceLevels() {
  const names = levelNames();
  const tools = Object.keys(TOOLS) as ToolName[];
  const levels = [...new Set(tools.map((tool) => TOOLS[tool].level))].sort() as ConformanceLevel[];
  return levels.map((level) => {
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
        <div className="hero-text">
          <p className="label">Draft 0.1</p>
          <h1 className="display">An open standard to sell insurance through AI agents.</h1>
          <p className="lede body-lg">
            People now ask AI agents to find, compare and buy insurance. The agents visit websites that were made for people, and they often bring back a
            bare price without the cover or the conditions behind it. AIP gives insurers one open way to give agents the full offer, and to keep each
            sale compliant.
          </p>
          <div className="actions">
            <Link className="button primary" href={SPEC_HREF}>
              Read the spec
            </Link>
            <a className="button" href="#how-it-works">
              See a sale step by step
            </a>
            <a className="button" href={REPO_URL}>
              GitHub
            </a>
          </div>
        </div>
        <AgentFlow />
      </section>

      <section className="section" id="context">
        <header className="section-head">
          <h2 className="title-2">Agents have started to buy</h2>
          <p>
            Personal agents now search, compare and buy for people. Their traffic grows faster than human traffic, and each company decides alone how to
            answer it.
          </p>
        </header>
        <Figures />
        <Link className="button small" href={CONTEXT_HREF}>
          More context and news
        </Link>
      </section>

      <section className="section" id="problem">
        <header className="section-head">
          <h2 className="title-2">Two steps for every insurer that sells to agents</h2>
          <p>
            An insurer wants agents to find and price its offer correctly. It must keep control of that offer, and a sale through an agent must meet the
            same rules as a sale on its own site. An agent goes through two steps, one after the other. First the insurer identifies it, then it gives the agent the full offer.
          </p>
        </header>
        <div className="problems">
          {PROBLEMS.map((problem, index) => (
            <div className="problem" key={problem.name}>
              <p className="label">
                {index + 1}. {problem.name}
              </p>
              <h3 className="title-3">{problem.question}</h3>
              <p>{problem.text}</p>
              <span className="flow-answers">
                {problem.answers.map((answer, position) => (
                  <span key={answer.name} className="flow-answer">
                    {position > 0 && <span className="flow-on">on</span>}
                    <span className={`flow-tag${answer.ours ? " ours" : ""}`}>{answer.name}</span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="tools">
        <header className="section-head">
          <h2 className="title-2">The tools AIP defines</h2>
          <p>
            AIP tells an insurer which tools to put in its MCP server, and what each one returns. Draft 0.1 covers acquisition, from the first question
            to the signed contract. Changes, renewals, cancellations and claims come in a later draft.
          </p>
        </header>
        <ol className="box">
          {STEPS.map((item) => (
            <li key={item.step}>
              <span className="box-step">{item.step}</span>
              <span className="box-tools">
                {item.tools.map((tool) => (
                  <code key={tool}>{tool}</code>
                ))}
              </span>
              <span className="box-text">{item.text}</span>
            </li>
          ))}
        </ol>
        <div className="keeps">
          {KEEPS.map((keep) => (
            <div key={keep.title}>
              <h3 className="title-3">{keep.title}</h3>
              <p>{keep.text}</p>
            </div>
          ))}
        </div>
        <p className="note">
          Draft 0.1 comes from the quote tools of nine insurance MCP servers in production, a commercial lines broker (US) that exposes only a
          conversation, and the actions that a listed insurer opened to personal agents in October 2026.
        </p>
      </section>

      <section className="section" id="how-it-works">
        <header className="section-head">
          <h2 className="title-2">How it works</h2>
          <p>One pet insurance sale, from discovery to the evidence record. The AIP data on screen comes from the worked example in the spec.</p>
        </header>
        <Explainer data={explainerData()} />
      </section>

      <section className="section" id="levels">
        <header className="section-head">
          <h2 className="title-2">Three levels of conformance</h2>
          <p>
            A distributor declares a level and implements every tool up to it. Level 1 is enough to be found, and level 3 takes the customer to a signed
            contract.
          </p>
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
        <div className="declare">
          <div>
            <h3 className="title-3">What a server declares</h3>
            <p>
              A server declares its level, its product lines and its countries in MCP <code>server/discover</code>, and under the same key in PAP{" "}
              <code>poppy.json</code>. This declaration comes from the worked example.
            </p>
          </div>
          <pre className="declaration">
            <code dangerouslySetInnerHTML={{ __html: highlightJsonHtml(serverDeclaration()) }} />
          </pre>
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
