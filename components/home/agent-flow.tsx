// The opening picture of the home page tells one story in four beats, on one
// cycle: personal agents come to an insurer's website; they can't use its
// forms, because a regulated sale needs more than a form; PAP solves identity;
// MCP with AIP solves the rest. It is CSS only, and every keyframe in
// globals.css is a share of that one cycle. Under prefers-reduced-motion the
// picture shows the last beat, and the four captions show as a list.

import type { CSSProperties } from "react";
import { AGENT_LOGOS, type AgentLogo } from "./agent-logos";

/** The height of the picture on wide screens, in px. The wires and the moving calls are placed from it. */
const HEIGHT = 352;
const CHIP = 40;
const GAP = 16;
/** The length of the story, in seconds. */
const STORY_S = 12;

// The personal agents that act for a customer: AIP and PAP are built for
// them. This picture is the one place where the site names real products (see
// AGENTS.md). The last row stands for every other AI agent (assistants,
// agentic browsers, bots): it has no logo and no moving call. Narrow screens
// leave out the `secondary` agents.
const AGENTS: { name: string; logo?: AgentLogo; note?: string; secondary?: boolean }[] = [
  { name: "Meta Muse", logo: "muse" },
  { name: "OpenAI Dots", logo: "dots" },
  { name: "Claude Duet", logo: "duet" },
  { name: "Instinct", logo: "instinct", secondary: true },
  { name: "GrokBot", logo: "grokbot", secondary: true },
  { name: "Other AI agents", note: "Assistants, browsers, bots" },
];
const COMPACT = AGENTS.filter((agent) => !agent.secondary);

const STEPS: { name: string; question: string; answers: { name: string; ours?: boolean }[] }[] = [
  { name: "Identification", question: "Who is this agent, and who does it act for?", answers: [{ name: "PAP" }] },
  { name: "Communication", question: "How do you give it the full offer?", answers: [{ name: "AIP", ours: true }, { name: "MCP" }] },
];

// What a sale on the website must check, and which step solves it. `shift` is
// the share of the story by which an item turns later than the first one.
const NEEDS: { text: string; solvedBy: "PAP" | "AIP"; shift: number }[] = [
  { text: "Which agent, acting for whom?", solvedBy: "PAP", shift: 0 },
  { text: "Documents before the price", solvedBy: "AIP", shift: 0.18 },
  { text: "Demands and needs on record", solvedBy: "AIP", shift: 0.2 },
  { text: "Answers kept as a declaration", solvedBy: "AIP", shift: 0.22 },
];

const BEATS = [
  "Personal agents come to your website.",
  "They can't use its forms. A regulated sale needs more than a form can give.",
  "PAP solves identity: who the agent is, and who it acts for.",
  "MCP with AIP solves the rest: the documents, the needs, the declaration and the full offer.",
];

// Where the wires meet the boxes, in % of each wire's own box. On wide screens
// the picture runs left to right; on narrow screens it runs top to bottom.
const BLOCK = (HEIGHT - GAP * (STEPS.length - 1)) / STEPS.length;
const agentY = (index: number) => ((CHIP / 2 + (index * (HEIGHT - CHIP)) / (AGENTS.length - 1)) / HEIGHT) * 100;
const siteY = (index: number) => 28 + (index * 44) / (AGENTS.length - 1);
const stepY = (index: number) => ((BLOCK / 2 + index * (BLOCK + GAP)) / HEIGHT) * 100;
const compactX = (index: number) => ((index + 0.5) * 100) / COMPACT.length;
const siteX = (index: number) => 35 + (index * 30) / (COMPACT.length - 1);
const stepX = (index: number) => ((index + 0.5) * 100) / STEPS.length;

/** A point as x and y, in % of the wire's box. */
type Point = [number, number];
type Line = { from: Point; to: Point; dashed?: boolean };

function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

/** The start and the end of a moving call, for the keyframes in globals.css. */
function path({ from, to }: Line, extra: Record<string, string> = {}): CSSProperties {
  return vars({ "--x0": `${from[0]}%`, "--y0": `${from[1]}%`, "--x1": `${to[0]}%`, "--y1": `${to[1]}%`, ...extra });
}

