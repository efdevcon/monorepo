import React, { useEffect, useState } from 'react'
import css from './share.module.scss'
import ShareIcon from 'assets/icons/share.svg'
import CopyIcon from 'assets/icons/copy.svg'
import { Modal } from 'components/common/modal'
import Toggle from 'react-toggle'
import { useAccountContext } from 'context/account-context'
import { SITE_URL } from 'utils/constants'
import { Tooltip } from 'components/common/tooltip'
import { Link } from 'components/common/link'

export const ShareScheduleModal = () => {
  const accountContext = useAccountContext()
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : SITE_URL
  const [infoOpen, setInfoOpen] = useState(accountContext.edit === true ? true : false)
  const [clicked, setClicked] = useState(false)

  const toggleScheduleSharing = async () => {
    setInfoOpen(true)

    if (accountContext.account) {
      accountContext.toggleScheduleSharing(accountContext.account)
    }
  }

  if (!accountContext.account) return <>Need to login first</>

  const scheduleUri = `${origin}/app/schedule/u/${accountContext.account._id}/`

  return (
    <>
      <Modal className={css['modal']} open={infoOpen} close={() => setInfoOpen(false)} unstyled noIcon>
        <h4 className="text-uppercase title">Share Schedule</h4>

        <div className={css['setting']}>
          <p>Anyone with your link could view your schedule.</p>
          <div className={css['toggle']}>
            {/*
                        TODO: Fix type
                        @ts-ignore */}
            <Toggle
              defaultChecked={accountContext.account?.appState?.publicSchedule}
              onChange={toggleScheduleSharing}
            />
          </div>
        </div>
        <div className={css['link']}>
          <input
            type="text"
            className={css['input']}
            value={scheduleUri}
            readOnly
            disabled={!accountContext.account?.appState?.publicSchedule}
          />

          {!!accountContext.account?.appState?.publicSchedule && (
            <div className={css['icon']}>
              <Tooltip arrow={false} visible={clicked} content={<p>Copied</p>}>
                <div style={{ cursor: 'pointer' }}>
                  <CopyIcon
                    onClick={() => {
                      if (window?.navigator?.clipboard) {
                        navigator.clipboard.writeText(scheduleUri)

                        setClicked(true)

                        setTimeout(() => {
                          setClicked(false)
                        }, 800)
                      }
                    }}
                  />
                </div>
              </Tooltip>
            </div>
          )}
        </div>

        <p>
          Go to <Link to="/app/settings#account">settings</Link> if you want to configure your account and profile.
        </p>
      </Modal>

      <ShareIcon style={{ cursor: 'pointer' }} onClick={() => setInfoOpen(true)} />
    </>
  )
}
