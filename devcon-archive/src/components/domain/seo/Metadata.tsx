import moment from 'moment'
import React from 'react'
import { ArchiveVideo } from 'src/types/ArchiveVideo'

interface Props {
  type: 'video'
  data: ArchiveVideo
}

export function Metadata(props: Props) {
  function generateJsonLd() {
    if (props.type === 'video') {
      const video = props.data as ArchiveVideo
      let date = moment()
      if (video.edition === 0) date = moment('2014-11-24')
      if (video.edition === 1) date = moment('2015-11-09')
      if (video.edition === 2) date = moment('2016-09-19')
      if (video.edition === 3) date = moment('2017-11-01')
      if (video.edition === 4) date = moment('2018-10-30')
      if (video.edition === 5) date = moment('2019-10-08')
      if (video.edition === 6) date = moment('2022-10-11')

      return `{
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": "${video.title}",
        "description": "${video.description.replace(/"/g, "'")}",
        "thumbnailUrl": [
          "https://archive.devcon.org/assets/images/archive-social.png"
        ],
        "uploadDate": "${date.toISOString()}",
        "duration": "${moment.duration(video.duration, 'milliseconds').toISOString()}",
        "contentUrl": "https://cloudflare-ipfs.com/ipfs/${video.ipfsHash}"
      }`
    }

    return ``
  }

  // console.log('METADATA', generateJsonLd())

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: generateJsonLd() }} key="event-jsonld" />
}

