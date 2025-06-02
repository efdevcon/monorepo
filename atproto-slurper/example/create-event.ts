import { BskyAgent } from "@atproto/api";

// Import the process.env from .env
import dotenv from "dotenv";

dotenv.config();

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
    console.log(`Could not get server info for ${pdsService}:`, error.message);
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
      handle: handle,
      password: password,
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

const createEvent = async (
  username: string,
  password: string,
  pdsService?: string
) => {
  try {
    // Initialize the agent with custom PDS service (defaults to your custom PDS)
    const agent = new BskyAgent({
      service: pdsService || "https://dcdev4.ticketh.xyz",
    });

    await agent.login({ identifier: username, password });

    if (!agent.session?.did) {
      throw new Error("No session found");
    }

    // This is your event
    const record = {
      title: "Example Devconnect Event Custom PDS",
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
      title: "Example Devconnect Event Again Test",
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
  const customPDS = "https://dcdev4.ticketh.xyz";

  console.log("=== Checking Custom PDS Capabilities ===");
  const serverInfo = await checkPDSCapabilities(customPDS);
  const accountInfo = await tryCreateAccount(
    customPDS,
    "lasse.dev",
    "test"
    // "haha@haha.com"
  );

  console.log("Account Info:", accountInfo);

  if (serverInfo) {
    console.log("\n=== Custom PDS Analysis ===");
    if (serverInfo.inviteCodeRequired) {
      console.log("❌ This PDS requires an invite code for account creation");
    } else {
      console.log("✅ This PDS allows open account creation");

      // You could try creating an account here if you want
      // const accountResult = await tryCreateAccount(customPDS, "your-test-handle.dcdev4.ticketh.xyz", "your-password");
    }
  }

  console.log("\n=== Testing Event Creation ===");

  // Try with your custom PDS first (will likely fail without account)
  console.log("Creating event on custom PDS...");
  const customResult = await createEvent(
    process.env.BLUESKY_HANDLE!, // Your existing Bluesky handle
    process.env.BLUESKY_PASSWORD!, // Your existing Bluesky password
    customPDS // Your custom PDS
  );

  console.log("Custom PDS Result:", customResult);

  // Try with Bluesky's PDS (should work with your existing account)
  // console.log("\nCreating event on Bluesky PDS...");
  // const blueskyResult = await createEventBluesky(
  //   process.env.BLUESKY_HANDLE!,
  //   process.env.BLUESKY_PASSWORD!
  // );

  // console.log("Bluesky PDS Result:", blueskyResult);

  console.log("\n=== Summary ===");
  console.log("Custom PDS:", customResult.success ? "✅ Success" : "❌ Failed");
  // console.log(
  //   "Bluesky PDS:",
  //   blueskyResult.success ? "✅ Success" : "❌ Failed"
  // );

  if (!customResult.success) {
    console.log("\n💡 To use your custom PDS, you would need to:");
    console.log("1. Create an account on that PDS first");
    console.log("2. Or use account migration to move your existing identity");
    console.log(
      "3. Check if the PDS requires invite codes or has other restrictions"
    );
  }
})();
