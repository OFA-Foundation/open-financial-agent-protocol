"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { ExplainerData, Payload } from "../../lib/explainer-data";
import { BrandMark } from "../brand-mark";
import { HANDOFF_MS, clamp, crossfade, easeInOut, easeOut, paint, presence, progress, show, useFrame } from "./clock";
import { BACK_MS, CALL_MS, OUT_MS, SERVE_MS, landed, type ChatItem, type EndpointId, type Script } from "./script";
import styles from "./explainer.module.css";

export type Layout = "landscape" | "portrait";

interface Props {
  data: ExplainerData;
  script: Script;
}

/** A list of refs, filled by the callback that `slot(index)` returns. */
function useSlots<T extends HTMLElement>() {
  const slots = useRef<(T | null)[]>([]);
  const slot = (index: number) => (element: T | null) => {
    slots.current[index] = element;
  };
  return [slots, slot] as const;
}

/** `ready` is false until the frame has scaled the stage, so it never shows at the wrong size. */
export function Stage({ data, script, layout, titles, ready }: Props & { layout: Layout; titles: boolean; ready: boolean }) {
  return (
    <div className={styles.stage} data-layout={layout} data-ready={ready ? "" : undefined}>
      <Chapters script={script} />
      <AgentPanel data={data} script={script} />
      <Work script={script}>
        <Wire data={data} script={script} />
        <PayloadCard data={data} script={script} />
        <Distributor data={data} script={script} />
      </Work>
      <Layers data={data} script={script} />
      <Captions script={script} />
      {titles ? <TitleCards script={script} /> : null}
    </div>
  );
}

function Chapters({ script }: { script: Script }) {
  const [slots, slot] = useSlots<HTMLParagraphElement>();
  useFrame((time) => {
    script.chapters.forEach((chapter, index) => show(slots.current[index] ?? null, crossfade(time, chapter.at, script.chapters[index + 1]?.at), 4));
  });
  return (
    <div className={styles.top}>
      {script.chapters.map((chapter, index) => (
        <p key={chapter.title} ref={slot(index)} className={styles.chapter}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          {chapter.title}
        </p>
      ))}
    </div>
  );
}

function Captions({ script }: { script: Script }) {
  const [slots, slot] = useSlots<HTMLParagraphElement>();
  useFrame((time) => {
    script.captions.forEach((caption, index) => show(slots.current[index] ?? null, crossfade(time, caption.at, script.captions[index + 1]?.at, 420), 5));
  });
  return (
    <div className={styles.captions}>
      {script.captions.map((caption, index) => (
        <p key={caption.at} ref={slot(index)} className={styles.caption}>
          {caption.text}
        </p>
      ))}
    </div>
  );
}

/* The agent's own interface: the conversation with the customer, and the approval sheet. */

const CHAT_GAP = 10;
/** The chat's top padding, where earlier messages fade out (`.chat` in the styles). */
const CHAT_TOP = 12;

function AgentPanel({ data, script }: Props) {
  return (
    <section className={styles.agent}>
      <header className={styles.agentHead}>
        <span className={styles.agentTitle}>Agent</span>
        <span className={styles.agentFor}>acting for {data.customer}</span>
      </header>
      <Chat data={data} script={script} />
      <ApprovalSheet data={data} script={script} />
    </section>
  );
}

