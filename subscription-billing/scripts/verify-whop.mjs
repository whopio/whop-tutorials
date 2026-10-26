// Proves the key and the environment are right before anything else is built.
// Run with: npm run verify:whop
import { WhopClient, WhopEnvironment } from "@whop/sdk";

const whop = new WhopClient({
  token: process.env.WHOP_COMPANY_API_KEY,
  environment:
    process.env.WHOP_SANDBOX === "true" ? WhopEnvironment.Sandbox : WhopEnvironment.Production,
});

const me = await whop.accounts.me();
console.log("connected to", me.id, me.title);
