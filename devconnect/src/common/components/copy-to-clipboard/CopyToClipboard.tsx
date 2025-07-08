import React from 'react'
import ShareIcon from 'assets/icons/share.svg'
import { Copy } from 'lucide-react'
import Tooltip from '../tooltip'

type ShareProps = {
  url?: string
  onShare?: () => any
  children?: React.ReactNode
  useCopyIcon?: boolean
  copyIconSize?: number
}

export const CopyToClipboard = ({ url, onShare, children, useCopyIcon = false, copyIconSize = 16 }: ShareProps) => {
  const [clicked, setClicked] = React.useState(false)

  const defaultIcon = useCopyIcon ? <Copy size={copyIconSize} /> : <ShareIcon />

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
        {children || defaultIcon}
      </div>
    </Tooltip>
  )
}
