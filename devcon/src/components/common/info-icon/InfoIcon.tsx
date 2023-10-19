import React from 'react'
import css from './info-icon.module.scss'
import IconHelp from 'assets/icons/icon-help.svg'
import { Modal } from 'components/common/modal'

type InfoIconProps = {
  children: React.ReactNode
  [key: string]: any
}

export const InfoIcon = ({ children, ...props }: InfoIconProps) => {
  const [infoOpen, setInfoOpen] = React.useState(false)

  return (
    <>
      <Modal className={css['modal-overrides']} open={infoOpen} close={() => setInfoOpen(false)} unstyled noIcon>
        {children}
      </Modal>

      <IconHelp onClick={() => setInfoOpen(true)} {...props} style={{ cursor: 'pointer' }} />
    </>
  )
}
