import React, { useEffect, useState } from 'react'
import css from './settings.module.scss'
import { useAccountContext } from 'context/account-context'
import Alert from 'lib/components/alert'
import AccountFooter from '../AccountFooter'
import NotFound from './NotFound'
import IconCross from 'assets/icons/cross.svg'
import { Button } from 'lib/components/button'
import { Link } from 'components/common/link'
import { useActiveAddress } from 'hooks/useActiveAddress'
import { Tooltip } from 'components/common/tooltip'
import { useRouter } from 'next/router'
import { useAccount, useSignMessage } from 'wagmi'
import { createSiweMessage } from 'viem/siwe'
import { cn } from 'lib/shadcn/lib/utils'
import { useAppKit } from '@reown/appkit/react'

export default function WalletSettings() {
  const { open } = useAppKit()
  const router = useRouter()
  const accountContext = useAccountContext()
  const activeAddress = useActiveAddress()
  const [error, setError] = useState('')
  const [promptRemove, setPromptRemove] = useState('')
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const { address } = useAccount()
  const [loginWeb3, setLoginWeb3] = useState(false)
  const { signMessageAsync } = useSignMessage()

  const addWallet = async () => {
    if (!address) {
      await open()
    }

    setLoginWeb3(true)
  }

  useEffect(() => {
    async function LoginWithWallet() {
      if (!address) {
        setError('No address.')
        return
      }

      const token = await accountContext.getToken(address.toLowerCase(), false)
      if (!token) {
        setError('Unable to create verification token')
        return
      }

      const message = createSiweMessage({
        address: address,
        chainId: 1,
        domain: 'app.devcon.org',
        nonce: token.nonce.toString(),
        statement: `Sign this message to prove you have access to this wallet. This won't cost you anything.`,
        uri: 'https://app.devcon.org/',
        version: '1',
      })

      const signature = await signMessageAsync({ message })
      const userAccount = await accountContext.loginWeb3(address.toLowerCase(), token.nonce, message, signature)
      if (userAccount) {
        router.push('/account')
      }
      if (!userAccount) {
        setError('Unable to login with web3')
      }
    }

    if (address && loginWeb3) LoginWithWallet()
  }, [address, loginWeb3])

  const removeWallet = async () => {
    if (!accountContext.account) return

    await accountContext.updateAccount(accountContext.account.id, {
      ...accountContext.account,
      addresses: accountContext.account.addresses.filter(i => i !== promptRemove),
    })

    setPromptRemove('')
  }

  if (!accountContext.account) {
    return <></>
  }

  const canDelete = accountContext.account?.addresses?.length > 0 && !!accountContext.account.email

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
                <p className={`${css['title']} text-lg font-bold`}>Manage Wallets</p>
                <p className={css['content']}>Add or update the wallets associated with your Devcon account.</p>

                {accountContext.account.addresses?.length === 0 && (
                  <div className={css['wallet-not-found']}>
                    <NotFound type="wallet" />
                  </div>
                )}

                {accountContext.account.addresses?.length > 0 && (
                  <ul className={css['items']}>
                    {accountContext.account.addresses.map(i => {
                      const isActive = activeAddress === i.toLowerCase()

                      return (
                        <li key={i}>
                          <Link to={`https://etherscan.io/address/${i}`}>
                            <>
                              <span className={isActive ? 'semi-bold' : ''}>{i}</span>
                              {isActive && <> (active)</>}
                            </>
                          </Link>

                          {canDelete && (
                            <span role="button" className={css['delete']} onClick={() => setPromptRemove(i)}>
                              <IconCross />
                            </span>
                          )}

                          {!canDelete && (
                            <Tooltip
                              arrow={false}
                              visible={tooltipVisible}
                              content={
                                <p>
                                  Can&apos;t delete this address. You need at least 1 wallet or email address connected.
                                </p>
                              }
                            >
                              <span
                                role="button"
                                className={css['disabled']}
                                onClick={() => setTooltipVisible(!tooltipVisible)}
                              >
                                <IconCross />
                              </span>
                            </Tooltip>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="mt-4">
                  {promptRemove && (
                    <>
                      <p>
                        Are you sure you want to remove <strong>{promptRemove}</strong> from your account?
                      </p>

                      <div className="flex flex-row gap-4 mt-4">
                        <Button color="black-1" fill onClick={() => setPromptRemove('')}>
                          No, keep address
                        </Button>
                        <Button color="purple-2" fill onClick={removeWallet}>
                          Yes, delete address
                        </Button>
                      </div>
                    </>
                  )}

                  {!promptRemove && (
                    <div className="flex flex-row gap-4">
                      <Button color="purple-2" fill onClick={addWallet}>
                        Add Ethereum Wallet
                      </Button>
                    </div>
                  )}
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
