import { Effect as E, Context } from 'effect';
import { HolochainClientServiceTag, HolochainClientServiceLive } from '$lib/services/holochainClient.service';

const tagKey = (HolochainClientServiceTag as any).key ?? (HolochainClientServiceTag as any)._id ?? HolochainClientServiceTag;

export const probeHolo = (where: string) =>
  E.gen(function* () {
    console.debug('[HCS] PROBE start', { where, module: import.meta?.url ?? 'unknown', tagKey: String(tagKey) });
    const svc = yield* HolochainClientServiceTag;
    console.debug('[HCS] PROBE success', { where, module: import.meta?.url ?? 'unknown', tagKey: String(tagKey) });
    return svc;
  }).pipe(
    E.catchAll((err) =>
      E.fail(
        new Error(
          `[HCS] Service not found at ${where}
module: ${import.meta?.url ?? 'unknown'}
tagKey: ${String(tagKey)}
hint: If this happens only in dev, it's almost always mixed imports or a second Tag from a different module instance.`
        )
      )
    )
  );

/**
 * Provides the HolochainClient service layer to an Effect.
 * Use this helper everywhere you run Effects to ensure proper Layer provision.
 *
 * @example
 * ```ts
 * import { withHolo } from '$lib/effectEnv';
 *
 * const program = E.gen(function* () {
 *   const client = yield* HolochainClientServiceTag;
 *   // ... use client
 * });
 *
 * await E.runPromise(withHolo(program));
 * ```
 */
export const withHolo = <R, E1, A>(eff: E.Effect<R, E1, A>) =>
  E.provide(
    E.flatMap(probeHolo('withHolo preflight'), () => eff),
    HolochainClientServiceLive
  );

/**
 * Runs an Effect with the HolochainClient service layer provided.
 * Replacement for the generic runEffect function.
 */
export const runEffectWithHolo = <A, E, R>(effect: E.Effect<A, E, R>): Promise<A> =>
  E.runPromise(withHolo(effect as E.Effect<A, E, never>));