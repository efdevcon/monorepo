import React, { useEffect, useState } from 'react'
import IconSwirl from 'assets/icons/swirl.svg'
import css from './login.module.scss'
import pwaIcon from './pwa-icon.png'
import footerRoad from './footer-road.png'
import { Link } from 'components/common/link'
import { InputForm } from 'components/common/input-form'
import { Button } from 'components/common/button'
import IconHelp from 'assets/icons/icon-help.svg'
import { Tooltip } from 'components/common/tooltip'
import { isEmail } from 'utils/validators'
import { useAccountContext } from 'context/account-context'
import { Alert } from 'components/common/alert'
import { getSiweMessage } from 'utils/web3'
import AccountFooter from './AccountFooter'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { AppNav } from 'components/domain/app/navigation'
// import { InfoIcon } from 'components/common/info-icon'
// import Info from 'pages/info'

export default function LoginPage() {
  const router = useRouter()
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const accountContext = useAccountContext()
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [nonce, setNonce] = useState('')
  const loggedIn = !!accountContext.account

  useEffect(() => {
    if (loggedIn) {
      router.push('/' + location?.search)
    }
  }, [router, loggedIn])

  useEffect(() => {
    async function LoginWithToken() {
      const userAccount = await accountContext.loginToken(Number(router.query.token))
      if (userAccount) {
        router.push({ pathname: '/', query: {} })
      }
      if (!userAccount) {
        setError('Unable to verify your email address.')
      }
    }

    if (router.query.token) LoginWithToken()
  }, [router.query.token])

  if (loggedIn) {
    return null
  }

  const connectWeb3AndLogin = async () => {
    const provider = await accountContext.connectWeb3()
    if (!provider) {
      setError('Unable to connect to Web3 provider')
      return
    }

    const signer = provider.getSigner()
    const address = await signer.getAddress()
    const token = await accountContext.getToken(address.toLowerCase(), false)
    if (!token) {
      setError('Unable to create verification token')
      return
    }

    const message = getSiweMessage(address, token)
    setError('Sign the message in your wallet to prove you have access.')
    const signedMessage = await accountContext.signMessage(message, provider)
    if (!signedMessage) {
      setError('Unable to sign message')
      return
    }

    const userAccount = await accountContext.loginWeb3(
      signedMessage.address.toLowerCase(),
      token.nonce,
      signedMessage.message,
      signedMessage.signature
    )
    if (userAccount) {
      router.push('/')
    }
    if (!userAccount) {
      setError('Unable to login with web3')
    }
  }

  const connectEmail = async () => {
    if (!isEmail(email)) {
      setError('Please provide a valid email address.')
      return
    } else {
      setError('')
    }

    setEmailSent(true)
    const token = await accountContext.getToken(email, false)
    if (!token) {
      setEmailSent(false)
      setError('Unable to create verification token')
    }
  }

  const verifyEmail = async () => {
    const nonceNr = Number(nonce)
    if (isNaN(nonceNr)) {
      setError('Please provide a valid verification code.')
      return
    }

    const userAccount = await accountContext.loginEmail(email, nonceNr)
    if (userAccount) {
      router.push('/')
    }
    if (!userAccount) {
      setError('Unable to verify your email address.')
    }
  }

  const resendVerificationEmail = async () => {
    const token = await accountContext.getToken(email, false)
    if (token) {
      setEmailSent(true)
    } else {
      setEmailSent(false)
      setError('Unable to create verification token')
    }
  }

  return (
    <>
      <AppNav
        links={[
          {
            title: 'Login',
          },
        ]}
      />
      <div className={css['container']}>
        <div>
          <div className={css['hero']}>
            <div className="section">
              <div className="content">
                {/* Need this layer to have something to position the image relatively to (within the bounds of the parent content div) */}
                <div className={css['hero-content']}>
                  <p className={css['devcon']}>Devcon</p>
                  <p className={css['connect']}>Passport —</p>
                  <p className={css['description']}>Your personalized passport to the Devcon experience.</p>

                  <Image className={css['logo']} src={pwaIcon} alt="App logo" />
                </div>
              </div>
            </div>
          </div>
          <div className="section">
            <div className="content">
              <div className={css['info']}>
                <div className={css['left']}>
                  <IconSwirl className={`${css['swirl-icon']} icon`} />
                </div>
                <p>
                  If this is the first time you&apos;re logging in, <b>Passport</b> will automatically create a new
                  account on your behalf.
                </p>
              </div>

              <div className={css['alert']}>{error && <Alert type="info" title="Info" message={error} />}</div>

              {emailSent && (
                <div className={css['email']}>
                  <p className="bold">Email — Confirm your email address</p>
                  <p>We&apos;ve sent a verification code to your email address. Please enter this code on below.</p>
                  <InputForm
                    className={css['input']}
                    placeholder="Verification code"
                    defaultValue={nonce}
                    onChange={value => setNonce(value)}
                    onSubmit={verifyEmail}
                  />
                  <div className={css['actions']}>
                    <Button className={`black`} onClick={verifyEmail}>
                      Verify your email
                    </Button>
                    <span className={css['resend']} role="button" onClick={resendVerificationEmail}>
                      Re-send verification code
                    </span>
                  </div>
                </div>
              )}

              {!emailSent && (
                <>
                  <div className={css['trust-model']}>
                    <p>Choose your Trust model</p>
                    {/* 
                    <InfoIcon className={`icon ${css['icon-help']}`}>
                      <div>Hey</div>
                    </InfoIcon> */}
                  </div>

                  <div className={css['email']}>
                    <p className="bold">Email — Not interested in Web 3 usage</p>
                    <InputForm
                      className={css['input']}
                      placeholder="Email"
                      defaultValue={email}
                      onChange={value => setEmail(value)}
                      onSubmit={connectEmail}
                    />
                    <Button className={`black`} onClick={connectEmail}>
                      Connect with Email
                    </Button>
                  </div>

                  <div className={css['wallet']}>
                    <p className="bold">Wallet — For Experienced Web 3 Users</p>
                    <Button className={`red ${css['button']}`} onClick={connectWeb3AndLogin}>
                      Sign-in with Ethereum
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <AccountFooter />
      </div>
    </>
  )
}
