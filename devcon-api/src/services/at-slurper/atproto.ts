import { AtpBaseClient } from '@atproto/api'
import { schema } from './event-schema'

const collections = ['events.smokesignal.calendar.event']
const dids = [
  {
    serviceEndpoint: 'https://agrocybe.us-west.host.bsky.network',
    did: 'did:plc:hbzsfn4hxb4bigmwwhmwl5hl',
    handle: 'ethlasse.bsky.social',
  },
]

const api = (() => {
  const getATData = async () => {}

  const getATDataFromDID = async (did: string) => {
    // TODO: implement this using @atproto/api
  }

  return {
    getATData,
    getATDataFromDID,
  }
})()

const experimentation = (() => {
  const addSchema = async (serviceEndpoint: string, username: string, password: string, record: any) => {
    const { BskyAgent } = require('@atproto/api')

    const agent = new BskyAgent({
      service: serviceEndpoint,
    })

    // Log in with credentials
    await agent.login({ identifier: username, password })

    const response = await agent.com.atproto.repo.putRecord({
      repo: agent.session.did,
      // $ nslookup -type=TXT _lexicon.lexicon.atproto.com
      collection: 'com.atproto.lexicon.schema',
      rkey: 'org.devcon.event.test',
      record: schema,
    })

    return response
  }

  // Write data to a user pds, on behalf of a user
  const pdsOauthOnBehalfOfUser = async (serviceEndpoint: string, username: string, password: string, record: any) => {
    try {
      // Import the BskyAgent from @atproto/api
      const { BskyAgent } = require('@atproto/api')

      // Initialize the agent with Bluesky PDS service
      const agent = new BskyAgent({
        service: serviceEndpoint,
      })

      // Log in with credentials
      await agent.login({ identifier: username, password })

      // Publish the schema
      // const result = await agent.api.com.atproto.repo.putRecord({
      //   repo: agent.session.did,
      //   collection: 'com.atproto.lexicon.schema',
      //   rkey: 'xyz.yourdomain.status', // NSID as the record key
      //   record: schema,
      // })

      const record = {
        title: 'Test Firehose Event New Title 2',
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
        description: 'WOW!',
        location: 'Test Location',
        url: 'https://test.com',
      }

      const result = await agent.api.com.atproto.repo.putRecord({
        repo: agent.session.did,
        collection: 'org.devcon.event.test',
        rkey: record.title.toLowerCase().replace(/ /g, '-'), // NSID as the record key
        record,
      })

      // Create a record (e.g. a post)
      // const result = await agent.post({
      //   text: record.text || 'Hello from API',
      //   facets: record.facets || [],
      //   embed: record.embed,
      // })

      return { success: true, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const getServerLexicons = async () => {
    const pds = dids[0].serviceEndpoint

    const client = new AtpBaseClient(pds)

    try {
      const response = await client.com.atproto.server.describeServer()
      return response.data
    } catch (error: any) {
      return { error: error.message }
    }
  }

  const getATData = async () => {
    const data = []

    for (const did of dids) {
      const fetchedData = await getATDataFromDID(did)
      data.push(fetchedData)
    }

    return data
  }

  const getATDataFromDID = async (did: { serviceEndpoint: string; did: string; handle: string }) => {
    // Using AtpBaseClient directly like in the frontpage repo
    // const client = new AtpBaseClient(did.serviceEndpoint)

    try {
      // const response = await client.app.bsky.actor.getProfile({ actor: did.handle })

      //   const describeRepoUrl = new URL(`${did.serviceEndpoint}/xrpc/com.atproto.repo.describeRepo`)
      //   describeRepoUrl.searchParams.set('repo', did.handle)

      //   const res = await fetch(describeRepoUrl.toString())

      const res = await listRecords(did.serviceEndpoint, did.handle, collections[0])

      if (!res) {
        throw new Error(`Failed to get profile for handle ${did.handle}`)
      }

      return res
    } catch (e: any) {
      return { error: e.message, did }
    }
  }

  // Adding a new function to list records from a repository, similar to frontpage repo
  const listRecords = async (pds: string, repo: string, collection: string, limit = 50, cursor?: string) => {
    const client = new AtpBaseClient(pds)

    try {
      const response = await client.com.atproto.repo.listRecords({
        repo,
        collection,
        limit,
        cursor,
      })

      if (!response.success) {
        throw new Error(`Failed to list records`)
      }

      return response.data
    } catch (e: any) {
      return { error: e.message, repo, collection }
    }
  }

  // Adding a function to describe a repository, following frontpage repo pattern
  const describeRepo = async (repo: string) => {
    const pds = dids[0].serviceEndpoint

    try {
      const describeRepoUrl = new URL(`${pds}/xrpc/com.atproto.repo.describeRepo`)
      describeRepoUrl.searchParams.set('repo', repo)

      const res = await fetch(describeRepoUrl.toString())

      if (!res.ok && res.status !== 400) {
        throw new Error(`Failed to describe repo: ${res.statusText}`)
      }

      const body = await res.json()

      if (res.status >= 500) {
        throw new Error(`Failed to describe repo: ${res.statusText}`)
      }

      if (!res.ok) {
        return {
          success: false,
          error: body.error,
          message: body.message,
        }
      }

      return {
        success: true,
        collections: body.collections,
      }
    } catch (e: any) {
      return { success: false, error: e.message, repo }
    }
  }

  return {
    getATData,
    getATDataFromDID,
    listRecords,
    describeRepo,
    getServerLexicons,
    testPdsOauthOnBehalfOfUser: async () => {
      const result = await pdsOauthOnBehalfOfUser('https://bsky.social', 'ethlasse.bsky.social', process.env.AT_LASSE_PASSWORD!, {
        text: 'This is a test post using pdsOauthOnBehalfOfUser',
      })

      return result
    },
    addSchema: async () => {
      // const result = await addSchema('https://bsky.social', process.env.AT_USERNAME!, process.env.AT_PASSWORD!, schema)
      // return result
    },
  }
})()

export { experimentation, api }

/*
 Useful links:
 https://github.com/likeandscribe/frontpage/tree/main/packages/atproto-browser
 https://atproto-browser.vercel.app/at/ethlasse.bsky.social
 https://docs.bsky.app/docs/advanced-guides/posts -- how to post without SDK

 What to do next:
  Resolve record types by record schema (how to go from ID to schema generically?)
  How to 
*/
