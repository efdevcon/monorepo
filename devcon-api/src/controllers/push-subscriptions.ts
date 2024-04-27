import { Request, Response, Router } from 'express'
import { PrismaClient } from '../db/clients/push-subscriptions'
import webPush, { PushSubscription } from 'web-push'
const RSSParser = require('rss-parser');
// import RSSParser from 'rss-parser'
const parser = new RSSParser({
  customFields: {
    item: ['efblog:image', 'description'],
  },
})
const nodeFetch = require('node-fetch');
// import nodeFetch from 'node-fetch'

const prisma = new PrismaClient()

webPush.setVapidDetails('mailto:devcon-website@ethereum.org', process.env.VAPID_PUBLIC as string, process.env.VAPID_PRIVATE as string)

async function subscribe(req: Request, res: Response) {
  // TODO: Add authorization here
  // const isAuthorized = process.env.PUSH_SUBSCRIPTION_SECRET === req.body.secret

  // if (!isAuthorized) return res.status(403).send({ code: 403, message: 'Forbidden' })

  if (req.body) {
    try {
      const subscriptionData = req.body

      // Assuming subscriptionData has the same structure as your PushSubscription model
      const subscription = await prisma.pushSubscription.create({
        data: {
          endpoint: subscriptionData.endpoint, // assuming it's a string
          keys: JSON.stringify(subscriptionData.keys), // assuming it's an object that can be serialized to JSON
        },
      })
      return res.status(200).send({ code: 200, message: 'Subscription added successfully', subscription })
    } catch (error) {
      // Handle possible errors, such as JSON parsing errors or database errors
      console.error('Failed to subscribe:', error)
      return res.status(500).send({ code: 500, message: 'Failed to add subscription' })
    }
  } else {
    return res.status(400).send({ code: 400, message: 'No subscription provided' })
  }
}

async function verifySubscription(req: Request, res: Response) {
  // TODO: Add authorization here
  // const isAuthorized = process.env.PUSH_SUBSCRIPTION_SECRET === req.body.secret

  // if (!isAuthorized) return res.status(403).send({ code: 403, message: 'Forbidden' })

  const { endpoint } = req.params

  if (endpoint) {
    try {
      // Assuming subscriptionData has the same structure as your PushSubscription model
      const subscription = await prisma.pushSubscription.findUnique({
        where: {
          endpoint,
        },
      })

      if (subscription === null) {
        return res.status(400).send({ code: 400, message: 'No subscription found' })
      }

      return res.status(200).send({ code: 200, message: 'Subscription found' })
    } catch (error) {
      // Handle possible errors, such as JSON parsing errors or database errors
      console.error('Failed to verify subscription exists:', error)
      return res.status(500).send({ code: 500, message: 'No subscription found' })
    }
  } else {
    return res.status(400).send({ code: 400, message: 'No subscription data provided' })
  }
}

async function sendPushMessageToAllSubscribers(req: Request, res: Response) {
  // TODO: How are we authorizing?
  // const isAuthorized = process.env.PUSH_SUBSCRIPTION_SECRET === req.body.secret

  // if (!isAuthorized) return res.status(403).send({ code: 403, message: 'Forbidden' })

  const { message } = req.body

  if (!message) return res.status(400).send({ code: 400, message: 'No message provided.' })

  const pushSubscriptions = await prisma.pushSubscription.findMany()

  const notificationPromises = pushSubscriptions.map((subscription: any) => {
    const formattedSubscription = {
      endpoint: subscription.endpoint,
      keys: JSON.parse(subscription.keys),
    } as any

    return webPush.sendNotification(formattedSubscription, message).catch((error) => {
      console.log(error, 'error on send')
      return {
        statusCode: error.statusCode,
        endpoint: subscription.endpoint,
      }
    })
  })

  const results = await Promise.allSettled(notificationPromises)
  const failedSubscriptions = results
    .filter((result: any) => result.status === 'rejected' || (result.value && result.value.statusCode === 410))
    .map((result: any) => (result.reason ? result.reason.endpoint : result.value.endpoint))

  if (failedSubscriptions.length > 0) {
    // Remove failed subscriptions from the database
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: {
          in: failedSubscriptions,
        },
      },
    })
  }

  return res.status(200).send({ code: 200, message: 'Push messages have been sent.' })
}

/*
    1) Identify news sources (twitter, blog?)
    2) Create unique identifiers (very important to avoid spam in case of any errors/mistakes) for each news source, push them to the database
    3) Pull from database, lock them, send messages, mark as sent
  */

