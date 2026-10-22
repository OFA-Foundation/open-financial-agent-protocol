// The storyboard: each call, chat message and caption, with its time in
// milliseconds. The steps follow the worked example and PAP draft 0.2:
// discovery, the Session, the OFAP tools over MCP, the operation, the
// customer's approval, the confirmation and the evidence record.

import type { ExplainerData, PayloadId } from "../../lib/explainer-data";
import type { ToolName } from "../../schema";

export type EndpointId = "poppy" | "token" | "mcp" | "operations";
export type Tone = "positive" | "caution" | "neutral";

export interface Call {
  at: number;
  layer: "PAP" | "MCP";
  endpoint: EndpointId;
  tool?: ToolName;
  /** The request on one line, for example `GET /.well-known/poppy.json`. */
  method: string;
  /** A second line under the request: its params, or the token it carries. */
  detail?: string;
  status?: { word: string; tone: Tone };
  response: string;
  payload: PayloadId;
}

export type ChatItem =
  | { at: number; kind: "customer"; text: string }
  | { at: number; kind: "agent"; text: string; attach?: "documents" | "offers" | "handoff" }
  | { at: number; kind: "approved" };

export interface Script {
  duration: number;
  chapters: { at: number; title: string }[];
  captions: { at: number; text: string }[];
  calls: Call[];
  chat: ChatItem[];
  /** The PAP Session frame shows from this time. */
  session: number;
  /** The approval sheet opens, the customer presses Approve, and the sheet closes. */
  sheet: { open: number; press: number; close: number };
  /** The customer picks the first offer. */
  chosen: number;
  /** The evidence record shows in the payload card and in the distributor's list. */
  evidence: number;
  /** The three layers replace the wire. */
  layers: number;
}

/** The request travels for OUT_MS, the distributor answers in SERVE_MS, and the response travels back for BACK_MS. */
export const OUT_MS = 650;
export const SERVE_MS = 300;
export const BACK_MS = 650;
export const CALL_MS = OUT_MS + SERVE_MS + BACK_MS;

/** Title cards around the video, outside the stage's own time. */
export const INTRO_MS = 3_200;
export const OUTRO_MS = 3_600;

export function landed(call: Call): number {
  return call.at + CALL_MS;
}

