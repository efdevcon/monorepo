import React, { useState } from 'react'
import css from './settings.module.scss'
import { useAccountContext } from 'context/account-context'
import Alert from 'lib/components/alert'
import AccountFooter from '../AccountFooter'
import { Button } from 'lib/components/button'
import { InputForm } from 'components/common/input-form'
import { useAvatar } from 'hooks/useAvatar'
import { getRandomUsername } from 'utils/account'
import { AppNav } from '../../navigation'
import { cn } from 'lib/shadcn/lib/utils'
import router from 'next/router'

export default function UsernameSettings() {
  const accountContext = useAccountContext()
  const currentAccount = accountContext.account
  const avatar = useAvatar()
  const [error, setError] = useState('')
  const [username, setUsername] = useState(currentAccount?.username ?? '')

  if (!accountContext.account) {
    return <></>
  }

  async function updateProfile() {
    if (accountContext && currentAccount) {
      const updated = await accountContext.updateAccount(currentAccount.id, { ...currentAccount, username: username })
      if (updated) {
        router.push('/account')
      } else {
        setError('Error updating profile.')
      }
    }
  }

  return (
    <>
      <div data-type="settings-layout" className={cn('flex flex-row lg:gap-3 relative')}>
        <div className={cn('basis-[60%] grow')}>
          <div className="flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] rounded-3xl relative">
            <div className="flex flex-col gap-3 pb-4 lg:px-4">
              <div className={css['alert']}>
                {error && (
                  <Alert title="Error" color="orange">
                    {error}
                  </Alert>
                )}
              </div>

              <div className={css['form']}>
                <p className={`${css['title']} text-lg font-bold`}>Manage Username</p>
                <p className={css['content']}>Add or update the username of your Devcon account.</p>
                {avatar.ens && !currentAccount?.username && (
                  <p className={css['content']}>
                    You&apos;re using your ENS username. Updating your username on Devcon.org doesn&apos;t update your
                    ENS name.
                  </p>
                )}

                <InputForm
                  className={css['input']}
                  placeholder="Username"
                  defaultValue={username}
                  onChange={value => setUsername(value)}
                  onSubmit={updateProfile}
                />

                <div className="flex flex-row gap-4 items-center">
                  <Button color="purple-2" fill onClick={updateProfile}>
                    Update username
                  </Button>
                </div>
              </div>

              <AccountFooter />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
