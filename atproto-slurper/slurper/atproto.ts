import { AtpAgent, BskyAgent } from "@atproto/api";
import { schema } from "./schema";

// const collections = ['events.smokesignal.calendar.event']
const dids = [
  {
    serviceEndpoint: "https://agrocybe.us-west.host.bsky.network",
    did: "did:plc:hbzsfn4hxb4bigmwwhmwl5hl",
    handle: "ethlasse.bsky.social",
  },
];

const api = (() => {
  const createEventBluesky = async (username: string, password: string) => {
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
        title: "Example Devconnect Event",
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

  // If you have a custom PDS, you can use this function to create an event - make sure the pds is connected to the atproto network, or it won't be crawlable
  // It is easier to use the createEventBluesky function
  const createEvent = async (
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

  const createInviteCodes = async (pdsService: string) => {
    const agent = new AtpAgent({ service: pdsService });

    try {
      const credentials = Buffer.from(
        `admin:${process.env.DEVCON_PDS_PASSWORD}`
      ).toString("base64");

      const result = await agent.api.com.atproto.server.createInviteCodes(
        {
          codeCount: 1,
          useCount: 5,
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
          encoding: "application/json",
        }
      );

      return result;
    } catch (error: any) {
      console.error("Failed to create invite codes:", error.message);

      // If the above fails, you might need to use HTTP Basic auth directly
      // This is because createInviteCodes requires admin privileges
      console.log("Note: createInviteCodes requires admin authentication.");
      console.log("You need to either:");
      console.log("1. Login with admin credentials first, or");
      console.log("2. Use HTTP Basic auth with admin token");

      throw error;
    }
  };

  // Function to check if a PDS supports account creation
  const checkPDSCapabilities = async (pdsService: string) => {
    try {
      const agent = new BskyAgent({ service: pdsService });

      // Try to get server description to see what's supported
      const serverInfo = await agent.api.com.atproto.server.describeServer();
      console.log(`PDS Server Info for ${pdsService}:`, {
        availableUserDomains: serverInfo.data.availableUserDomains,
        inviteCodeRequired: serverInfo.data.inviteCodeRequired,
        phoneVerificationRequired: serverInfo.data.phoneVerificationRequired,
        links: serverInfo.data.links,
      });

      return serverInfo.data;
    } catch (error: any) {
      console.log(
        `Could not get server info for ${pdsService}:`,
        error.message
      );
      return null;
    }
  };

  // Function to attempt account creation (if supported)
  const tryCreateAccount = async (
    pdsService: string,
    handle: string,
    password: string,
    email?: string
  ) => {
    try {
      const agent = new BskyAgent({ service: pdsService });

      const accountData: any = {
        email: "lassejacobsenbiz@gmail.com",
        handle: handle,
        password: password,
        inviteCode: "dcdev4-ticketh-xyz-6b4sk-y6mm7",
      };

      // Add email if provided
      if (email) {
        accountData.email = email;
      }

      const result = await agent.api.com.atproto.server.createAccount(
        accountData
      );

      console.log("Account created successfully:", result.data);
      return { success: true, data: result.data };
    } catch (error: any) {
      console.log("Account creation failed:", error.message);
      return { success: false, error: error.message };
    }
  };

  const addSchema = async (
    serviceEndpoint: string,
    username: string,
    password: string,
    record: any
  ) => {
    const { BskyAgent } = require("@atproto/api");

    const agent = new BskyAgent({
      service: serviceEndpoint,
    });

    // Log in with credentials
    await agent.login({ identifier: username, password });

    const response = await agent.com.atproto.repo.putRecord({
      repo: agent.session.did,
      // $ nslookup -type=TXT _lexicon.lexicon.atproto.com
      collection: "com.atproto.lexicon.schema",
      rkey: "org.devcon.event.v1",
      record: schema,
    });

    return response;
  };

  const addRecordToDevconPds = async (
    serviceEndpoint: string,
    username: string,
    password: string,
    record: any
  ) => {
    try {
      const { BskyAgent } = require("@atproto/api");

      const agent = new BskyAgent({
        service: serviceEndpoint,
      });

      await agent.login({ identifier: username, password });

      const response = await agent.com.atproto.repo.putRecord({
        repo: agent.session.did,
        collection: "org.devcon.event.v1",
        rkey: record.title.toLowerCase().replace(/ /g, "-"),
        record,
      });

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    addSchema: async () => {
      const result = await addSchema(
        "https://bsky.social",
        process.env.AT_USERNAME!,
        process.env.AT_PASSWORD!,
        schema
      );
      return result;
    },
    test: async () => {
      const customPDS = "https://dcdev4.ticketh.xyz";

      console.log("=== Checking Custom PDS Capabilities ===");
      // const serverInfo = await checkPDSCapabilities(customPDS);
      // const accountInfo = await tryCreateAccount(
      //   customPDS,
      //   "lasse.dcdev4.ticketh.xyz",
      //   "lichfish1"
      // );

      // console.log("Account Info:", accountInfo);

      // if (serverInfo) {
      //   console.log("\n=== Custom PDS Analysis ===");
      //   if (serverInfo.inviteCodeRequired) {
      //     console.log("❌ This PDS requires an invite code for account creation");
      //   } else {
      //     console.log("✅ This PDS allows open account creation");

      //     // You could try creating an account here if you want
      //     // const accountResult = await tryCreateAccount(customPDS, "your-test-handle.dcdev4.ticketh.xyz", "your-password");
      //   }
      // }

      // console.log("\n=== Testing Event Creation ===");

      // Try with your custom PDS first (will likely fail without account)
      // console.log("Creating event on custom PDS...");
      const customResult = await createEvent(
        process.env.BLUESKY_HANDLE || "lasse.dcdev4.ticketh.xyz", // Your existing Bluesky handle
        process.env.BLUESKY_PASSWORD || "", // Your existing Bluesky password
        customPDS // Your custom PDS
      );

      const blueskyResult = await createEventBluesky(
        process.env.BLUESKY_HANDLE!,
        process.env.BLUESKY_PASSWORD!
      );

      console.log("Bluesky PDS Result:", blueskyResult);
    },
  };
})();

export { api };

/*
 Useful links:
 https://github.com/likeandscribe/frontpage/tree/main/packages/atproto-browser
 https://atproto-browser.vercel.app/at/ethlasse.bsky.social
 https://docs.bsky.app/docs/advanced-guides/posts -- how to post without SDK

 What to do next:
  Resolve record types by record schema (how to go from ID to schema generically?)
  How to 
*/
