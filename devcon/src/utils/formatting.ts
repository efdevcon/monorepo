import moment from "moment"
import slugify from "slugify"
import { EVENT_DAYS } from "./constants"

export function GetExcerpt(text: string, length: number = 250) {
  if (text.length > length) {
    return text.substring(0, length) + '...'
  }

  return text
}

export function GetDomainName(url: string): string {
  return url.replace('http://', '').replace('https://', '').replace('www.', '').split(/[\/?#]/)[0];
}

export function TruncateMiddle(text: string, length: number = 5) {
  if (text.length > length * 2 + 1) {
    return `${text.substring(0, length)}...${text.substring(text.length - length, text.length)}`
  }

  return text
}

export function GetDevconDay(timestamp: number): string {
  const day = moment.utc(timestamp).date()
  const index = EVENT_DAYS.indexOf(day)
  return index > -1 ? `Day ${index + 1}` : ''
}

export function defaultSlugify(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true })
}
