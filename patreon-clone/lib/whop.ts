import { WhopClient, WhopEnvironment } from "@whop/sdk"

const isSandbox = process.env.WHOP_SANDBOX === 'true'

export const whop = new WhopClient({
  token: process.env.WHOP_API_KEY,
  environment: isSandbox ? WhopEnvironment.Sandbox : WhopEnvironment.Production,
})
