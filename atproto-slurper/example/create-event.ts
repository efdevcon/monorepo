import { AtpAgent, BskyAgent } from "@atproto/api";
import dotenv from "dotenv";

dotenv.config();

const createEventBluesky = async (
  record: any,
  username: string,
  password: string
) => {
  try {
    // Initialize the agent with Bluesky PDS service
    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    await agent.login({ identifier: username, password });

    if (!agent.session?.did) {
      throw new Error("No session found");
    }

    const result = await agent.api.com.atproto.repo.putRecord({
      repo: agent.session.did,
      // Your record must adhere to this schema:
      collection: "org.devcon.event.vone",
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

// If you have a custom PDS, you can use this function to create an event - make sure the pds is connected to the atproto network, or it won't be crawlable
// It is easier to use the createEventBluesky function
const createEvent = async (
  record: any,
  username: string,
  password: string,
  pdsService: string
) => {
  try {
    // Initialize the agent with custom PDS service (defaults to your custom PDS)
    const agent = new AtpAgent({
      service: pdsService,
    });

    await agent.login({ identifier: username, password });

    if (!agent.session?.did) {
      throw new Error("No session found");
    }

    // This is your event
    const record = {
      title: "Example Devconnect Event using Custom PDS",
      start: "2026-01-01T00:00:00Z",
      end: "2026-01-02T00:00:00Z",
      description: "This is an example Devcon/nect event using custom PDS",
      location: "Devcon/nect",
      url: "https://devconnect.org",
    };

    const result = await agent.api.com.atproto.repo.putRecord({
      repo: agent.session.did,
      // Your record must adhere to this schema:
      collection: "org.devcon.event.vone",
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
  // const customPDS = "https://dcdev4.ticketh.xyz";

  // This is your event
  const record = {
    title: "Example Devconnect Event",
    start: "2026-01-01T00:00:00Z",
    end: "2026-01-02T00:00:00Z",
    description: "This is an example Devcon/nect event",
    location: "Devcon/nect",
    url: "https://devconnect.org",
  };

  // const customResult = await createEvent(
  //   record,
  //   process.env.HANDLE || "", // Your custom pds handle
  //   process.env.PASSWORD || "", // Your custom pds password
  //   customPDS // Your custom PDS
  // );

  const blueskyResult = await createEventBluesky(
    record,
    process.env.BLUESKY_HANDLE!,
    process.env.BLUESKY_PASSWORD!
  );

  console.log("Bluesky PDS Result:", blueskyResult);
})();
