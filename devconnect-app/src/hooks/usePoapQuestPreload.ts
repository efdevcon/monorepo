'use client';

import { useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useQuestCompletions } from '@/app/store.hooks';
import { useUserData } from '@/hooks/useServerData';
import { questsData } from '@/data/quests';

/**
 * Preload POAP quest completions from the mints snapshot.
 *
 * The Verify buttons are gone (live POAP verification ended with the event);
 * instead, once the user's wallets are known, every verifyPoap quest whose
 * drop the user holds in the final mints snapshot is marked completed
 * automatically (one bulk /api/poap call, one DB sync). Used by the quests
 * page and the wallet stampbook, so whichever the user opens first fills in.
 */

// Module-scope so the preload runs once per session, not once per mount
// (both consumers can mount during one session; re-running would only
// re-fetch to find nothing new).
let preloadStatus: 'idle' | 'running' | 'done' = 'idle';

export function usePoapQuestPreload() {
  const { para, eoa } = useWallet();
  const { questCompletions, syncQuestStates } = useQuestCompletions();
  const { userData } = useUserData();

  useEffect(() => {
    const addresses = [para.address, eoa.address].filter(
      (addr): addr is string => !!addr
    );

    // Wait until the user is authenticated (so DB completions are loaded and
    // syncable - the sync replaces the whole completions map) and a wallet is
    // connected.
    if (preloadStatus !== 'idle' || !userData || addresses.length === 0) {
      return;
    }
    preloadStatus = 'running';

    const preload = async () => {
      try {
        const response = await fetch('/api/poap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });
        if (!response.ok) {
          throw new Error(`Bulk POAP check failed: ${response.status}`);
        }
        const { drops }: { drops: Record<string, number> } =
          await response.json();

        const newlyCompleted = questsData.filter(
          quest =>
            quest.conditionType === 'verifyPoap' &&
            quest.conditionValues &&
            drops[quest.conditionValues] !== undefined &&
            !questCompletions?.[quest.id.toString()]
        );

        if (newlyCompleted.length === 0) {
          preloadStatus = 'done';
          return;
        }

        console.log(
          `[poap-preload] Marking ${newlyCompleted.length} POAP quest(s) completed from snapshot`
        );

        // Store mint dates for the stampbook (same shape verifyPoap used)
        try {
          const poapMetadata = JSON.parse(
            localStorage.getItem('poap-metadata') || '{}'
          );
          for (const quest of newlyCompleted) {
            poapMetadata[quest.id.toString()] = {
              dropId: quest.conditionValues,
              mintedOn: drops[quest.conditionValues],
              verifiedAt: new Date().toISOString(),
            };
          }
          localStorage.setItem('poap-metadata', JSON.stringify(poapMetadata));
        } catch (e) {
          console.error('[poap-preload] Error storing POAP metadata:', e);
        }

        // One batched DB sync on top of the current completions (the server
        // replaces the whole completions map, so merging is essential).
        // Use the POAP mint date as completedAt (ms).
        const updatedStates: Record<
          string,
          { status: 'completed' | 'active' | 'locked'; completedAt?: number }
        > = {};
        Object.entries(questCompletions || {}).forEach(
          ([questId, completedAt]) => {
            updatedStates[questId] = { status: 'completed', completedAt };
          }
        );
        for (const quest of newlyCompleted) {
          updatedStates[quest.id.toString()] = {
            status: 'completed',
            completedAt: drops[quest.conditionValues] * 1000,
          };
        }
        const result = await syncQuestStates(updatedStates);
        preloadStatus = result?.success ? 'done' : 'idle';
      } catch (error) {
        console.error('[poap-preload] Failed:', error);
        preloadStatus = 'idle'; // allow retry on next render
      }
    };

    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [para.address, eoa.address, userData, questCompletions]);
}
