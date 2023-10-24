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

export function getDevconDate(edition: number): string {
  switch (edition) {
    case 6:
      return 'Oct 2022'
    case 5:
      return 'Oct 2019'
    case 4:
      return 'Oct 2018'
    case 3:
      return 'Nov 2017'
    case 2:
      return 'Sep 2016'
    case 1:
      return 'Nov 2015'
    case 0:
      return 'Nov 2014'
  }

  return ''
}