import React, { useState } from 'react'
import IpfsIcon from 'assets/icons/ipfs.svg'
import InfoIcon from 'assets/icons/info.svg'
import CopyIcon from 'assets/icons/copy.svg'
import { Link } from 'components/common/link'
import { Modal, ModalSlide } from 'components/common/modal'
import css from './banner.module.scss'
import { Tooltip } from 'components/common/tooltip'
import { TruncateMiddle } from 'utils/formatting'
import ipfsImage from 'assets/images/ipfs_illustration.png'

interface Props {
  hash: string
  learnMore?: boolean
  cta?: string
  className?: string
}

export const Banner = (props: Props) => {
  const [copied, setCopied] = useState(false)
  const [ipfsModal, setIpfsModal] = useState(false)
  const [ipfsPinModal, setIpfsPinModal] = useState(false)

  let className = css['container']
  if (props.className) className += ` ${props.className}`

  if (!props.hash) return null

  return (
    <div className={className}>
      <div className={css['top']}>
        <div className={css['cta']}>
          <Link to={`https://ipfs.io/ipfs/${props.hash}`}>{props.cta ?? 'IPFS'}</Link>
          <span
            className={css['learn-more']}
            role="button"
            aria-label="Learn more about IPFS"
            onClick={() => setIpfsModal(true)}
          >
            <InfoIcon />
          </span>
        </div>
        <div className={css['link']}>
          <p>
            <IpfsIcon />
          </p>
          <p className={css['truncated']}>{TruncateMiddle(props.hash)}</p>
          <p className={css['hash']}>{props.hash}</p>
          <p>
            <Tooltip arrow={true} visible={copied} content={<p>Copied hash to clipboard</p>}>
              <span
                className={css['copy-icon']}
                role="button"
                aria-label="Copy hash to clipboard"
                onClick={() => {
                  if (window?.navigator?.clipboard) {
                    navigator.clipboard.writeText(props.hash)
                    setCopied(true)

                    setTimeout(() => {
                      setCopied(false)
                    }, 800)
                  }
                }}
              >
                <CopyIcon />
              </span>
            </Tooltip>
          </p>
        </div>

        <Modal image={ipfsImage} open={ipfsModal} close={() => setIpfsModal(false)} title="What is IPFS">
          <div className={css['modal-content']}>
            <p>Let&apos;s just start with a one-line definition of IPFS:</p>
            <p className={css['lead']}>
              IPFS is a distributed system for storing and accessing files, websites, applications, and data.
            </p>
            <p className="semi-bold">Why Distribute Content?</p>
            <p>
              Help make devcon content less reliant on centralized platforms that may not be accessible by users around
              the world. Utilizing decentralized systems we can ensure that devcon content is always available to those
              interested in learning more about Ethereum regardless of intermediaries.
            </p>
            <p>
              <Link to="https://docs.ipfs.io/" indicateExternal>
                Learn more about IPFS
              </Link>
            </p>
          </div>
        </Modal>

        <Modal
          image={ipfsImage}
          open={ipfsPinModal}
          close={() => setIpfsPinModal(false)}
          title="Pinning content on IPFS"
        >
          <ModalSlide>
            <div className={css['modal-content']}>
              <p className="bold">Why pin content on IPFS?</p>
              <p>
                To ensure that content persists on IPFS, and is not deleted during garbage collection, data can be
                pinned to one or more IPFS nodes. Pinning gives you control over disk space and data retention. You
                should use that control to pin any content you wish to help keep on IPFS indefinitely. The default
                behavior for IPFS is to pin files to your local IPFS node.
              </p>

              <p className="bold">Pin Devcon archive videos on your node</p>

              <p>
                <Link className="hover-underline" to="https://docs.ipfs.io/install/ipfs-desktop/">
                  IPFS Desktop Application
                </Link>{' '}
                •{' '}
                <Link className="hover-underline" to="https://brave.com/">
                  Brave
                </Link>{' '}
                •{' '}
                <Link className="hover-underline" to="https://www.opera.com/">
                  Opera
                </Link>{' '}
                •{' '}
                <Link className="hover-underline" to="https://docs.ipfs.io/install/ipfs-companion/">
                  IPFS Companion
                </Link>
              </p>

              <Link to="https://docs.ipfs.io/how-to/pin-files/" className={`${css['learn-more-link']}`}>
                Learn more about pinning 🡥
              </Link>
            </div>
          </ModalSlide>
          <ModalSlide>
            <div className={css['modal-content']}>
              <p className="bold">Pinning Content Remotely</p>
              <p>
                Depending on how you use IPFS you might find it useful to use a remote pinning service. There are a
                number of commercial pinning services that make it easy for you to purchase pinning capacity for your
                important files.
              </p>
              <p className="bold">Pin Devcon archive videos remotely</p>
              <p>
                <Link className="hover-underline" to="https://docs.pinata.cloud/api-pinning/pin-file">
                  Pinata
                </Link>
                <span>{' • '}</span>
                <Link className="hover-underline" to="https://temporal.cloud/">
                  Temporal
                </Link>
                <span>{' • '}</span>
                <Link className="hover-underline" to="https://wiki.crust.network/docs/en/buildIPFSW3AuthPin">
                  Crust
                </Link>
                <span>{' • '}</span>
                <Link className="hover-underline" to="https://infura.io/docs/ipfs#section/Getting-started/Pin-a-file">
                  Infura
                </Link>
              </p>

              <Link
                to="https://docs.ipfs.io/how-to/work-with-pinning-services/"
                className={`${css['learn-more-link']}`}
              >
                Learn more about Pinning Remotely 🡥
              </Link>
            </div>
          </ModalSlide>
        </Modal>
      </div>

      {props.learnMore && (
        <div className={css['bottom']}>
          <p>
            Help decentralize Devcon content by pinning this video on IPFS.
            <span className={css['learn-more']} role="button" onClick={() => setIpfsPinModal(true)}>
              Learn More
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
