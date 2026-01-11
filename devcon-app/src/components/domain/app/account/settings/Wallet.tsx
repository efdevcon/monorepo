import React from 'react'
import css from './settings.module.scss'
import { useAccountContext } from 'context/account-context'
import AccountFooter from '../AccountFooter'
import { cn } from 'lib/shadcn/lib/utils'
import Alert from 'lib/components/alert'

// Wallet functionality temporarily disabled - causing Netlify serverless function issues
export default function WalletSettings() {
  const accountContext = useAccountContext()

  if (!accountContext.account) {
    return <></>
  }

  return (
    <>
      <div data-type="settings-layout" className={cn('flex flex-row lg:gap-3 relative')}>
        <div className={cn('basis-[60%] grow')}>
          <div className="flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] lg:bg-[#fbfbfb] rounded-3xl relative">
            <div className="flex flex-col gap-3 pb-4 px-4">
              <div className={css['form']}>
                <p className={`${css['title']} text-lg font-bold`}>Manage Wallets</p>
                
                <Alert title="Temporarily Unavailable" color="orange">
                  Wallet management is temporarily unavailable while we prepare for Devcon 8. 
                  Your existing wallet connections are preserved and will be accessible again soon.
                </Alert>

                {accountContext.account.addresses?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">Connected wallets:</p>
                    <ul className={css['items']}>
                      {accountContext.account.addresses.map(i => (
                        <li key={i} className="text-gray-600">
                          {i.slice(0, 6)}...{i.slice(-4)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <AccountFooter />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
