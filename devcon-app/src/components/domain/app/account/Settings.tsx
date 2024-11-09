import React, { useState } from 'react'
import css from './login.module.scss'
import { Link, LinkList } from 'components/common/link'
import { Button } from 'lib/components/button'
import { useAccountContext } from 'context/account-context'
import Alert from 'lib/components/alert'
import { CollapsedSection, CollapsedSectionHeader, CollapsedSectionContent } from 'components/common/collapsed-section'
import AccountFooter from './AccountFooter'
import { useAvatar } from 'hooks/useAvatar'
import { isEmail } from 'utils/validators'
import { TruncateMiddle } from 'utils/formatting'
import { useRouter } from 'next/router'
import Toggle from 'react-toggle'
import { EMAIL_DEVCON } from 'utils/constants'
import { cn } from 'lib/shadcn/lib/utils'
import { LoggedInCard } from 'components/domain/app/dc7/dashboard'
import { Notifications } from 'components/domain/app/dc7/profile/notifications'
import { toast } from 'lib/hooks/use-toast'
import CopyIcon from 'assets/icons/copy.svg'
import Tabs from 'components/domain/app/account/tabs'

export const EditSettings = () => {
  const [openTabs, setOpenTabs] = useState<any>({})

  return (
    <CollapsedSection
      className="border-b-none bg-white rounded-2xl border border-solid border-[#E1E4EA]"
      open={openTabs['account']}
      setOpen={() => {
        const isOpen = openTabs['account']

        const nextOpenState = {
          ...openTabs,
          ['account']: true,
        }

        if (isOpen) {
          delete nextOpenState['account']
        }

        setOpenTabs(nextOpenState)
      }}
    >
      <CollapsedSectionHeader title="Account" className="py-4 px-4" />
      <CollapsedSectionContent>
        <div className="px-4 pb-2">
          <LinkList noIndicator>
            <Link to="/account/email">Manage Email</Link>
            <Link to="/account/wallets">Manage Wallets</Link>
            <Link to="/account/username">Manage Username</Link>
            <Link to="/account/profile">Manage Profile</Link>
          </LinkList>
        </div>
      </CollapsedSectionContent>
    </CollapsedSection>
  )
}