type WithoutTime<T> = T extends unknown ? Omit<T, "at"> : never;

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function word(count: number): string {
  return NUMBERS[count] ?? String(count);
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

export function buildScript(data: ExplainerData): Script {
  const { customer, pet, distributor, operation } = data;
  const seller = possessive(distributor.name);
  const chapters: Script["chapters"] = [];
  const captions: Script["captions"] = [];
  const calls: Call[] = [];
  const chat: ChatItem[] = [];
  let time = 0;

  const chapter = (title: string) => chapters.push({ at: time, title });
  const caption = (text: string) => captions.push({ at: time, text });
  const wait = (ms: number) => {
    time += ms;
  };
  const call = (step: Omit<Call, "at">, hold: number) => {
    calls.push({ ...step, at: time });
    wait(CALL_MS + hold);
  };
  const say = (item: WithoutTime<ChatItem>, hold: number) => {
    chat.push({ ...item, at: time } as ChatItem);
    wait(hold);
  };
  const token = `Authorization: DPoP ${data.sessionToken}`;
  const tool = (name: ToolName, detail: string, rest: Pick<Call, "response" | "payload"> & Partial<Call>): Omit<Call, "at"> => ({
    layer: "MCP",
    endpoint: "mcp",
    tool: name,
    method: `tools/call ${name}`,
    detail,
    ...rest,
  });

  chapter("Discovery");
  wait(300);
  caption(`${customer} asks an AI agent to insure ${pet}, a cat. ${distributor.name} sells pet insurance.`);
  say({ kind: "customer", text: data.firstMessage }, 2_200);
  caption(`The agent reads ${seller} poppy.json. It lists the MCP server, the PAP operations endpoint and the OFAP level.`);
  call({ layer: "PAP", endpoint: "poppy", method: "GET /.well-known/poppy.json", response: `poppy.json · OFAP level ${distributor.level}`, payload: "poppy" }, 3_200);

  chapter("PAP Session");
  caption("The agent starts a PAP Session, signed out. Every call after this one carries its Session Token.");
  call(
    {
      layer: "PAP",
      endpoint: "token",
      method: "POST /oauth/token",
      detail: "grant_type=jwt-bearer",
      response: "Session Token · signed out",
      payload: "token",
    },
    0,
  );
  const session = time;
  wait(3_000);

  chapter("OFAP tools on MCP");
  caption(`Each OFAP step is an MCP tool. get_distributor says who sells, and under which licence.`);
  call(tool("get_distributor", token, { response: `${distributor.name} · ${distributor.role} · ${distributor.register}`, payload: "distributor" }), 2_600);
  caption(`The documents that the law requires come with a version and a hash. The agent gives them to ${customer} before any commitment.`);
  call(tool("get_documents", data.params.product, { response: `${data.documents.length} documents · version and hash`, payload: "documents" }), 600);
  say(
    {
      kind: "agent",
      text: `${distributor.name} is a ${distributor.role}, registered with ${distributor.register} under ${distributor.identifier}. Read these two documents before you choose.`,
      attach: "documents",
    },
    3_000,
  );
  caption(`The questions come as a JSON Schema. The microchip number is for ${seller} own page, so it never passes through the agent.`);
  call(
    tool("get_question_set", data.params.product, {
      response: `Question set ${data.questionSet.version} · ${data.questionSet.questions} questions`,
      payload: "questions",
    }),
    3_900,
  );

  chapter("One quote loop");
  caption(`The agent quotes with the ${word(data.partialAnswers)} answers it has. The server lists the ${word(data.missing.length)} that are missing.`);
  call(
    tool("quote", `${data.partialAnswers} answers`, {
      status: { word: "needs_input", tone: "caution" },
      response: `${data.missing.length} missing`,
      payload: "needsInput",
    }),
    700,
  );
  say({ kind: "agent", text: `${capital(word(data.missing.length))} more questions for the quote: ${pet}'s sex, if ${pet} is neutered, the date of birth, and any insurance today.` }, 2_200);
  say({ kind: "customer", text: data.secondMessage }, 1_600);
  caption(`One more call with all ${word(data.fullAnswers)} answers. The offers come back priced, with the hash of the answers.`);
  call(
    tool("quote", `${data.fullAnswers} answers`, {
      status: { word: "complete", tone: "positive" },
      response: `${data.offers.length} offers`,
      payload: "complete",
    }),
    600,
  );
  say({ kind: "agent", text: `${data.insurer} insures both offers. Which one do you want?`, attach: "offers" }, 2_600);
  say({ kind: "customer", text: "The first one, please." }, 400);
  const chosen = time;
  wait(1_400);

  chapter("Approval through PAP");
  caption("Applying commits nothing. The tool returns a PAP operation, and OFAP defines its terms: parties, declaration, needs and documents.");
  call(
    tool("submit_application", data.params.application, {
      status: { word: "proposed", tone: "neutral" },
      response: `operation ${operation.id} · revision ${operation.revision}`,
      payload: "operation",
    }),
    3_800,
  );
  const open = time;
  caption(`The agent shows ${customer} the summary and the key terms in its own interface. The approval covers this exact revision.`);
  wait(4_200);
  const press = time;
  wait(900);
  const close = time;
  say({ kind: "approved" }, 700);
  caption(`The agent confirms revision ${operation.revision} at the PAP operations endpoint, never through an OFAP tool.`);
  call(
    {
      layer: "PAP",
      endpoint: "operations",
      method: `POST /poppy/operations/${operation.id}/confirm`,
      detail: data.params.confirm,
      status: { word: "succeeded", tone: "positive" },
      response: `evidence ${data.evidenceId}`,
      payload: "confirm",
    },
    3_200,
  );

  chapter("Evidence");
  const evidence = time;
  caption(`${distributor.name} keeps an evidence record: the documents delivered, the declaration, the needs, the consent, and the hash of the approved terms.`);
  wait(4_400);
  caption(`${customer} finishes on ${seller} site. ${pet}'s microchip number never passes through the agent.`);
  say({ kind: "agent", text: `Application received. Finish on ${seller} site, where you give ${pet}'s microchip number.`, attach: "handoff" }, 4_200);

  chapter("Three layers");
  const layers = time;
  caption("MCP carries the calls. PAP carries the Session and the approval. OFAP defines the financial terms on top of both.");
  wait(5_000);
  caption("Draft 0.1 covers insurance. Credit and investment can follow as modules, with no change to the core.");
  wait(4_600);

  return { duration: time, chapters, captions, calls, chat, session, sheet: { open, press, close }, chosen, evidence, layers };
}
