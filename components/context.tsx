// The figures and the news name no company: each one links to its source.
export const FIGURES = [
  {
    value: "7,851%",
    text: "Growth in traffic from AI agents and agentic browsers in 2025, year on year.",
    source: "Traffic benchmark report, March 2026",
    href: "https://www.humansecurity.com/learn/resources/2026-state-of-ai-traffic-cyberthreat-benchmarks/",
  },
  {
    value: "17.7 billion",
    text: "AI agent requests in the second quarter of 2026, 45% more than in the first.",
    source: "Bot protection report, July 2026",
    href: "https://datadome.co/threat-research/ai-traffic-report-q2-2026/",
  },
  {
    value: "42%",
    text: "Better conversion for visits from AI than for other visits on US retail sites in March 2026. A year earlier, they converted 38% worse.",
    source: "Retail analytics data, April 2026",
    href: "https://techcrunch.com/2026/04/16/ai-traffic-to-us-retailers-rose-393-in-q1-and-its-boosting-their-revenue-too/",
  },
];

export const NEWS = [
  {
    date: "8 Sep 2026",
    iso: "2026-09-08",
    text: "A large social platform launches a personal agent. It opens websites, fills in forms and buys, and it asks the user before it pays. Within two weeks it is the top free app in the US App Store.",
    source: "Business press",
    href: "https://www.foxbusiness.com/technology/metas-muse-becomes-app-stores-hottest-download",
  },
  {
    date: "23 Sep 2026",
    iso: "2026-09-23",
    text: "An online insurance marketplace blocks that agent. It says the agent shows quotes as a bare price list, without the cover limits, the deductibles or the disclosures that each state requires.",
    quote: "A quote without its context is not a fair comparison. It is a number.",
    source: "Insurance press",
    href: "https://www.insurancejournal.com/news/national/2026/09/24/886704.htm",
  },
  {
    date: "6 Oct 2026",
    iso: "2026-10-06",
    text: "PAP is announced. It lets a business identify an agent and limit it to what the customer allows. Insurers are among its design partners, and so is the marketplace that blocked the agent.",
    source: "Announcement",
    href: "https://sierra.ai/blog/introducing-personal-agent-protocol",
  },
  {
    date: "13 Oct 2026",
    iso: "2026-10-13",
    text: "The largest bank in the US says that it blocks outside AI agents from its customers' accounts.",
    quote: "You don't want rogue agents.",
    source: "Business press",
    href: "https://fortune.com/2026/10/15/jamie-dimon-ai-agents-meta-muse-jpmorgan/",
  },
  {
    date: "15 Oct 2026",
    iso: "2026-10-15",
    text: "A listed insurer opens its own systems to personal agents. An agent can get a quote, buy a policy, change the cover and file a claim, for that insurer's policies only.",
    source: "Insurer's announcement",
    href: "https://www.lemonade.com/agentic",
  },
];

export function Figures() {
  return (
    <div className="figures">
      {FIGURES.map((figure) => (
        <div className="figure" key={figure.value}>
          <p className="figure-value">{figure.value}</p>
          <p className="figure-text">{figure.text}</p>
          <a className="source" href={figure.href}>
            {figure.source}
          </a>
        </div>
      ))}
    </div>
  );
}

export function News() {
  return (
    <ol className="news">
      {NEWS.map((item) => (
        <li key={item.date}>
          <time className="news-date" dateTime={item.iso}>
            {item.date}
          </time>
          <div className="news-body">
            <p>{item.text}</p>
            {item.quote && <blockquote>&ldquo;{item.quote}&rdquo;</blockquote>}
            <a className="source" href={item.href}>
              {item.source}
            </a>
          </div>
        </li>
      ))}
    </ol>
  );
}
