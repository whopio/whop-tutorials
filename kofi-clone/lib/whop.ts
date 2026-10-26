import { WhopClient, WhopEnvironment } from "@whop/sdk";
import { env, isSandbox } from "./env";

export const whopsdk = new WhopClient({
  token: env.WHOP_COMPANY_API_KEY,
  environment: isSandbox() ? WhopEnvironment.Sandbox : WhopEnvironment.Production,
});
