import { Effect, Logger } from "effect";
import type { DiagnosticEvent } from "./events.js";

export const loggingLayer = Logger.layer([Logger.consoleJson]);

export const record = ({ event, ...annotations }: DiagnosticEvent) => {
  const log = event.endsWith(".failed") ? Effect.logError(event) : Effect.logInfo(event);
  // Only telemetry failures are suppressed; never wrap business work here.
  return log.pipe(Effect.annotateLogs(annotations), Effect.catchCause(() => Effect.void));
};
