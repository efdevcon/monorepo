export function GetExcerpt(text: string, length: number = 250) {
  if (text.length > length) {
    return text.substring(0, length) + '...'
  }

  return text
}

export function GetDomainName(url: string): string {
  return url.replace('http://', '').replace('https://', '').replace('www.', '').split(/[/?#]/)[0]
}

export function TruncateMiddle(text: string, length: number = 5) {
  if (text.length > length * 2 + 1) {
    return `${text.substring(0, length)}...${text.substring(text.length - length, text.length)}`
  }

  return text
}
