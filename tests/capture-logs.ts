import { Logger } from "effect";

export function captureLogs() {
  const logs: Array<ReturnType<typeof Logger.formatStructured.log>> = [];
  const layer = Logger.layer([Logger.map(Logger.formatStructured, (entry) => {
    logs.push(entry);
  })]);
  return { logs, layer };
}
