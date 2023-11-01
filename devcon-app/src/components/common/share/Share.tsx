import React from 'react'
import { useTranslations } from 'next-intl'
import { Tooltip } from 'components/common/tooltip'
import ShareIcon from 'assets/icons/share.svg'
import { Modal } from 'components/common/modal'
import { Tweet } from './Tweet'
import { Link } from 'components/common/link'
import css from './share.module.scss'
import IconEmail from 'assets/icons/pencil.svg'

type ShareProps = {
  renderTrigger?: (onClick: React.Dispatch<React.SetStateAction<undefined>>) => React.ReactNode
  url?: string
  onShare?: () => any
}

// Remove soon - share should now use the custom share sheet instead of this
export const CopyToClipboardLegacy = ({ url, onShare }: any) => {
  const [clicked, setClicked] = React.useState(false)

  return (
    <Tooltip arrow={false} visible={clicked} content={<p>Copied to clipboard</p>}>
      <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
        <ShareIcon
          onClick={() => {
            if (onShare) {
              onShare()

              return
            }

            if (window?.navigator?.clipboard) {
              navigator.clipboard.writeText(url)

              setClicked(true)

              setTimeout(() => {
                setClicked(false)
              }, 800)
            }
          }}
        />
      </div>
    </Tooltip>
  )
}

const CopyToClipboard = ({ url }: any) => {
  const [clicked, setClicked] = React.useState(false)
  const intl = useTranslations()
  const hashIndex = window.location.href.indexOf(window.location.hash)
  const location = hashIndex ? window.location.href.substring(0, hashIndex) : window.location.href

  return (
    <div className={css['copy-to-clipboard']}>
      <div className={css['link-text']}>{location}</div>

      <Tooltip arrow={false} visible={clicked} content={<p>Copied to clipboard</p>}>
        <button
          className={`white ${css['copy-button']}`}
          onClick={() => {
            // TO-DO: Make SSR safe so we can conditionally render component
            if (window?.navigator?.clipboard) {
              navigator.clipboard.writeText(location)

              setClicked(true)

              setTimeout(() => {
                setClicked(false)
              }, 800)
            }
          }}
        >
          {intl('rtd_share_copy_link')}
        </button>
      </Tooltip>
    </div>
  )
}

const messages = (intl: any) => [
  {
    text: intl('rtd_share_reunion'),
    value: intl('rtd_share_reunion_text'),
    email: intl('rtd_share_reunion_text_email'),
  },
  {
    text: intl('rtd_share_experience'),
    value: intl('rtd_share_experience_text'),
    email: intl('rtd_share_experience_text_email'),
  },
  {
    text: intl('rtd_share_speakers'),
    value: intl('rtd_share_speakers_text'),
    email: intl('rtd_share_speakers_text_email'),
  },
]

const ExcitedFor = (props: { onChange: (...rest: any[]) => any; value: number | null; native: boolean }) => {
  const intl = useTranslations()

  return (
    <div className={css['excited-for']}>
      <p className="semi-bold">{intl('rtd_share_looking_forward_to')}</p>

      <div>
        {messages(intl).map(({ text, value }, index) => {
          if (props.native) {
            return (
              <button
                key={index}
                onClick={() => {
                  navigator.share({
                    title: intl('rtd'),
                    text: value,
                    url: window.location.href,
                  })
                }}
                className="text-uppercase white"
              >
                {text}
              </button>
            )
          }

          const selected = index === props.value

          return (
            <p
              key={index}
              onClick={() => props.onChange(index)}
              className={`hover-underline text-uppercase${selected ? ' bold text-underline' : ''}`}
            >
              {text}
            </p>
          )
        })}
      </div>
    </div>
  )
}

export const Share = (props: ShareProps) => {
  const nativeSharePossible =
    false /*!!(typeof window !== 'undefined' && window.navigator && window.navigator.share) <--- comment back in to enable native share */
  const [open, setOpen] = React.useState(false)
  const [excitedFor, setExcitedFor] = React.useState(nativeSharePossible ? null : 0)
  const intl = useTranslations()
  const message = excitedFor === null ? null : messages(intl)[excitedFor]
  const toggle = () => setOpen(!open)

  if (props.renderTrigger) {
    return (
      <>
        <Modal
          open={open}
          close={toggle}
          onMouseDown={(e: React.SyntheticEvent) => e.stopPropagation()}
          onWheel={(e: React.SyntheticEvent) => e.nativeEvent.stopImmediatePropagation()}
        >
          <div className={css['share']}>
            <h2 className="text-uppercase">{intl('rtd_share')}</h2>

            <ExcitedFor value={excitedFor} native={nativeSharePossible} onChange={setExcitedFor} />

            {!nativeSharePossible && message && (
              <>
                <div className={css['buttons']}>
                  <Tweet text={message.value} />

                  <Link title="Share by Email" to={`mailto:?subject=${intl('rtd')}&body=${message.email}`}>
                    <button className={`white ${css['email']}`}>
                      <IconEmail /> Email
                    </button>
                  </Link>
                </div>

                <CopyToClipboard />
              </>
            )}
          </div>
        </Modal>

        {props.renderTrigger(toggle)}
      </>
    )
  }

  // Remove later
  return <CopyToClipboardLegacy {...props} />
}
