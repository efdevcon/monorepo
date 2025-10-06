import express from "express";
import { BskyAgent, AppBskyFeedPost } from "@atproto/api";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import WebSocket from "ws";
import { createHash } from "crypto";
import validateRecord from "./validate";
import { dummyEvent, schema } from "./schema";
import { api } from "./atproto";
// @ts-ignore
import cors from "cors";
dotenv.config();

// Utility function to hash emails deterministically
function hashEmail(email: string): string {
  // Create a deterministic hash using SHA-256
  const hash = createHash("sha256");
  hash.update(email);

  // Get the full hash and truncate to 16 characters for shorter, more manageable length
  // 16 chars gives us 64 bits of entropy, which is still very secure for this use case
  return hash.digest("hex").substring(0, 16);
}

// Deep equality comparison function
function deepEqual(obj1: any, obj2: any): boolean {
  // Check for strict equality (handles primitives and same reference)
  if (obj1 === obj2) {
    return true;
  }

  // Check for null/undefined
  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  // Check if both are objects
  if (typeof obj1 !== "object" || typeof obj2 !== "object") {
    return false;
  }

  // Check for arrays
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false;
      }
    }
    return true;
  }

  // Compare object keys
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  // Check each key exists in both objects and values are equal
  for (const key of keys1) {
    if (!(key in obj2) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Add JSON parsing middleware
app.use(express.json());
app.use(cors());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Add middleware to verify Supabase JWT tokens
const verifySupabaseToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.substring(7);

    // Verify the session with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    console.log(authError, user);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth verification error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

// Target lexicon details
// const LEXICON_DID = "did:plc:dhnigydy24fp542wu5sxqy33"; // devcon did
const COLLECTION_NAME = "org.devcon.event";

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

async function deleteEvent(event: any) {
  try {
    console.log("Deleting record:", event);

    const { error } = await supabase
      .from("atproto_records")
      .delete()
      .eq("rkey", event.rkey)
      .eq("created_by", event.did);

    if (error) {
      console.error("Error deleting record:", error);
      return { error };
    }

    console.log(
      `Successfully deleted record for DID: ${event.did}, rkey: ${event.rkey}`
    );
    return { success: true };
  } catch (error) {
    console.error("Unexpected error in deleteEvent:", error);
    return { error };
  }
}

async function saveEvent(event: any) {
  try {
    // First, ensure DID exists in the new atproto_dids table
    const { error: didError } = await supabase.from("atproto_dids").upsert(
      {
        did: event.did,
        created_at: new Date().toISOString(),
      },
      { onConflict: "did" }
    );

    if (didError) {
      console.error("Error saving DID:", didError);
      return { error: didError };
    }

    // Check if record already exists (using DID + rkey combination)
    const { data: existingRecord, error: selectError } = await supabase
      .from("atproto_records")
      .select("id, record_passed_review")
      .eq("created_by", event.did)
      .eq("rkey", event.rkey)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 is "not found"
      console.error("Error checking existing record:", selectError);
      return { error: selectError };
    }

    if (deepEqual(event.record, existingRecord?.record_passed_review)) {
      console.log("Record is the same, skipping update");
      return { success: true };
    }

    if (existingRecord) {
      // Update case: move any existing passed_review to needs_review
      const { error: updateError } = await supabase
        .from("atproto_records")
        .update({
          record_needs_review: event.record,
          updated_at: new Date().toISOString(),
          message: event.message,
          reviewed: false,
          rev: event.rev,
          cursor: event.cursor,
        })
        .eq("id", existingRecord.id);

      if (updateError) {
        console.error("Error updating record:", updateError);
        return { error: updateError };
      }

      console.log(
        `Updated existing record for DID: ${event.did}, rkey: ${event.rkey}`
      );
    } else {
      console.log(event.collection);
      // New record: goes straight to needs_review
      const { error: insertError } = await supabase
        .from("atproto_records")
        .insert({
          created_by: event.did,
          rkey: event.rkey,
          rev: event.rev,
          lexicon: event.lexicon,
          cursor: event.cursor,
          record_needs_review: event.record,
          message: event.message,
        });

      if (insertError) {
        console.error("Error inserting new record:", insertError);
        return { error: insertError };
      }

      console.log(
        `Inserted new record for DID: ${event.did}, rkey: ${event.rkey}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in saveEvent:", error);
    return { error };
  }
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

        // console.log("Message received:", message);

        // const now = Date.now();
        // if (
        //   now - lastLogTime >= 30000 &&
        //   message.kind === "commit" &&
        //   message.commit.operation === "delete"
        // ) {
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

              console.log(message, "message.commit.record");

              try {
                if (message.commit.operation === "delete") {
                  console.log("Deleting record:", message.commit.record);

                  const result = await deleteEvent({
                    rkey: message.commit.rkey,
                    did: message.did,
                  });

                  if (result && result.error) {
                    console.error("Error deleting event:", result.error);
                  }
                } else {
                  const { valid, error } = await validateRecord(
                    message.commit.record
                  );

                  if (!valid) {
                    console.error("Invalid event:", message.commit.record);
                    console.error("Error:", error);
                    return;
                  }

                  const result = (await saveEvent({
                    rkey: message.commit.rkey,
                    rev: message.commit.rev,
                    record: message.commit.record,
                    lexicon: message.commit.collection,
                    record_needs_review: message.commit.record,
                    cursor: message.time_us || null,
                    message: message,
                    did: message.did,
                    reviewed: false,
                  })) as any;

                  if (result && result.error) {
                    console.error("Error saving event:", result.error);
                    throw new Error(result.error.message);
                  }
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

app.get("/all-events", async (req, res) => {
  const { data, error } = await supabase
    .from("atproto_records")
    .select(
      `
      id, rkey, created_by, lexicon, created_at, updated_at,
      record_passed_review, record_needs_review, show_on_calendar, is_core_event,
      atproto_dids!created_by(did, alias, is_spammer)
    `
    )
    .eq("lexicon", COLLECTION_NAME);

  const formatted = {
    events: data?.map((rawEvent) => {
      const event =
        rawEvent.record_needs_review || rawEvent.record_passed_review;

      return {
        created_by: rawEvent.created_by,
        created_at: rawEvent.created_at,
        updated_at: rawEvent.updated_at,
        ...event,
      };
    }),
  };

  if (error) {
    res.status(500).json({ error });
  } else {
    res.json(formatted);
  }
});
// New endpoint for approved events only (for calendar)
app.get("/calendar-events", async (req, res) => {
  const { data, error } = await supabase
    .from("atproto_records")
    .select(
      `
      id, rkey, created_by, record_passed_review, is_core_event, admin_override, updated_at,
      atproto_dids!created_by(did, alias)
    `
    )
    .eq("lexicon", COLLECTION_NAME)
    .eq("show_on_calendar", true)
    .not("record_passed_review", "is", null);

  if (error) {
    res.status(500).json({ error });
  } else {
    const formatted = data?.map((rawEvent) => {
      let recordPassedReview = rawEvent.record_passed_review;
      // const devconnectFormSubmissionsDid = 'did:plc:l26dgtpir4fydulvmuoee2sn'
      // // @ts-ignore
      // const currentDid = rawEvent.atproto_dids.did

      // const isDevconnectFormSubmission = currentDid === devconnectFormSubmissionsDid

      // // Helper function to convert Argentina time to UTC (subtract 3 hours)
      // const convertArgentinaToUtc = (timestamp: string) => {
      //   const date = new Date(timestamp);
      //   date.setHours(date.getHours() - 3);
      //   return date.toISOString();
      // }

      // const tmpFixTimezone = (event: any) => {
      //   // If event is from Devconnect submission form, then convert from Argentina time back to UTC time (subtract 3 hours)
      //   // This is because the form is UTC, but people have been entering the time in Argentina time, and so this is now the de facto standard
      //   // Had to change the form to not say UTC as well, which is unfortunate - anyway, the fix for now is to convert from Argentina time back to UTC time for events through the form - this needs to be fixed for future editions if we still use atprotocol.
      //   let fixedEvent = event

      //   if (isDevconnectFormSubmission) {
      //     if (event.timeblocks) {
      //       fixedEvent.timeblocks = event.timeblocks.map((timeblock: any) => {
      //         timeblock.start_utc = convertArgentinaToUtc(timeblock.start_utc)
      //         timeblock.end_utc = convertArgentinaToUtc(timeblock.end_utc)
      //         return timeblock
      //       })
      //     }

      //     if (fixedEvent.start_utc) {
      //       fixedEvent.start_utc = convertArgentinaToUtc(fixedEvent.start_utc)
      //     }
      //     if (fixedEvent.end_utc) {
      //       fixedEvent.end_utc = convertArgentinaToUtc(fixedEvent.end_utc)
      //     }

      //     return fixedEvent
      //   }

      //   return event
      // }

      // // Apply timezone fix
      // const fixedRecord = tmpFixTimezone(recordPassedReview);

      return {
        ...rawEvent,
        record_passed_review: {
          ...recordPassedReview,
          ...rawEvent.admin_override,
        },
      };
    });

    res.json(formatted);
  }
});

app.post("/validate-event", async (req, res) => {
  const record = req.body.record;

  const { valid, error } = validateRecord(record);

  if (valid) {
    res.status(200).json({ valid: true });
  } else {
    res.status(400).json({ valid: false, error });
  }
});

app.get("/schema", (req, res) => {
  res.json(schema);
});

// New authenticated endpoint for creating events
app.post(
  "/event/create",
  verifySupabaseToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const { event: eventData, contact } = req.body;

      console.log("Event data:", eventData, contact);

      if (!contact) {
        return res.status(400).json({ error: "No contact provided" });
      }

      if (!eventData) {
        return res.status(400).json({ error: "No event data provided" });
      }

      // Validate the event data
      const { valid, error: validationError } = validateRecord(eventData);
      if (!valid) {
        console.error("Invalid event data:", validationError);
        return res.status(400).json({ error: validationError });
      }

      // Get the authenticated user
      const user = req.user as any;
      const userEmailHash = hashEmail(user.email);

      const rkey = `${userEmailHash}-${eventData.title
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")}`;

      const result = await api.createEventBluesky(
        process.env.BLUESKY_DEVCONNECT_HANDLE!,
        process.env.BLUESKY_DEVCONNECT_PASSWORD!,
        eventData,
        rkey
      );

      console.log("Result of createEventBluesky:", result);

      const { error: contactError } = await supabase
        .from("atproto_records_contacts")
        .upsert(
          {
            rkey,
            email: contact,
          },
          { onConflict: "rkey" }
        );

      if (contactError) {
        console.error(
          "Error saving contact, but continuing anyway:",
          contactError
        );
      }

      if (!result.success) {
        console.error("Error creating event:", result.error);
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error in create event endpoint:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);

  startFirehose();
  // api.addSchema();
});
