import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import { Notification } from 'types/Notification'
import { BASE_CONTENT_FOLDER } from 'utils/constants'
import moment from 'moment'
import cacheData from "memory-cache"

const CACHE_KEY = 'TWITTER.NOTIFICATIONS'
const TWITTER_HASHTAG = 'Notice'

export function GetNotificationStrip(lang: string = 'en') {
  if (lang !== 'es') lang = 'en'

  return GetNotifications(lang).shift() || null
}

export async function GetAppNotifications(): Promise<Array<Notification>> {
  const twitter = await GetTwitterNotifications()
  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'app-notifications');
  const exists = fs.existsSync(dir);

  if (!exists) return twitter

  const notifications = fs.readdirSync(dir).map(i => {
    const content = fs.readFileSync(join(dir, i), 'utf8')

    const doc = matter(content)

    return {
      id: i,
      title: doc.data.title || null,
      body: doc.content || null,
      date: doc.data.date?.valueOf() || null,
      url: doc.data.url || null,
      label: doc.data.label || null,
      labelType: doc.data.labelType || null,
      active: doc.data.active || null,
    } as Notification
  })

  return [...notifications, ...twitter].sort((a: Notification, b: Notification) => {
    return moment(b.date).valueOf() - moment(a.date).valueOf()
  })
  //.filter(i => i && i.active) as Array<Notification>
}

export function GetNotifications(lang: string = 'en'): Array<Notification> {
  if (lang !== 'es') lang = 'en'

  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'notifications', lang)
  const notifications = fs.readdirSync(dir).map(i => {
    const content = fs.readFileSync(join(dir, i), 'utf8')
    if (!content) {
      console.log('File has no content..', i)
      return undefined
    }

    const doc = matter(content)
    return {
      id: i,
      title: doc.content,
      url: doc.data.url,
      label: doc.data.label,
      labelType: doc.data.labelType,
      active: doc.data.active,
    } as Notification
  })

  return notifications.filter(i => i && i.active) as Array<Notification>
}

export async function GetTwitterNotifications(): Promise<Array<Notification>> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Reducing API limits.. Return')
    return []
  }

  const value = cacheData.get(CACHE_KEY)
  if (value) {
    return value
  }

  const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?max_results=10&tweet.fields=created_at&query=from%3Aefdevcon %23${TWITTER_HASHTAG}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.TWITTER_API_KEY_NOTIFICATION}`
    },
  })

  const body = await response.json()
  if (body.status !== 200) {
    const tweets = body.data?.map((i: any) => {
      return {
        id: i.id,
        title: 'Twitter Notification',
        body: i.text,
        date: moment(i.created_at).valueOf(),
        url: `https://twitter.com/EFDevcon/status/${i.id}`,
        label: 'Twitter',
        active: true,
      }
    }) || []

    cacheData.put(CACHE_KEY, tweets)
    return tweets
  }

  return []
}