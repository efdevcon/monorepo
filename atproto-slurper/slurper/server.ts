import express from "express";
import { BskyAgent, AppBskyFeedPost } from "@atproto/api";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import WebSocket from "ws";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Initialize BskyAgent
const agent = new BskyAgent({
  service: "https://bsky.social",
});

// Target lexicon details
const LEXICON_DID = "did:plc:dhnigydy24fp542wu5sxqy33"; // devcon did
const COLLECTION_NAME = "org.devcon.event.test";
const LEXICON_NSID = "com.atproto.lexicon.schema/org.devcon.event.test";
const FULL_LEXICON_URI = `${LEXICON_DID}/${LEXICON_NSID}`;

// Store cursor in memory and sync with Supabase
let currentCursor: string | undefined;
let retryCount = 0;
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
let lastLogTime = 0; // Track last log time

async function loadCursor() {
  const { data, error } = await supabase
    .from("at-proto-cursors")
    .select("cursor")
    .single();

  if (error) {
    console.error("Error loading cursor:", error);
    return;
  }

  return data?.cursor;
}

async function saveCursor(cursor: string) {
  // For Jetstream, the cursor is the time_us field
  if (!cursor) {
    console.log("Message has no time_us field, not saving cursor", cursor);
    return;
  }

  const { error } = await supabase
    .from("at-proto-cursors")
    .upsert({ id: 1, cursor }, { onConflict: "id" });

  if (error) {
    console.error("Error saving cursor:", error);
  } else {
    console.log("Cursor saved:", cursor);
  }
}

async function saveEvent(event: any) {
  // Prepare the record with the correct field structure
  const recordData = {
    rkey: event.rkey,
    rev: event.rev,
    record: event.record,
    message: event.message,
    collection: event.collection,
    did: event.did,
  };

  const { error } = await supabase.from("atproto-events").upsert(recordData, {
    onConflict: "rkey",
  });

  if (error) {
    console.error("Error saving event:", error);
    return { error };
  }

  return { success: true };
}

function getRetryDelay() {
  // Exponential backoff with jitter
  const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCount), 30000);
  const jitter = Math.random() * 1000;
  return delay + jitter;
}

/*
 TODO: https://atproto.com/specs/sync - best practices
 https://github.com/bluesky-social/jetstream
*/
async function startFirehose() {
  try {
    const cursor = await loadCursor();

    // Subtract a buffer (5 seconds worth of microseconds) to ensure gapless playback
    let cursorForConnection = cursor;
    if (cursorForConnection) {
      const cursorValue = BigInt(cursorForConnection);
      const fiveSecondsInMicroseconds = BigInt(5 * 1000 * 1000);
      cursorForConnection = String(cursorValue - fiveSecondsInMicroseconds);
      console.log("Using cursor with 5 second buffer:", cursorForConnection);
    }

    // Add cursor as a query parameter if it exists
    const wsUrl = cursorForConnection
      ? `wss://jetstream2.us-east.bsky.network/subscribe?cursor=${cursorForConnection}&wantedCollections=${COLLECTION_NAME}`
      : `wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=${COLLECTION_NAME}`;

    console.log("Connecting to firehose with URL:", wsUrl);

    const ws = new WebSocket(wsUrl, {
      headers: {
        "User-Agent": "atproto-slurper/1.0.0",
      },
      handshakeTimeout: 10000, // 10 seconds
    });

    ws.onopen = () => {
      console.log("Connected to firehose with cursor:", cursorForConnection);
      retryCount = 0;
    };

    ws.onmessage = async (event: WebSocket.MessageEvent) => {
      try {
        const message = JSON.parse(event.data.toString());

        // const now = Date.now();
        // if (now - lastLogTime >= 30000) {
        //   // Check if 30 seconds have passed
        //   console.log("Message received:", {
        //     timestamp: new Date().toISOString(),
        //     message: message,
        //     event,
        //   });

        //   lastLogTime = now;
        // }

        // Handle different message types
        switch (message.kind) {
          case "commit":
            // Save the cursor for recovery
            if (message.commit.collection === COLLECTION_NAME) {
              console.log("Processing commit:", {
                collection: message.commit.collection,
                time_us: message.time_us,
                operation: message.commit.operation,
              });

              console.log(message.commit, "message.commit.record");

              try {
                const result = (await saveEvent({
                  rkey: message.commit.rkey,
                  rev: message.commit.rev,
                  record: message.commit.record,
                  message: message,
                  collection: message.commit.collection,
                  did: message.did,
                })) as any;

                if (result && result.error) {
                  console.error("Error saving event:", result.error);
                  throw new Error(result.error.message);
                }

                await saveCursor(message.time_us);
              } catch (error) {
                console.error("Error fetching record:", error);
              }
            }

            break;

          case "error":
            console.error("Stream error:", message.error);
            ws.close();
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    ws.onerror = (error: WebSocket.ErrorEvent) => {
      console.error("WebSocket error:", error);
      // Don't close here, let onclose handle the reconnection
    };

    ws.onclose = (event: WebSocket.CloseEvent) => {
      console.log(`WebSocket connection closed with code ${event.code}`);

      // Handle different close codes
      switch (event.code) {
        case 1000: // Normal closure
          console.log("Normal closure, not reconnecting");
          break;
        case 1006: // Abnormal closure
        case 1015: // TLS handshake failure
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            const delay = getRetryDelay();
            console.log(
              `Attempting to reconnect in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`
            );
            setTimeout(startFirehose, delay);
          } else {
            console.error("Max retries reached, giving up");
          }
          break;
        default:
          // For other codes, retry with backoff
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            const delay = getRetryDelay();
            console.log(
              `Connection closed with code ${event.code}, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`
            );
            setTimeout(startFirehose, delay);
          } else {
            console.error("Max retries reached, giving up");
          }
      }
    };
  } catch (error) {
    console.error("Firehose error:", error);
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      const delay = getRetryDelay();
      console.log(
        `Error in startFirehose, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`
      );
      setTimeout(startFirehose, delay);
    } else {
      console.error("Max retries reached, giving up");
    }
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    cursor: currentCursor,
    retryCount,
    connected: retryCount === 0,
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  startFirehose();
});