const twitter = (() => {
  // const twitterDir = path.resolve(newsDirectory, 'tweets');
  // We only include tweets which include a specific hashtag
  const curationHashtag = 'Devcon'
  const host = 'https://api.twitter.com/2'
  const bearer = `Bearer ${process.env.TWITTER_API_KEY}`
  const userID = '1013526003015184385'

  const fetchWrapper = (pathname = '', queryParams?: { [key: string]: any }) => {
    const fetchOptions = {
      headers: {
        Authorization: bearer,
      },
    }

    const queryString = new URLSearchParams(queryParams).toString()

    const url = `${host}${pathname}${queryString ? `?${queryString}` : ''}`

    return nodeFetch(url, fetchOptions).then((response: any) => response.json())
  }

  const _interface = {
    recursiveFetch: async (sinceID: number, results: any[] = [], nextToken?: string): Promise<any> => {
      // We have rate limiting issues with twitter - no page cache in dev mode so its pretty brutal on the rate limit - we'll reserve twitter fetches for production
      // Disabled recursive on all environments. Just fetching latest 100 results should be sufficient for news
      // return results
      // if (process.env.NODE_ENV === 'development') return results
      if (process.env.NODE_ENV === 'development' || true) return results

      const queryParams = {
        exclude: 'retweets,replies',
        since_id: sinceID,
        // start_time: '2010-11-06T00:00:00Z'
        max_results: 100,
        'tweet.fields': 'created_at,entities',
      } as any

      if (nextToken) {
        queryParams.pagination_token = nextToken
      }

      const result = await fetchWrapper(`/users/${userID}/tweets`, queryParams)

      if (!result.meta ?? result.meta.result_count === 0) return results

      results = [...results, ...result.data]

      if (result.meta.next_token) {
        await _interface.recursiveFetch(sinceID, results, result.meta.next_token)

        return results
      } else {
        // We only collect tweets that are marked with the curation hashtag
        return results.filter((tweet: any) => tweet?.entities?.hashtags?.some((hashtag: any) => true /*hashtag.tag === curationHashtag*/)) // Add curation hash tag back when relevant
      }
    },
    getTweets: async (sinceID: number): Promise<any> => {
        const tweets = await _interface.recursiveFetch(sinceID)

        return tweets
    },
    getUserID: async () => {
      const result = await fetchWrapper(`/users/by/username/EFDevcon`)

      return result
    },
  }

  return _interface
})()

const formatting = (() => {
    const _interface = {
      formatBlogPost: (post: any) => {
        return {
          title: post.title,
          url: post.link,
          date: post.isoDate,
          author: post.author || 'Devcon Team',
          description: post.content,
          imageUrl: post.enclosure ? post.enclosure.url : '',
        }
      },
      formatTweet: (tweet: any) => {
        return {
          title: tweet.id,
          url: `https://twitter.com/EFDevcon/status/${tweet.id}`,
          date: tweet.created_at,
          author: '@EFDevcon',
          tweetID: tweet.id,
          description: tweet.text,
          imageUrl: '/assets/images/twitter-banner.jpeg',
        }
      },
    }

    return _interface
  })()

const blog = (() => {
  const _interface = {
    getPosts: async () => {
      const feed = await parser.parseURL('http://blog.ethereum.org/feed/category/devcon.xml')

      return feed.items
    },
  }

  return _interface
})()

const fetchNotifications = (() => {
  const sources = {
    twitter: async () => {
        const tweets = await twitter.getUserID()

        return tweets;
    },
    blogPosts: async () => {
        const posts = await blog.getPosts();

        return posts;
    },
  }

  return async (req: Request, res: Response) => {
    const isAuthorized = process.env.PUSH_SUBSCRIPTION_SECRET === req.body.secret

    if (!isAuthorized) return res.status(403).send({ code: 403, message: 'Forbidden' })

    const blogPosts = await sources.blogPosts()
    const tweets = await sources.twitter();

    return res.status(200).send({ code: 200, message: 'Notifications', data: { tweets, blogPosts } })
  }
})()

export const pushSubscriptionsRouter = Router()
pushSubscriptionsRouter.get(`/push-subscriptions/verify/:endpoint`, verifySubscription)
pushSubscriptionsRouter.get(`/push-subscriptions/fetch-notifications`, fetchNotifications)
pushSubscriptionsRouter.post(`/push-subscriptions/subscribe`, subscribe)
pushSubscriptionsRouter.post(`/push-subscriptions/send`, sendPushMessageToAllSubscribers)
