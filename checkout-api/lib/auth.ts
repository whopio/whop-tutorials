// Replace this with however the app already knows who is browsing: a session
// cookie, a JWT, whatever is in place. It has to run on the server, and it must
// never read an identity out of the request body, because the browser can put
// anything there.
export async function currentUserId(): Promise<string | null> {
  return "user_demo";
}
