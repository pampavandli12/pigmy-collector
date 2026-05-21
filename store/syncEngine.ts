import NetInfo from "@react-native-community/netinfo";

import { createTransaction } from "@/services/user";
import { store$ } from "./store";

let syncing = false;

export async function processOutbox() {
  if (syncing) {
    return;
  }

  syncing = true;

  try {
    const network = await NetInfo.fetch();

    if (!network.isConnected) {
      return;
    }

    const outbox = store$.outbox.peek();

    const pending = Object.entries(outbox)
      .filter(([_, item]) => item.status === "pending")
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    for (const [txId, item] of pending) {
      try {
        store$.outbox[txId].status.set("syncing");

        await createTransaction(item.payload);

        store$.outbox[txId].delete();
      } catch (e: any) {
        store$.outbox[txId].assign({
          status: "failed",

          retryCount: item.retryCount + 1,

          error: e?.message ?? "Sync failed",
        });
      }
    }
  } finally {
    syncing = false;
  }
}
