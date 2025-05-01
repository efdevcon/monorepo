import { AtpBaseClient } from '@atproto/api'

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
  }
})()

export { experimentation, api }

/*
 Useful links:
 https://github.com/likeandscribe/frontpage/tree/main/packages/atproto-browser
*/
