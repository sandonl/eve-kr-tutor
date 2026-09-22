import { defineHook } from "eve/hooks";
import { observeEvent } from "../lib/observability.js";

export default defineHook({ events: { "*": observeEvent } });
