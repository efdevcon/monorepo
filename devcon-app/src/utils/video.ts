export function getVideoId(youtubeUrl: string): string {
  let videoId = youtubeUrl
  videoId = videoId.replace('https://youtu.be/', '')
  videoId = videoId.replace('https://www.youtube.com/embed/', '')
  videoId = videoId.replace('https://www.youtube.com/watch?v=', '')
  videoId = videoId.replace('https://studio.youtube.com/video/', '')
  videoId = videoId.replace('&feature=youtu.be', '')
  videoId = videoId.replace('/edit', '')

  return videoId
}
