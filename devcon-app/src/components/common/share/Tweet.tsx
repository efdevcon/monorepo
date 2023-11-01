import React from 'react'
import { Link } from 'components/common/link'
import IconTwitter from 'assets/icons/twitter.svg'

export const Tweet = React.memo((props: { text: string }) => {
  return (
    <Link
      to={`https://twitter.com/intent/tweet?text=${encodeURIComponent(props.text)}&url=${encodeURIComponent(
        'https://www.devcon.org/'
      )}`}
    >
      <button className="white">
        <IconTwitter /> Twitter
      </button>
    </Link>
  )
})