function Wire({ lines }: { lines: Line[] }) {
  return (
    <svg className="flow-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {lines.map((line, index) => (
        <line
          key={index}
          className={line.dashed ? "dashed" : undefined}
          x1={line.from[0]}
          y1={line.from[1]}
          x2={line.to[0]}
          y2={line.to[1]}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/** The wire from the agents to the website, with a call from each personal agent. */
function AgentWire({ agents, line }: { agents: typeof AGENTS; line: (index: number) => Line }) {
  return (
    <>
      <Wire lines={agents.map((agent, index) => ({ ...line(index), dashed: !agent.logo }))} />
      {agents.map(
        (agent, index) => agent.logo && <span className="flow-call" key={agent.name} style={path(line(index), { "--delay": `${-index * 0.45}s` })} />,
      )}
    </>
  );
}

/** The wire from the website to each step, with the call that the story sends. */
function StepWire({ line }: { line: (index: number) => Line }) {
  return (
    <>
      <Wire lines={STEPS.map((_, index) => line(index))} />
      {STEPS.map((step, index) => (
        <span key={step.name} className={`flow-call out step-${index + 1}`} style={path(line(index))} />
      ))}
    </>
  );
}

function AgentMark({ logo }: { logo: AgentLogo | undefined }) {
  if (!logo) {
    return (
      <span className="flow-logo other">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="6" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="18" cy="12" r="1.8" />
        </svg>
      </span>
    );
  }
  const mark = AGENT_LOGOS[logo];
  return (
    <span className="flow-logo">
      <svg viewBox={mark.viewBox} fill="currentColor" fillRule="evenodd" aria-hidden="true">
        <g transform={"transform" in mark ? mark.transform : undefined}>
          {mark.paths.map((path) => (
            <path key={path} d={path} />
          ))}
        </g>
      </svg>
    </span>
  );
}

export function AgentFlow() {
  return (
    <figure className="flow" style={vars({ "--flow-height": `${HEIGHT}px`, "--flow-gap": `${GAP}px`, "--story": `${STORY_S}s` })}>
      <div className="flow-col">
        <p className="label">Personal AI agents</p>
        <ul className="flow-agents">
          {AGENTS.map((agent) => (
            <li key={agent.name} className={[agent.logo ? "" : "other", agent.secondary ? "secondary" : ""].join(" ").trim() || undefined}>
              <span className="flow-agent-name">
                {agent.name}
                {agent.note && <span className="flow-agent-note">{agent.note}</span>}
              </span>
              <AgentMark logo={agent.logo} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flow-wire" aria-hidden="true">
        <span />
        <div>
          <AgentWire agents={AGENTS} line={(index) => ({ from: [0, agentY(index)], to: [100, siteY(index)] })} />
        </div>
      </div>
      <div className="flow-vwire" aria-hidden="true">
        <AgentWire agents={COMPACT} line={(index) => ({ from: [compactX(index), 0], to: [siteX(index), 100] })} />
      </div>

      <div className="flow-col">
        <p className="label">Your website</p>
        <div className="flow-site">
          <div className="flow-site-bar" aria-hidden="true">
            <span className="flow-site-dots" />
            <span>insurer.example.com</span>
          </div>
          <div className="flow-site-body">
            <div className="flow-site-form" aria-hidden="true">
              <span className="flow-site-title">Pet insurance</span>
              <span className="flow-site-text" />
              <span className="flow-site-text short" />
              <span className="flow-site-field">Your pet&apos;s age</span>
              <span className="flow-site-field">Postcode</span>
              <span className="flow-site-button">Get a quote</span>
            </div>
            <div className="flow-gate">
              <p className="flow-gate-title">What a regulated sale needs</p>
              <ul>
                {NEEDS.map((need) => (
                  <li key={need.text} style={vars({ "--shift": `${need.shift * STORY_S}s` })}>
                    <svg className="flow-mark no" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                    </svg>
                    <svg className="flow-mark yes" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                    <span>{need.text}</span>
                    <span className={`flow-tag yes${need.solvedBy === "AIP" ? " ours" : ""}`}>{need.solvedBy}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="flow-site-caption">Made for people: pages, forms and PDFs</p>
        </div>
      </div>

      <div className="flow-wire" aria-hidden="true">
        <span />
        <div>
          <StepWire line={(index) => ({ from: [0, 50], to: [100, stepY(index)] })} />
        </div>
      </div>
      <div className="flow-vwire" aria-hidden="true">
        <StepWire line={(index) => ({ from: [50, 0], to: [stepX(index), 100] })} />
      </div>

      <div className="flow-col">
        <p className="label">Two steps, one after the other</p>
        <ol className="flow-steps">
          {STEPS.map((step, index) => (
            <li key={step.name} className={`step-${index + 1}`}>
              <span className="flow-step-name">
                {index + 1}. {step.name}
              </span>
              <span className="flow-step-question">{step.question}</span>
              <span className="flow-answers">
                {step.answers.map((answer, position) => (
                  <span key={answer.name} className="flow-answer">
                    {position > 0 && <span className="flow-on">on</span>}
                    <span className={`flow-tag${answer.ours ? " ours" : ""}`}>{answer.name}</span>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <ol className="flow-story">
        {BEATS.map((beat, index) => (
          <li key={beat} className={`beat-${index + 1}`}>
            <span className="flow-story-number">{index + 1}</span>
            {beat}
          </li>
        ))}
      </ol>
    </figure>
  );
}
