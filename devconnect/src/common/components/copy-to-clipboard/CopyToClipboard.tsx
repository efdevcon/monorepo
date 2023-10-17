import React from 'react'
import ShareIcon from 'assets/icons/share.svg'
import Tooltip from '../tooltip'

type ShareProps = {
  url?: string
  onShare?: () => any
  children?: React.ReactNode
}

export const CopyToClipboard = ({ url, onShare, children }: ShareProps) => {
  const [clicked, setClicked] = React.useState(false)

  return (
    // @ts-ignore
    <Tooltip arrow={false} open={clicked} title="Copied to Clipboard">
      <div
        style={{ display: 'inline-block', cursor: 'pointer' }}
        onClick={() => {
          if (onShare) {
            onShare()
            return
          }

          if (window?.navigator?.clipboard) {
            if (url) {
              navigator.clipboard.writeText(url)
            }

            setClicked(true)

            setTimeout(() => {
              setClicked(false)
            }, 800)
          }
        }}
      >
        {children || <ShareIcon />}
      </div>
    </Tooltip>
  )
}
