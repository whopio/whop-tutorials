// The users of an imaginary platform, the way a real one would hold them: most
// already registered, one still waiting, the rest partway through a filing.
//
// Only the first row is live. It maps to this demo's real sandbox account, and
// forming against it makes a real API call. The others cannot be live, because
// every stage past `draft` starts when somebody pays $500, which the sandbox has
// no way to do. They carry `live: false` and the UI labels them as examples
// rather than pretending otherwise.
export interface RosterUser {
  id: string;
  name: string;
  handle: string;
  joined: string;
  live: boolean;
  status: "none" | "draft" | "processing" | "filed" | "completed";
  legalName?: string;
  state?: string;
  entity?: "LLC" | "C-Corp";
  einRegistered?: boolean;
  stateRegistered?: boolean;
  documents?: string[];
  awaitingSignature?: "ss4" | "form8821";
}

export const ROSTER: RosterUser[] = [
  {
    id: "marcus",
    name: "Marcus Webb",
    handle: "@ridgemont",
    joined: "Joined 3 days ago",
    live: true,
    status: "none",
  },
  {
    id: "dana",
    name: "Dana Okoye",
    handle: "@okoyestudio",
    joined: "Joined 2 weeks ago",
    live: false,
    status: "draft",
    legalName: "Okoye Studio, LLC",
    state: "DE",
    entity: "LLC",
  },
  {
    id: "priya",
    name: "Priya Raman",
    handle: "@ramanlabs",
    joined: "Joined 1 month ago",
    live: false,
    status: "processing",
    legalName: "Raman Labs, Inc.",
    state: "DE",
    entity: "C-Corp",
    stateRegistered: false,
    einRegistered: false,
    awaitingSignature: "ss4",
  },
  {
    id: "tomas",
    name: "Tomás Herrera",
    handle: "@herreraworks",
    joined: "Joined 2 months ago",
    live: false,
    status: "filed",
    legalName: "Herrera Works, LLC",
    state: "WY",
    entity: "LLC",
    stateRegistered: true,
    einRegistered: false,
    documents: ["Articles of Organization"],
  },
  {
    id: "aiko",
    name: "Aiko Tanaka",
    handle: "@tanakastudio",
    joined: "Joined 4 months ago",
    live: false,
    status: "completed",
    legalName: "Tanaka Studio, LLC",
    state: "TX",
    entity: "LLC",
    stateRegistered: true,
    einRegistered: true,
    documents: ["Articles of Organization", "Operating Agreement", "EIN letter"],
  },
];

export const STATUS_LABEL: Record<RosterUser["status"], string> = {
  none: "No company",
  draft: "Awaiting payment",
  processing: "Filing",
  filed: "Filed, EIN pending",
  completed: "Registered",
};
