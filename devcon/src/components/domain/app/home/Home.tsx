import React from 'react'
import { SliderStickyNotes } from 'components/common/slider/SliderVariations'
import { Link } from 'components/common/link'
import { DropdownVariationDots } from 'components/common/dropdown/Dropdown'
import { useRouter } from 'next/router'
import css from './home.module.scss'
import { useAccountContext } from 'context/account-context'
import { useActiveAddress } from 'hooks/useActiveAddress'
import { useAvatar } from 'hooks/useAvatar'
import { AppNav } from 'components/domain/app/navigation'
import { useMediaQuery } from 'hooks/useMediaQuery'
import { TruncateMiddle } from 'utils/formatting'
import { Dashboard } from 'components/domain/app/dashboard'

export const Home = (props: any) => {
  const router = useRouter()
  const maxWidthTruncate = useMediaQuery(640) // breakpoint-sm
  const accountContext = useAccountContext()
  const activeAddress = useActiveAddress()
  const avatar = useAvatar()
  const loggedIn = !!accountContext.account
  const accountContextOptions = [
    {
      text: 'Settings',
      value: 'Settings',
      onClick: () => {
        router.push('/app/settings')
      },
    },
  ]

  if (loggedIn && accountContext.account?.addresses[0]) {
    accountContextOptions.push({
      text: 'View on Etherscan',
      value: 'Etherscan',
      onClick: () => {
        const url = 'https://etherscan.io/address/' + accountContext.account?.addresses[0]
        if (window) window.open(url, '_ blank')
        else router.push(url)
      },
    })
  }

  if (loggedIn) {
    accountContextOptions.push({
      text: 'Sign out',
      value: 'Signout',
      onClick: () => {
        accountContext.logout(accountContext.account?._id)
        router.push('/app/login')
      },
    })
  }

  return (
    <>
      <AppNav
        links={[
          {
            title: 'Home',
            to: '/app',
          },
        ]}
      />
      <div className="section no-overflow">
        {loggedIn && (
          <div className={`${css['account']} border-bottom`}>
            <div className="font-xxl font-primary">
              <h2 className="font-primary">
                Welcome
                {accountContext.account?.username && (
                  <>
                    ,<br />
                    {accountContext.account?.username}
                  </>
                )}
                {!accountContext.account?.username && <> 👋</>}
              </h2>
            </div>
            <div className={css['profile-actions']}>
              <button className="label error plain" onClick={() => router.push('/app/settings')}>
                SETTINGS
              </button>
              <button className="label error plain" onClick={() => router.push('/app/settings/wallets')}>
                MANAGE WALLETS
              </button>
              <button className="label error plain" onClick={() => router.push('/app/settings/email')}>
                MANAGE EMAILS
              </button>
              <button className="label error plain" onClick={() => router.push('/app/settings/username')}>
                MANAGE USERNAME
              </button>
            </div>

            <div className={css['dropdown']}>
              <DropdownVariationDots value="AccountContext" onChange={() => {}} options={accountContextOptions} />
            </div>
          </div>
        )}

        {loggedIn && !!activeAddress && (
          <div className={css['connection-info']}>
            <div className={css['wallet']}>
              <div className={css['circle']}>
                <img src={avatar.url} alt={avatar.name} />
              </div>

              <div className={css['details']}>
                {avatar.connection && <p className={css['network']}>{avatar.connection}</p>}
                {avatar.name && (
                  <p className={css['wallet-address']}>
                    {maxWidthTruncate && TruncateMiddle(avatar.name, 8)}
                    {!maxWidthTruncate && avatar.name}
                  </p>
                )}
                {avatar.status && (
                  <p className={`${css['connection']} ${css[avatar.status.toLowerCase()]}`}>{avatar.status}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {!loggedIn && (
          <div className={css['slider-container']}>
            <p className={`${css['header']} font-lg bold`}>
              <span>
                Welcome to the Devcon app!
                <br />
                <span className="font-xs">
                  Log in to personalize your schedule, track your favorite speakers, and more.
                </span>
              </span>
              <button style={{ marginLeft: '8px' }} className="red sm" onClick={() => router.push('/app/login')}>
                LOGIN
              </button>
            </p>

            {/* <SliderStickyNotes
            cards={[
              {
                title: 'Schedule',
                description: 'View & manage your devcon schedule.',
                url: '/app/schedule',
                color: 'pink',
              },
              {
                title: 'Guides',
                description: 'Access Devcon Bogota local guides.',
                url: '/bogota',
                color: 'yellow',
              },
              {
                title: 'Venue Map',
                description: 'Find your way around the Conference.',
                url: '/app/venue',
                color: 'green',
              },
              {
                title: 'Speakers',
                description: 'View speakers presenting at Devcon.',
                url: '/app/speakers',
                color: 'blue',
              },
            ]}
          /> */}
          </div>
        )}
      </div>

      <Dashboard {...props} />
    </>
  )
}
