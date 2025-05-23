import { BskyAgent } from "@atproto/api";

// Import the process.env from .env
import dotenv from "dotenv";

dotenv.config();

const createEvent = async (username: string, password: string) => {
  try {
    // Initialize the agent with Bluesky PDS service
    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    await agent.login({ identifier: username, password });

    if (!agent.session?.did) {
      throw new Error("No session found");
    }

    // This is your event
    const record = {
      title: "Example Devconnect Event Again",
      start: "2026-01-01T00:00:00Z",
      end: "2026-01-02T00:00:00Z",
      description: "This is an example Devcon/nect event",
      location: "Devcon/nect",
      url: "https://devconnect.org",
    };

    const result = await agent.api.com.atproto.repo.putRecord({
      repo: agent.session.did,
      // Your record must adhere to this schema:
      collection: "org.devcon.event.test",
      // Record key - this is effectively the id of your record - it can be whatever you want, as long as it's unique per event
      // Sidenote: to update the record, you can use the same rkey and it will update the existing record.
      rkey: record.title.toLowerCase().replace(/ /g, "-"),
      record,
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

(async () => {
  const result = await createEvent(
    process.env.BLUESKY_HANDLE!, // REPLACE WITH YOUR BLUESKY HANDLE
    process.env.BLUESKY_PASSWORD! // REPLACE WITH YOUR BLUESKY PASSWORD
  );

  console.log(result);
})();
