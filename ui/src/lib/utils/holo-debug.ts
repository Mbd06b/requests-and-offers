import { Effect as E, Context } from 'effect';
import { HolochainClientServiceTag } from '$lib/services/holochainClient.service';

export const assertHoloAvailable = (where: string) =>
  E.gen(function* () {
    const tag = HolochainClientServiceTag as any;
    const key = tag?.key ?? tag?._id ?? tag;
    console.debug('[HCS] ASSERT asking at', where, 'tagKey:', String(key));
    yield* HolochainClientServiceTag; // throws if missing
  });