export default function SettingsPage(props: any) {
  const router = useRouter()
  const accountContext = useAccountContext()
  const avatar = useAvatar()
  const [areYouSure, setAreYouSure] = useState(false)
  const [error, setError] = useState('')
  const [openTabs, setOpenTabs] = React.useState<any>(
    router.asPath.split('#')[1] ? { [router.asPath.split('#')[1]]: true } : {}
  )

  const deleteAccount = async () => {
    if (!accountContext.account?.id) {
      setError('Unable to delete account.')
      return
    }

    await accountContext.deleteAccount(accountContext.account?.id)
  }

  const toggleScheduleSharing = async () => {
    if (accountContext.account) {
      accountContext.toggleScheduleSharing(accountContext.account)
    }
  }

  const toggleNotifications = async () => {
    if (accountContext.account) {
      accountContext.toggleNotifications(accountContext.account)
    }
  }

  const disconnect = async () => {
    if (!accountContext.account?.id) {
      setError('Unable to sign out.')
      return
    }

    accountContext.logout(accountContext.account?.id)
    router.push('/login')
  }

  const sharingLink = `https://app.devcon.org/schedule/u/${
    accountContext.account?.username ?? accountContext.account?.id
  }/`

  const copyShareLink = () => {
    navigator.clipboard
      .writeText(sharingLink)
      .then(() => {
        toast({
          title: 'Schedule link copied.',
          duration: 3000,
        })
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
        toast({
          title: 'Failed to copy link',
          description: 'Please try again',
          duration: 3000,
        })
      })
  }

  return (
    <>
      <div data-type="settings-layout" className={cn('flex flex-row lg:gap-3 relative')}>
        <div className={cn('basis-[60%] grow')}>
          <div className="flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] lg:bg-[#fbfbfb] rounded-3xl relative">
            <Tabs />

            <div className="flex flex-col gap-3 pb-4 pt-4 px-4 text-sm">
              {error && (
                <div className={css['alert']}>
                  <Alert title="Error" color="orange">
                    {error}
                  </Alert>
                </div>
              )}

              <div className="flex">
                <LoggedInCard className="lg:self-start w-full pointer-events-none cursor-default">
                  <span
                    className="font-semibold text-[#1a1a1a] pointer-events-auto cursor-pointer pr-2"
                    role="button"
                    onClick={disconnect}
                  >
                    Sign out
                  </span>
                </LoggedInCard>
              </div>

              <CollapsedSection
                className="border-b-none bg-white rounded-2xl border border-solid border-[#E1E4EA]"
                open={openTabs['account']}
                setOpen={() => {
                  const isOpen = openTabs['account']

                  const nextOpenState = {
                    ...openTabs,
                    ['account']: true,
                  }

                  if (isOpen) {
                    delete nextOpenState['account']
                  }

                  setOpenTabs(nextOpenState)
                }}
              >
                <CollapsedSectionHeader title="Account" className="py-4 px-4" />
                <CollapsedSectionContent>
                  <div className="px-4 pb-2">
                    <LinkList noIndicator>
                      <Link to="/account/email">Manage Email</Link>
                      <Link to="/account/wallets">Manage Wallets</Link>
                      <Link to="/account/username">Manage Username</Link>
                      <Link to="/account/profile">Manage Profile</Link>
                    </LinkList>
                  </div>
                </CollapsedSectionContent>
              </CollapsedSection>

              {!props.onlyAccount && (
                <>
                  <CollapsedSection
                    className="border-b-none bg-white rounded-2xl border border-solid border-[#E1E4EA]"
                    open={openTabs['schedule']}
                    setOpen={() => {
                      const isOpen = openTabs['schedule']

                      const nextOpenState = {
                        ...openTabs,
                        ['schedule']: true,
                      }

                      if (isOpen) {
                        delete nextOpenState['schedule']
                      }

                      setOpenTabs(nextOpenState)
                    }}
                  >
                    <CollapsedSectionHeader title="Schedule" className="py-4 px-4" />
                    <CollapsedSectionContent>
                      <div className="px-4 pb-4">
                        <div className="mb-0">
                          <p className="font-bold">Personal schedule</p>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <p>Share your personal schedule with your colleagues and friends.</p>
                          <div className={css['toggle']}>
                            <Toggle
                              className={'custom'}
                              icons={false}
                              defaultChecked={accountContext.account?.publicSchedule}
                              onChange={toggleScheduleSharing}
                            />
                          </div>
                        </div>
                      </div>
                      {accountContext.account?.id && accountContext.account?.publicSchedule && (
                        <>
                          <div className="px-4 pb-2">
                            <div
                              className="flex flex-row w-full justify-between items-center py-2"
                              style={{
                                borderTop: '1px solid #E1E4EA',
                                borderBottom: '1px solid #E1E4EA',
                              }}
                            >
                              <Link to={`/schedule/u/${accountContext.account.username ?? accountContext.account.id}/`}>
                                {sharingLink}
                              </Link>
                              <span
                                className="cursor-pointer mr-2"
                                style={{ '--color-icon': '#999999' } as React.CSSProperties}
                                onClick={copyShareLink}
                              >
                                <CopyIcon style={{ width: '18px', height: '18px' }} />
                              </span>
                            </div>
                            <p className="text-xs py-2">
                              You can change your link by{' '}
                              <Link to="/account/username" className="underline text-[#7D52F4]">
                                updating your username
                              </Link>
                              .
                            </p>
                          </div>
                        </>
                      )}
                    </CollapsedSectionContent>
                  </CollapsedSection>

                  <CollapsedSection
                    className="border-b-none bg-white rounded-2xl border border-solid border-[#E1E4EA]"
                    open={openTabs['notifications']}
                    setOpen={() => {
                      const isOpen = openTabs['notifications']

                      const nextOpenState = {
                        ...openTabs,
                        ['notifications']: true,
                      }

                      if (isOpen) {
                        delete nextOpenState['notifications']
                      }

                      setOpenTabs(nextOpenState)
                    }}
                  >
                    <CollapsedSectionHeader title="Push Notifications" className="py-4 px-4" />
                    <CollapsedSectionContent>
                      <div className="px-4 pb-4">
                        <Notifications standalone />
                      </div>
                    </CollapsedSectionContent>
                  </CollapsedSection>

                  <CollapsedSection
                    className="border-b-none bg-white rounded-2xl border border-solid border-[#E1E4EA]"
                    open={openTabs['application']}
                    setOpen={() => {
                      const isOpen = openTabs['application']

                      const nextOpenState = {
                        ...openTabs,
                        ['application']: true,
                      }

                      if (isOpen) {
                        delete nextOpenState['application']
                      }

                      setOpenTabs(nextOpenState)
                    }}
                  >
                    <CollapsedSectionHeader title="Application" className="py-4 px-4" />
                    <CollapsedSectionContent>
                      <div className="px-4 pb-2">
                        <LinkList>
                          {/* <Link to="/info#faq">FAQ</Link> */}
                          <Link to={`mailto:${EMAIL_DEVCON}`}>Support</Link>
                        </LinkList>
                      </div>
                    </CollapsedSectionContent>
                  </CollapsedSection>

                  <CollapsedSection
                    className="border-b-none bg-white rounded-2xl border border-solid border-[#E1E4EA]"
                    open={openTabs['delete']}
                    setOpen={() => {
                      const isOpen = openTabs['delete']

                      const nextOpenState = {
                        ...openTabs,
                        ['delete']: true,
                      }

                      if (isOpen) {
                        delete nextOpenState['delete']
                      }

                      setOpenTabs(nextOpenState)
                    }}
                  >
                    <CollapsedSectionHeader title="Delete Account" className="py-4 px-4" />
                    <CollapsedSectionContent>
                      <div className="px-4 pb-2 flex flex-col items-start gap-4 pb-4">
                        <p>Once you delete your Devcon account, there is no going back. Tread lightly.</p>
                        {!areYouSure && (
                          <>
                            <Button className="plain" color="purple-2" fill onClick={() => setAreYouSure(true)}>
                              Delete Devcon account
                            </Button>
                          </>
                        )}

                        {areYouSure && (
                          <>
                            <Button className="plain" color="black-1" fill onClick={() => setAreYouSure(false)}>
                              No, keep my account
                            </Button>
                            &nbsp;
                            <Button className="plain" color="purple-2" fill onClick={deleteAccount}>
                              Yes, delete my account
                            </Button>
                          </>
                        )}
                      </div>
                    </CollapsedSectionContent>
                  </CollapsedSection>
                </>
              )}

              {props.children}

              <div>
                <p className="text-[#585858] mt-5 flex justify-center text-xs">
                  Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity
                  through our application if you choose to.
                </p>

                <div className="flex justify-center gap-4 mb-2 mt-1 text-xs text-[#7D52F4]">
                  <Link to="https://ethereum.org/en/privacy-policy">
                    <p className="underline">Privacy Policy</p>
                  </Link>
                  <Link to="https://ethereum.org/en/terms-of-use/">
                    <p className="underline">Terms of Use</p>
                  </Link>
                  <Link to="https://ethereum.org/en/cookie-policy/">
                    <p className="underline">Cookie Policy</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
