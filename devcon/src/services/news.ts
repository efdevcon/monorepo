import { NewsItem } from 'types/NewsItem'
import { BASE_CONTENT_FOLDER } from 'utils/constants'
import nodeFetch from 'node-fetch'
import matter from 'gray-matter'
import { GetTags } from 'services/page'
import moment from 'moment'
import Parser from 'rss-parser'
import newsTweets from 'content/news-tweets.json'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const RSSParser = require('rss-parser')
const parser: Parser = new RSSParser({
  customFields: {
    item: ['efblog:image', 'description'],
  },
})

const timeBasedCache = (() => {
  let timeLastFetched = moment()
  let cache: any

  return (fn: any) =>
    async (...args: any) => {
      const shouldRefreshCache = moment().isAfter(timeLastFetched.add('30', 'minutes')) || !cache

      if (shouldRefreshCache) {
        // Update time last fetched immediately to prevent parallel requests
        const previousTimeLastFetched = timeLastFetched.clone()
        timeLastFetched = moment()

        try {
          cache = await fn(...args)
        } catch (e) {
          // If anything goes wrong, we reset timeLastFetched to its previous value so subsequent calls will attempt to refresh the cache
          timeLastFetched = previousTimeLastFetched
          console.error(e, 'twitter cache revalidation failed')
        }
      } else {
        console.log('serving from cache')
      }

      return cache
    }
})()

const formatting = (() => {
  const _interface = {
    formatBlogPost: (post: any): NewsItem => {
      return {
        title: post.title,
        url: post.link,
        date: moment(post.isoDate).valueOf(),
        author: post.author || 'Devcon Team',
        description: post.content,
        imageUrl: post.enclosure ? post.enclosure.url : '',
      }
    },
    formatTweet: (tweet: any): NewsItem => {
      return {
        title: tweet.id,
        url: `https://twitter.com/EFDevcon/status/${tweet.id}`,
        date: moment(tweet.created_at).valueOf(),
        author: '@EFDevcon',
        tweetID: tweet.id,
        description: tweet.text,
        imageUrl: '/assets/images/twitter-banner.png',
      }
    },
  }

  return _interface
})()

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
        return results.filter((tweet: any) =>
          tweet?.entities?.hashtags?.some((hashtag: any) => true /*hashtag.tag === curationHashtag*/)
        ) // Add curation hash tag back when relevant
      }
    },
    getTweets: timeBasedCache(async (sinceID: number): Promise<any> => {
      const tweets = await _interface.recursiveFetch(sinceID)

      return tweets
    }),
    getUserID: async () => {
      const result = await fetchWrapper(`/users/by/username/EFDevcon`)

      return result
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

const getNewsItems = async (lang: string) => {
  if (lang !== 'es') lang = 'en'

  const tweetsFormatted = newsTweets.map(formatting.formatTweet)
  const blogs = await blog.getPosts()
  const blogsFormatted = blogs.map(formatting.formatBlogPost)

  let newsFromCMS: NewsItem[] | [] = []

  try {
    const cmsPath = path.resolve(process.cwd(), 'src/content/news', lang)

    newsFromCMS = fs
      .readdirSync(cmsPath)
      .map((file: any) => {
        const content = fs.readFileSync(path.join(cmsPath, file), 'utf8')

        if (!content) {
          console.log('File has no content..', file)
          return undefined
        }

        const doc = matter(content)
        const allTags = GetTags(lang)
        const tags: Array<string> = doc.data.tags ?? []

        return {
          ...doc.data,
          id: file.replace('.md', '').toLowerCase(),
          title: doc.data.title,
          date: moment(doc.data.date).valueOf(), //new Date(doc.data.date).getTime(),
          tags: tags.map(i => allTags.find(x => x.slug === i)).filter(i => !!i),
        } as NewsItem
      })
      .filter((i: any) => !!i) as Array<NewsItem>
  } catch (e) {
    // Doesn't matter really
  }

  return [...newsFromCMS, ...blogsFormatted, ...tweetsFormatted].sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else if (a.date === b.date) {
      return 0
    } else {
      return -1
    }
  })
}

export default getNewsItems
