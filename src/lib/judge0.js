// Single execution implementation lives in server/executor.mjs.
// This module re-exports it for use by Next.js API routes.
export { submitCode, parseResult, dockerBreaker } from "../../server/executor.mjs";