function Chat({ data, script }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const [items, slot] = useSlots<HTMLDivElement>();
  const sizes = useRef({ heights: [] as number[], view: 0 });

  const redraw = useFrame((time) => {
    const { heights, view } = sizes.current;
    let total = 0;
    const placed = script.chat.map((item, index) => {
      const amount = easeOut(progress(time, item.at, 460));
      const top = total;
      total += ((heights[index] ?? 0) + CHAT_GAP) * amount;
      return { top, amount };
    });
    const offset = Math.max(0, total - CHAT_GAP - view);
    placed.forEach(({ top, amount }, index) => {
      paint(items.current[index] ?? null, {
        opacity: amount,
        visibility: amount > 0,
        transform: `translate3d(0, ${(top - offset + (1 - amount) * 12).toFixed(2)}px, 0)`,
      });
    });
  });

  useLayoutEffect(() => {
    const measure = () => {
      sizes.current = { heights: items.current.map((item) => item?.offsetHeight ?? 0), view: (viewport.current?.clientHeight ?? 0) - CHAT_TOP };
      redraw();
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of [viewport.current, ...items.current]) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, [items, redraw]);

  return (
    <div className={styles.chat} ref={viewport}>
      {script.chat.map((item, index) => (
        <div key={item.at} ref={slot(index)} className={styles.chatItem} data-kind={item.kind}>
          <Message item={item} data={data} script={script} />
        </div>
      ))}
    </div>
  );
}

function Message({ item, data, script }: Props & { item: ChatItem }) {
  if (item.kind === "customer") return <p className={styles.customer}>{item.text}</p>;
  if (item.kind === "approved") {
    return (
      <p className={styles.approved}>
        <span className={styles.positiveWord}>Approved</span> revision {data.operation.revision} of {data.operation.id}
      </p>
    );
  }
  return (
    <div className={styles.agentMessage}>
      <p>{item.text}</p>
      {item.attach === "documents" ? (
        <ul className={styles.docs}>
          {data.documents.map((document) => (
            <li key={document.title}>
              <span className={styles.fileTag}>PDF</span>
              <span className={styles.docTitle}>{document.title}</span>
              <code>{document.version}</code>
            </li>
          ))}
        </ul>
      ) : null}
      {item.attach === "offers" ? (
        <ul className={styles.offers}>
          {data.offers.map((offer, index) => (
            <li key={offer.tier}>
              <span className={styles.offerTier}>{offer.tier}</span>
              <span className={styles.offerPrice}>{offer.price}</span>
              <span className={styles.offerCover}>{offer.cover}</span>
              {index === 0 ? <Ring at={script.chosen} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {item.attach === "handoff" ? (
        <span className={styles.handoff}>
          <strong>Continue on {data.distributor.name}</strong>
          <code>{data.handoff}</code>
        </span>
      ) : null}
    </div>
  );
}

function Ring({ at }: { at: number }) {
  const ring = useRef<HTMLSpanElement>(null);
  useFrame((time) => show(ring.current, presence(time, at, Infinity, 360)));
  return <span ref={ring} className={styles.ring} />;
}

function ApprovalSheet({ data, script }: Props) {
  const backdrop = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLSpanElement>(null);
  const ripple = useRef<HTMLSpanElement>(null);
  const approve = useRef<HTMLSpanElement>(null);
  const approved = useRef<HTMLSpanElement>(null);
  const { open, press, close } = script.sheet;

  useFrame((time) => {
    const up = easeOut(progress(time, open, 520)) - easeInOut(progress(time, close, 440));
    paint(backdrop.current, { opacity: up * 0.72, visibility: up > 0 });
    paint(sheet.current, { visibility: up > 0, transform: `translate3d(0, ${((1 - up) * 106).toFixed(2)}%, 0)` });
    const squeeze = Math.sin(Math.PI * progress(time, press, 260)) * 0.05;
    paint(button.current, { transform: `scale(${(1 - squeeze).toFixed(4)})` });
    const wave = progress(time, press, 560);
    paint(ripple.current, {
      opacity: time < press ? 0 : 0.45 * (1 - wave),
      visibility: time >= press && wave < 1,
      transform: `scale(${(1 + easeOut(wave) * 0.14).toFixed(4)}, ${(1 + easeOut(wave) * 0.4).toFixed(4)})`,
    });
    const done = easeOut(progress(time, press + 160, 280));
    show(approve.current, 1 - done);
    show(approved.current, done, 4);
  });

  return (
    <>
      <div ref={backdrop} className={styles.backdrop} />
      <div ref={sheet} className={styles.sheet}>
        <p className={styles.sheetLabel}>Approval requested</p>
        <p className={styles.sheetTitle}>{data.distributor.name}</p>
        <code className={styles.sheetMeta}>
          {data.operation.id} · revision {data.operation.revision}
        </code>
        <p className={styles.sheetSummary}>{data.operation.summary}</p>
        <dl className={styles.sheetTerms}>
          <dt>Premium</dt>
          <dd>{data.operation.price}</dd>
          <dt>Insurer</dt>
          <dd>{data.insurer}</dd>
          <dt>Starts</dt>
          <dd>{data.operation.start}</dd>
          <dt>Withdrawal</dt>
          <dd>{data.operation.withdrawal}</dd>
        </dl>
        <div className={styles.sheetActions}>
          <span className={styles.decline}>Decline</span>
          <span ref={button} className={styles.approve}>
            <span ref={ripple} className={styles.ripple} />
            <span ref={approve}>Approve</span>
            <span ref={approved} className={styles.approvedLabel}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 10.5 8.5 14 15 6.5" />
              </svg>
              Approved
            </span>
          </span>
        </div>
      </div>
    </>
  );
}

/* The calls between the agent and the distributor. */

function Work({ script, children }: { script: Script; children: ReactNode }) {
  const work = useRef<HTMLDivElement>(null);
  useFrame((time) => show(work.current, 1 - easeOut(progress(time, script.layers, 420))));
  return (
    <div ref={work} className={styles.work}>
      {children}
    </div>
  );
}

function Wire({ data, script }: Props) {
  const session = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const [requests, request] = useSlots<HTMLDivElement>();
  const [responses, response] = useSlots<HTMLDivElement>();
  const length = useRef(0);

  const redraw = useFrame((time) => {
    show(session.current, easeOut(progress(time, script.session, 600)));
    script.calls.forEach((call, index) => {
      const next = script.calls[index + 1]?.at ?? script.layers;
      show(requests.current[index] ?? null, crossfade(time, call.at, next), 0, -10);
      show(responses.current[index] ?? null, crossfade(time, landed(call) - HANDOFF_MS, next), 0, 10);
    });

    const call = script.calls.find((item) => time >= item.at && time < landed(item));
    if (!call) {
      show(dot.current, 0);
      show(trail.current, 0);
      return;
    }
    const local = time - call.at;
    const back = local - OUT_MS - SERVE_MS;
    const out = easeInOut(clamp(local / OUT_MS));
    const home = easeInOut(clamp(back / BACK_MS));
    const along = back < 0 ? out : 1 - home;
    const fade = Math.min(clamp(local / 120), clamp((CALL_MS - local) / 160));
    paint(dot.current, { opacity: fade, visibility: fade > 0, transform: `translate3d(${(along * length.current).toFixed(2)}px, 0, 0)` });
    // The line fills behind the request, and empties as the response comes home.
    paint(trail.current, { opacity: fade, visibility: fade > 0, transform: `scaleX(${along.toFixed(4)})` });
  });

  useLayoutEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => {
      length.current = element.clientWidth;
      redraw();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [redraw]);

  return (
    <div className={styles.wire}>
      <div ref={session} className={styles.session}>
        <span className={styles.sessionLabel}>PAP Session · signed out</span>
      </div>
      <div ref={track} className={styles.track}>
        <span className={styles.port} data-end="agent" />
        <span className={styles.port} data-end="distributor" />
        <span ref={trail} className={styles.trail} />
        <span ref={dot} className={styles.dot} />
      </div>
      <span className={styles.wireEnd} data-end="agent">
        Agent
      </span>
      <span className={styles.wireEnd} data-end="distributor">
        {data.distributor.domain}
      </span>
      {script.calls.map((call, index) => {
        const [verb, ...rest] = call.method.split(" ");
        return (
          <div key={call.at} ref={request(index)} className={styles.request}>
            <span className={styles.requestLine}>
              <span className={styles.layerTag}>{call.layer}</span>
              <code className={styles.method}>
                <span>{verb}</span> {rest.join(" ")}
              </code>
              {call.tool ? <span className={styles.ofapTag}>OFAP tool</span> : null}
            </span>
            {call.detail ? <code className={styles.detail}>{call.detail}</code> : null}
          </div>
        );
      })}
      {script.calls.map((call, index) => (
        <div key={call.at} ref={response(index)} className={styles.response}>
          {call.status ? (
            <code className={styles.status} data-tone={call.status.tone}>
              {call.status.word}
            </code>
          ) : null}
          <span>{call.response}</span>
        </div>
      ))}
    </div>
  );
}

interface Source {
  at: number;
  kind: string;
  from: string;
  payload: Payload;
}

function PayloadCard({ data, script }: Props) {
  const sources: Source[] = [
    ...script.calls.map((call) => ({
      at: landed(call),
      kind: call.layer === "MCP" ? "Result" : "Response",
      from: call.tool ?? "200 OK",
      payload: data.payloads[call.payload],
    })),
    { at: script.evidence, kind: `Kept by ${data.distributor.name}`, from: "EvidenceRecord", payload: data.payloads.evidence },
  ];
  const empty = useRef<HTMLParagraphElement>(null);
  const [layers, layer] = useSlots<HTMLDivElement>();
  const lines = useRef<(HTMLDivElement | null)[][]>([]);
  const marks = useRef<(HTMLSpanElement | null)[][]>([]);
  const lineSlot = (source: number, index: number) => (element: HTMLDivElement | null) => {
    (lines.current[source] ??= [])[index] = element;
  };
  const markSlot = (source: number, index: number) => (element: HTMLSpanElement | null) => {
    (marks.current[source] ??= [])[index] = element;
  };

  useFrame((time) => {
    show(empty.current, 1 - easeOut(progress(time, sources[0]?.at ?? 0, 240)));
    sources.forEach((source, index) => {
      const next = sources[index + 1]?.at;
      // The layer shows at once when the one before it has faded, and its lines come in one after the other.
      const first = source.at + HANDOFF_MS;
      const amount = time < first ? 0 : next !== undefined && time >= next ? 1 - easeOut(progress(time, next, 160)) : 1;
      show(layers.current[index] ?? null, amount);
      if (amount === 0) return;
      const count = source.payload.lines.length;
      source.payload.lines.forEach((_, line) => {
        show(lines.current[index]?.[line] ?? null, easeOut(progress(time, first + line * 24, 300)), 5);
        const mark = marks.current[index]?.[line];
        if (mark) paint(mark, { opacity: easeOut(progress(time, first + 100 + count * 24, 460)) });
      });
    });
  });

  return (
    <div className={styles.payload}>
      <p ref={empty} className={styles.empty}>
        Each call and its result show here.
      </p>
      {sources.map((source, index) => (
        <div key={source.at} ref={layer(index)} className={styles.payloadLayer}>
          <header className={styles.payloadHead}>
            <span className={styles.payloadKind}>{source.kind}</span>
            <code>{source.payload.path}</code>
            <code className={styles.payloadFrom}>{source.from}</code>
          </header>
          <div className={styles.lines}>
            {source.payload.lines.map((line, lineIndex) => (
              <div key={lineIndex} ref={lineSlot(index, lineIndex)} className={styles.line}>
                {line.mark ? <span ref={markSlot(index, lineIndex)} className={styles.mark} /> : null}
                <span dangerouslySetInnerHTML={{ __html: line.html }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* The distributor: its PAP endpoints and its MCP server with the OFAP tools. */

const ENDPOINTS: { id: EndpointId; name: string; layer: "PAP" | "MCP"; path: string }[] = [
  { id: "poppy", name: "poppy.json", layer: "PAP", path: "/.well-known/poppy.json" },
  { id: "token", name: "Token endpoint", layer: "PAP", path: "/oauth/token" },
  { id: "mcp", name: "MCP server", layer: "MCP", path: "/mcp" },
  { id: "operations", name: "Operations endpoint", layer: "PAP", path: "/poppy/operations" },
];

/** How much a row stands out at `time`: while a call to it is served, and a short time after. */
function activity(time: number, calls: Script["calls"]): number {
  return calls.reduce((most, call) => Math.max(most, presence(time, call.at + OUT_MS - 80, landed(call) + 900, 220, 360)), 0);
}

function Distributor({ data, script }: Props) {
  const discovered = script.calls[0] ? landed(script.calls[0]) : 0;
  const [rows, row] = useSlots<HTMLLIElement>();
  const [rowMarks, rowMark] = useSlots<HTMLSpanElement>();
  const [tools, tool] = useSlots<HTMLLIElement>();
  const [toolMarks, toolMark] = useSlots<HTMLSpanElement>();
  const kept = useRef<HTMLDivElement>(null);
  const keptMark = useRef<HTMLSpanElement>(null);

  useFrame((time) => {
    ENDPOINTS.forEach((endpoint, index) => {
      const calls = script.calls.filter((call) => call.endpoint === endpoint.id);
      const used = calls.some((call) => time >= call.at + OUT_MS);
      const seen = endpoint.id === "poppy" ? 1 : easeOut(progress(time, discovered + 120 * index, 420));
      paint(rows.current[index] ?? null, { opacity: seen * (used ? 1 : 0.62), visibility: seen > 0 });
      paint(rowMarks.current[index] ?? null, { opacity: endpoint.id === "mcp" ? 0 : activity(time, calls) });
    });
    data.tools.forEach((name, index) => {
      const calls = script.calls.filter((call) => call.tool === name);
      const used = calls.some((call) => time >= call.at + OUT_MS);
      paint(tools.current[index] ?? null, { opacity: used ? 1 : 0.62 });
      paint(toolMarks.current[index] ?? null, { opacity: activity(time, calls) });
    });
    show(kept.current, easeOut(progress(time, script.evidence, 420)), 6);
    paint(keptMark.current, { opacity: presence(time, script.evidence + 200, script.evidence + 3_600, 300, 600) });
  });

  return (
    <section className={styles.distributor}>
      <header className={styles.distHead}>
        <p className={styles.distName}>{data.distributor.name}</p>
        <p className={styles.distDomain}>{data.distributor.domain}</p>
      </header>
      <ul className={styles.endpoints}>
        {ENDPOINTS.map((endpoint, index) => (
          <li key={endpoint.id} ref={row(index)} className={styles.endpoint}>
            <span ref={rowMark(index)} className={styles.rowMark} />
            <span className={styles.endpointName}>{endpoint.name}</span>
            <span className={styles.layerTag}>{endpoint.layer}</span>
            <code className={styles.endpointPath}>{endpoint.path}</code>
            {endpoint.id === "mcp" ? (
              <ul className={styles.tools}>
                <li className={styles.toolsLabel}>OFAP tools · level {data.distributor.level}</li>
                {data.tools.map((name, toolIndex) => (
                  <li key={name} ref={tool(toolIndex)} className={styles.tool}>
                    <span ref={toolMark(toolIndex)} className={styles.rowMark} />
                    <code>{name}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <div ref={kept} className={styles.kept}>
        <span ref={keptMark} className={styles.rowMark} />
        <p className={styles.keptLabel}>Evidence records</p>
        <code>{data.evidenceId}</code>
      </div>
    </section>
  );
}

/* The summary: what each protocol carried in this sale. */

function Layers({ data, script }: Props) {
  const view = useRef<HTMLDivElement>(null);
  const [bands, band] = useSlots<HTMLDivElement>();
  const bandsData = [
    {
      name: "OFAP",
      role: "The financial terms",
      text: "Licences, documents, question sets, offers, the application terms and the evidence record.",
      items: ["get_distributor", "get_documents", "get_question_set", "quote", "submit_application", "EvidenceRecord"],
    },
    {
      name: "PAP",
      role: "The Session and the approval",
      text: "Discovery, the Session Token, and the operation that the customer approves.",
      items: ["poppy.json", "Session Token", `operation ${data.operation.id}`, `confirm revision ${data.operation.revision}`],
    },
    {
      name: "MCP",
      role: "Every call",
      text: "Each OFAP tool is an MCP tool, and its result sits in structuredContent.",
      items: ["tools/call", "structuredContent"],
    },
  ];

  useFrame((time) => {
    show(view.current, time >= script.layers ? 1 : 0);
    bandsData.forEach((_, index) => show(bands.current[index] ?? null, easeOut(progress(time, script.layers + 260 + index * 160, 560)), 14));
  });

  return (
    <div ref={view} className={styles.layers}>
      {bandsData.map((item, index) => (
        <div key={item.name} ref={band(index)} className={styles.band}>
          <div>
            <p className={styles.bandName}>{item.name}</p>
            <p className={styles.bandRole}>{item.role}</p>
          </div>
          <div>
            <p className={styles.bandText}>{item.text}</p>
            <ul className={styles.chips}>
              {item.items.map((chip) => (
                <li key={chip}>
                  <code>{chip}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Title cards for the video file. */

function TitleCards({ script }: { script: Script }) {
  const intro = useRef<HTMLDivElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  useFrame((time) => {
    show(intro.current, time < 0 ? 1 - easeOut(progress(time, -520, 520)) : 0);
    show(outro.current, easeOut(progress(time, script.duration, 700)));
  });
  return (
    <>
      <div ref={intro} className={styles.title}>
        <BrandMark size={56} />
        <p className={styles.titleName}>How OFAP works</p>
        <p className={styles.titleText}>An AI agent buys pet insurance, on top of MCP and PAP.</p>
      </div>
      <div ref={outro} className={styles.title}>
        <BrandMark size={56} />
        <p className={styles.titleName}>Open Financial Agent Protocol</p>
        <p className={styles.titleText}>Draft 0.1 · openfinancialagent.org</p>
      </div>
    </>
  );
}
