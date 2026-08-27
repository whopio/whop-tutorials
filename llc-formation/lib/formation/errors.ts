// Whop answers with one sentence at a time, not a field map, so the demo
// matches the sentence back to the input that caused it. Every pattern here was
// produced by a real sandbox response, not read off a spec.
//
// The officer-role message is built from whichever offices are missing, so it
// arrives as "Add a secretary before submitting" with one missing and
// "Add a secretary, treasurer, and director before submitting" with three.
// It has to be matched by the office names rather than by a fixed sentence.
const FIELD_MESSAGES: ReadonlyArray<[RegExp, string]> = [
  [/valid business type/i, "business_type"],
  [/valid industry group|Add your industry/i, "industry_group"],
  [/valid industry type/i, "industry_type"],
  [/valid state of formation/i, "formation_state"],
  [/primary founder is required|founder as primary/i, "founders"],
  [/ownership percentages/i, "founders"],
  [/company address/i, "business_address"],
  [/number of shares|par value/i, "share_structure"],
  [/valid role|president|secretary|treasurer|director/i, "founders"],
  [/expedited ein/i, "expedite_ein"],
];

export function fieldFor(message: string): string | null {
  for (const [pattern, field] of FIELD_MESSAGES) {
    if (pattern.test(message)) return field;
  }
  return null;
}
