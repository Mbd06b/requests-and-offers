import { Effect as E, Context, Layer, pipe } from 'effect';

console.log('[HCS] Module loading:', import.meta?.url ?? 'unknown');
import { Schema } from 'effect';
import type { AppWebsocket, AppInfoResponse } from '@holochain/client';

import {
  HolochainClientError,
  ConnectionError,
  ZomeCallError,
  SchemaDecodeError,
  HOLOCHAIN_CLIENT_CONTEXTS
} from '$lib/errors';

// Bring in the concrete Svelte client (only the instance/types)
import concrete, {
  type HolochainClientService as ConcreteClient,
  type ZomeName,
  type RoleName,
} from './HolochainClientService.svelte';

// Re-export the concrete instance for components that want direct, non-Effect use
export { default as holochainClientService } from './HolochainClientService.svelte';
export type { ZomeName, RoleName } from './HolochainClientService.svelte';

/** Effect-first interface that your zome services expect */
export interface HolochainClientEffectService {
  readonly connectClientEffect: () => E.Effect<AppWebsocket, ConnectionError>;
  readonly getAppInfoEffect: () => E.Effect<AppInfoResponse, HolochainClientError>;
  readonly callZomeEffect: <A>(
    zomeName: ZomeName,
    fnName: string,
    payload: unknown,
    outputSchema: Schema.Schema<A>,
    capSecret?: Uint8Array | undefined,
    roleName?: RoleName
  ) => E.Effect<A, HolochainClientError>;
  readonly callZomeRawEffect: (
    zomeName: ZomeName,
    fnName: string,
    payload: unknown,
    capSecret?: Uint8Array | undefined,
    roleName?: RoleName
  ) => E.Effect<unknown, HolochainClientError>;
  readonly isConnectedEffect: () => E.Effect<boolean, never>;
  readonly getClientEffect: () => E.Effect<AppWebsocket | null, never>;
}

/** Adapter: wrap the concrete Svelte client into Effect-returning methods */
function makeEffectClient(c: ConcreteClient): HolochainClientEffectService {
  return {
    connectClientEffect: () => E.tryPromise({
      try: async () => {
        if (!c.client) {
          await c.connectClient();
        }
        return c.client!;
      },
      catch: (error) => HolochainClientError.fromError(error, HOLOCHAIN_CLIENT_CONTEXTS.CONNECT)
    }),

    getAppInfoEffect: () => E.tryPromise({
      try: async () => {
        if (!c.client) {
          throw new Error('Client not connected');
        }
        return await c.getAppInfo();
      },
      catch: (error) =>
        HolochainClientError.fromError(error, HOLOCHAIN_CLIENT_CONTEXTS.GET_DNA_INFO)
    }),

    callZomeRawEffect: (
      zomeName: ZomeName,
      fnName: string,
      payload: unknown,
      capSecret: Uint8Array | undefined = undefined,
      roleName: RoleName = 'requests_and_offers'
    ) => E.tryPromise({
      try: async () => {
        if (!c.client) {
          throw new Error('Client not connected');
        }
        return await c.callZome(zomeName, fnName, payload, capSecret, roleName);
      },
      catch: (error) =>
        HolochainClientError.fromError(
          error,
          HOLOCHAIN_CLIENT_CONTEXTS.CALL_ZOME,
          'call_zome',
          zomeName,
          fnName
        )
    }),

    callZomeEffect: <A>(
      zomeName: ZomeName,
      fnName: string,
      payload: unknown,
      outputSchema: Schema.Schema<A>,
      capSecret: Uint8Array | undefined = undefined,
      roleName: RoleName = 'requests_and_offers'
    ) => pipe(
      E.tryPromise({
        try: async () => {
          if (!c.client) {
            throw new Error('Client not connected');
          }
          return await c.callZome(zomeName, fnName, payload, capSecret, roleName);
        },
        catch: (error) =>
          HolochainClientError.fromError(
            error,
            HOLOCHAIN_CLIENT_CONTEXTS.CALL_ZOME,
            'call_zome',
            zomeName,
            fnName
          )
      }),
      E.flatMap(
        (result): E.Effect<A, HolochainClientError> =>
          E.try({
            try: () => Schema.decodeUnknownSync(outputSchema)(result),
            catch: (parseError) =>
              HolochainClientError.fromError(
                parseError,
                HOLOCHAIN_CLIENT_CONTEXTS.VALIDATE_RESPONSE
              )
          })
      )
    ),

    isConnectedEffect: () => E.sync(() => c.isConnected),

    getClientEffect: () => E.sync(() => c.client),
  };
}

/** The ONLY Tag (string stays 'HolochainClientService' for compatibility) */
export class HolochainClientServiceTag extends Context.Tag('HolochainClientService')<
  HolochainClientServiceTag,
  HolochainClientEffectService
>() {}

const tagKey = (HolochainClientServiceTag as any).key ?? (HolochainClientServiceTag as any)._id ?? HolochainClientServiceTag;
console.debug('[HCS] DEFINE', {
  module: import.meta?.url ?? 'unknown module',
  tagKey: String(tagKey),
});

/** Live layer bound to the Effect interface (built from the concrete client) */
export const HolochainClientServiceLive: Layer.Layer<HolochainClientServiceTag, never, never> =
  Layer.succeed(HolochainClientServiceTag, makeEffectClient(concrete));

console.debug('[HCS] PROVIDE layer built in', import.meta?.url ?? 'unknown module', 'tagKey:', String(tagKey));