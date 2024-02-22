import React, { useEffect } from 'react'
import Image from "next/legacy/image"
import css from './pwa.module.scss'
import { Modal } from 'components/common/modal'
import IconPlus from 'assets/icons/plus.svg'
import imagePWA from 'assets/images/pwa_prompt.png'
import { Button } from 'components/common/button'
import { pwaUtilities } from './pwa-utilities'

/*
  TODO: 
    Workbox inspect
    Apple prompt
*/

export const PWAPrompt = (props: any) => {
  const [open, setOpen] = React.useState(false)

  const [deferredInstallEvent, setDeferredInstallEvent] = pwaUtilities.useDetectInstallable({
    togglePrompt: () => setOpen(true),
  })

  return (
    <Modal open={open} close={() => setOpen(!open)} className={css['modal']}>
      <Image alt="Devcon wizard" objectFit="cover" className={css['background']} src={imagePWA} />
      <div className={css['content']}>
        <div className={css['tag']}>
          <p className="font-xs bold">DEVCON WEB APP</p>
        </div>

        <div className={css['info']}>
          <p className={`${css['cta']} font-xl`}>
            <span className="bold">Devcon.org</span> is now an App! Install on your device.
          </p>

          <div className={css['description']}>
            <Button
              className="squared light-blue sm"
              onClick={() =>
                pwaUtilities.installPwa({
                  togglePrompt: () => setOpen(false),
                  deferredInstallEvent,
                  setDeferredInstallEvent,
                })
              }
            >
              <IconPlus />
            </Button>

            <p className="font-xs bold text-uppercase">
              Install on your device by clicking the button and accepting the prompt!
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
