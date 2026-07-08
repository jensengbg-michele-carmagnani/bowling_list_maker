import serverless from "serverless-http";
import { createApp, registerErrorHandler } from "./app.js";

const app = createApp();
registerErrorHandler(app);

export default serverless(app);
