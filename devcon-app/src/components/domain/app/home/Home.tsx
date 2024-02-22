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
import AppPhones from 'assets/images/app-phones.png'
import AppLogoColor from 'assets/images/app-logo-color.png'
import Image from 'next/image'

type PageIntroduction = {
  background: any
  title?: string
  backgroundAlt: string
  bodyLeftTitle: string
  bodyLeftText: string
  bodyRightRender?: any
  ctaText: string
  button: {
    text: string
    url: string
  }
}

export const PageIntroduction = (props: PageIntroduction) => {
  return (
    <div className={css['page-intro']}>
      <div className={css['background']}>
        <Image src={props.background} alt={props.backgroundAlt} />
      </div>

      {props.title && <div className="app-header clear-bottom-less">{props.title}</div>}

      <div className={css['body']}>
        <div className={css['left']}>
          <p className={css['subheader']}>{props.bodyLeftTitle}</p>
          <p className={css['subtext']}>{props.bodyLeftText}</p>
        </div>
        {props.bodyRightRender && <div className={css['right']}>{props.bodyRightRender()}</div>}
      </div>

      <div className={css['cta']}>
        <p className={css['left']}>{props.ctaText}</p>
        <Link
          to={props.button.url}
          style={{ marginLeft: '8px', flexShrink: '0' }}
          className="button red sm text-uppercase"
        >
          {props.button.text} →
        </Link>
      </div>
    </div>
  )
}

export const Home = (props: any) => {
  const router = useRouter()
  const maxWidthTruncate = useMediaQuery(640) // breakpoint-sm
  const accountContext = useAccountContext()
  const activeAddress = useActiveAddress()
  const avatar = useAvatar()
  const loggedIn = !!accountContext.account

  console.log(loggedIn, 'logged in')

  const accountContextOptions = [
    {
      text: 'Settings',
      value: 'Settings',
      onClick: () => {
        router.push('/settings')
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
        router.push('/login')
      },
    })
  }

  return (
    <>
      <AppNav
        links={[
          {
            title: 'Home',
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
              <button className="label error plain" onClick={() => router.push('/settings')}>
                SETTINGS
              </button>
              <button className="label error plain" onClick={() => router.push('/settings/wallets')}>
                MANAGE WALLETS
              </button>
              <button className="label error plain" onClick={() => router.push('/settings/email')}>
                MANAGE EMAILS
              </button>
              <button className="label error plain" onClick={() => router.push('/settings/username')}>
                MANAGE USERNAME
              </button>
              <button className="label error plain" onClick={() => router.push('/settings#delete')}>
                DELETE ACCOUNT
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
          <>
            <PageIntroduction
              title="Welcome to the Devcon Passport"
              bodyLeftTitle="Mobile First PWA"
              bodyLeftText="Devcon Passport App is designed to be utilized on a mobile device for best user experience, please install as a PWA on your device for best performance."
              bodyRightRender={() => {
                return (
                  <div className={css['app-phones']}>
                    <Image src={AppPhones} className="max-w-[110px] object-right" alt="Phones showing app preview" />
                  </div>
                )
              }}
              backgroundAlt="Devcon passport logo"
              background={AppLogoColor}
              ctaText="Log in to personalize your schedule, track your favorite speakers, share schedule, and more."
              button={{
                text: 'Login',
                url: '/login',
              }}
            />
          </>
        )}
      </div>

      <Dashboard {...props} />
    </>
  )
}
