import serverless from "serverless-http";
import { createApp, registerErrorHandler } from "../backend/src/app.js";

const app = createApp();
registerErrorHandler(app);

export default serverless(app);
