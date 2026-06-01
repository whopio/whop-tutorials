import { createRouteHandler } from "uploadthing/next";
import { storylineFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: storylineFileRouter,
});
