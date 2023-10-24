import { ArchiveVideo } from 'src/types/ArchiveVideo'

export function ToArchiveData(source: any): Array<ArchiveVideo> {
  return []
  // const videos = source.videos ? source.videos.nodes.map((video: ArchiveVideo) => ToArchiveVideo(video)) : []
  // for (let i = videos.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1))
  //   ;[videos[i], videos[j]] = [videos[j], videos[i]]
  // }

  // return videos
}
