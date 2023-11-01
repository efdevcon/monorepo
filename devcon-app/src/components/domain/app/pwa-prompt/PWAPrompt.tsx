import React, { useEffect } from 'react'
import Image from 'next/image'
import css from './pwa.module.scss'
import { Modal } from 'components/common/modal'
import IconPlus from 'assets/icons/plus.svg'
import IconAppleShare from 'assets/icons/share-apple.svg'
import imagePWA from 'assets/images/pwa_prompt.png'
import { Button } from 'components/common/button'
import { pwaUtilities } from './pwa-utilities'
import moment from 'moment'

const lastSeenKey = 'pwa_prompt_timestamp'
const howOftenToPrompt = [8, 'hours'] // [30, 'seconds']

export const PWAPrompt = () => {
  const [open, setOpen] = React.useState(false)

  const promptIfNotLocked = React.useMemo(
    () => () => {
      const lastRejectionTimestamp = localStorage.getItem(lastSeenKey)

      if (lastRejectionTimestamp) {
        const lastRejection = moment.utc(lastRejectionTimestamp)
        const nowWithThreshold = moment.utc().subtract(...howOftenToPrompt)

        // If prompted recently, abort
        if (nowWithThreshold.isBefore(lastRejection)) {
          return
        }
      }

      localStorage.setItem(lastSeenKey, moment.utc().toISOString())
      setOpen(true)
    },
    []
  )

  const { requiresManualInstall, deferredEvent, setDeferredEvent } = pwaUtilities.useDetectInstallable({
    togglePrompt: promptIfNotLocked,
  })

  useEffect(() => {
    if (requiresManualInstall) {
      promptIfNotLocked()
    }
  }, [requiresManualInstall, promptIfNotLocked])

  return (
    <Modal open={open} close={() => setOpen(!open)} className={css['modal']}>
      <Image alt="Devcon wizard" objectFit="cover" className={css['background']} src={imagePWA} />
      <div className={css['content']}>
        <div className={css['tag']}>
          <p className="font-xs bold">DEVCON PASSPORT APP</p>
        </div>

        <div className={css['info']}>
          <p className={`${css['cta']} font-xl`}>
            This website can be used as an <span className="bold">App!</span> Install by following the instructions
            below.
          </p>

          <div className={css['description']}>
            {requiresManualInstall ? (
              (() => {
                if (requiresManualInstall === 'ios') {
                  return (
                    <p className="font-xs bold text-uppercase">
                      IOS Instructions: Open this website in Safari, press{' '}
                      <IconAppleShare style={{ fontSize: '2em', transform: 'translateY(3px) ' }} />, then &quot;Add to
                      home screen&quot;
                    </p>
                  )
                } else if (requiresManualInstall === 'samsung') {
                  return (
                    <p className="font-xs bold text-uppercase">
                      Instructions: An &quot;Install&quot; icon will be shown on the top bar OR press &quot;Menu&quot;
                      on the bottom bar then &quot;Add/install to home&quot;
                    </p>
                  )
                }

                return (
                  <p className="font-xs bold text-uppercase">
                    Instructions: Press menu on the bottom/top bar then &quot;Add/install to home&quot;
                  </p>
                )
              })()
            ) : (
              <>
                <Button
                  className="squared light-blue sm"
                  onClick={() =>
                    pwaUtilities.installPwa({
                      togglePrompt: () => setOpen(false),
                      deferredEvent,
                      setDeferredEvent,
                    })
                  }
                >
                  <IconPlus />
                </Button>

                <p className="font-xs bold text-uppercase">
                  Install on your device by clicking the button and accepting the prompt!
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
