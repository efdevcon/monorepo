import { createClient } from "tinacms/dist/client";
import { queries } from "./types";
export const client = createClient({ url: 'http://localhost:4001/graphql', token: 'e4b5e0e1f6a16715efd1246c3deb81a4a3490a5a', queries,  });
export default client;
  