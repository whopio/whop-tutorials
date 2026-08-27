export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

// Six steps. Each id matches a data-annotation-id on the panel it highlights,
// which the StepRail scrolls into view and outlines.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "roster",
    title: "Your users",
    body: "Formation runs against an account, and on a platform every user already has one. Marcus is the only one still waiting.",
  },
  {
    id: "company",
    title: "Describe their company",
    body: "Name, entity type, state, and what the business does. An LLC and a C-Corp start from the same request.",
  },
  {
    id: "founders",
    title: "Add their founders",
    body: "One founder signs for the filing. An LLC splits ownership; a C-Corp hands out officer roles instead.",
  },
  {
    id: "send",
    title: "Send the application",
    body: "One `POST`, on their account, from your server. Nothing is created beforehand and nothing is charged yet.",
  },
  {
    id: "result",
    title: "Read the answer",
    body: "Whop replies with one sentence at a time, so a broken application takes as many round trips as it has mistakes.",
  },
  {
    id: "wall",
    title: "Hand it to them",
    body: "You get a checkout link back. Your user pays it, and only then does anything get filed.",
  },
];
