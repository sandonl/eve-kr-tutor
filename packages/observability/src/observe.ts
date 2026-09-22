import { Clock, Effect, type Exit } from "effect";

export function observeOperation<A, E, R, R2>(
  name: string,
  operation: Effect.Effect<A, E, R>,
  onExit: (exit: Exit.Exit<A, E>, durationMs: number) => Effect.Effect<void, never, R2>,
) {
  return Effect.gen(function* () {
    const start = yield* Clock.currentTimeNanos;
    return yield* operation.pipe(Effect.onExit((exit) => Effect.gen(function* () {
      const end = yield* Clock.currentTimeNanos;
      yield* Effect.suspend(() => onExit(exit, Number(end - start) / 1_000_000)).pipe(
        Effect.catchCause(() => Effect.void),
      );
    })));
  }).pipe(Effect.withSpan(name));
}
