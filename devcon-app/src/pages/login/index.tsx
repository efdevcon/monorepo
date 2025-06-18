import React, { useState } from 'react'
import Image from 'next/image'
import LoginBackdrop from './dc-7-images/login-backdrop-2.png'
import LoginLogo from './dc-7-images/login-logo.png'
import LoginIcons from './dc-7-images/login-icons.png'
import { Button } from 'lib/components/button'
import InfoIcon from 'assets/icons/info-icon.svg'
import { Popover, PopoverTrigger, PopoverContent } from 'lib/components/ui/popover'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from 'lib/components/ui/input-otp'
import { Separator } from 'lib/components/ui/separator'
import { Spinner } from 'components/domain/app/dc7/spinner/spinner'
import DC7Logo from './dc-7-images/dc7-logo.png'
import cn from 'classnames'
import css from './index.module.scss'
import { CircleIcon } from 'lib/components/circle-icon'
import IconCross from 'assets/icons/cross.svg'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { WalletLoginButton } from 'components/domain/app/account/wallet'
import { useAccountContext } from 'context/account-context'
import { useRouter } from 'next/router'
import { isEmail } from 'utils/validators'
import { Link } from 'components/common/link'
import Alert from 'lib/components/alert'
import { SEO } from 'components/domain/seo'

const MobileLogin = (props: any) => {
  const accountContext = useAccountContext()
  const router = useRouter()
  const loggedIn = !!accountContext.account
  const [loginOpen, setLoginOpen] = React.useState(false)

  useEffect(() => {
    if (loggedIn && accountContext.account?.onboarded) {
      router.push('/')
    }
    if (loggedIn && !accountContext.account?.onboarded) {
      router.push('/onboarding')
    }
  }, [router, loggedIn])

  if (loggedIn) {
    return null
  }

  return (
    <div className="flex flex-col justify-between h-full w-full" onClick={() => setLoginOpen(false)}>
      <AnimatePresence>
        {!loginOpen && (
          <motion.div
            key="mobile-login"
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%', transition: { type: 'spring', duration: 0.8, bounce: 0 } }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.2 }}
            className="text-white flex justify-center items-end h-full max-w-[600px] self-center"
          >
            <div className="mb-8 flex flex-col gap-4 px-8">
              <div>
                <Image
                  src={LoginLogo}
                  alt="Login Logo"
                  className="w-[250px] max-w-[100%] invert"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <div className="text-2xl font-secondary text-[#FFFFFF90]">
                Your personalized experience to Devcon SEA — Ethereum Developer Conference.
              </div>
              <div>
                <Button
                  fat
                  fill
                  className="w-full plain mt-2 bold text-lg"
                  size="lg"
                  color="white-1"
                  onClick={(e: any) => {
                    e.stopPropagation()
                    setLoginOpen(true)
                  }}
                >
                  Get Started
                </Button>

                <p className="text-sm mt-4 py-2 text-underline text-center cursor-pointer" onClick={props.skipLogin}>
                  Skip to Dashboard
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loginOpen && (
          <motion.div
            key="mobile-login-content"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { duration: 0.3, type: 'tween', bounce: 0 } }}
            transition={{
              duration: 0.8,
              type: 'spring',
              bounce: 0.35,
            }}
            onClick={(e: any) => e.stopPropagation()}
            className="absolute bottom-0 mx-8 bg-white max-w-[500px] min-w-[300px] self-center rounded-2xl p-4 px-4 z-20 mb-8"
          >
            <TrustModels mobile setLoginOpen={setLoginOpen} skipLogin={props.skipLogin} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const TrustModels = (props: any) => {
  const accountContext = useAccountContext()
  const router = useRouter()
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [nonce, setNonce] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    async function LoginWithToken() {
      const userAccount = await accountContext.loginToken(Number(router.query.token))
      if (userAccount && userAccount.onboarded) {
        router.push('/')
      }
      if (userAccount && !userAccount.onboarded) {
        router.push('/onboarding')
      }
      if (!userAccount) {
        setError('Unable to verify your email address.')
      }
    }

    if (router.query.token) LoginWithToken()
  }, [router.query.token])

  const connectEmail = async () => {
    if (loading) return

    try {
      setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  const verifyEmail = async () => {
    if (loading) return
    setLoading(true)

    const nonceNr = Number(nonce)
    if (isNaN(nonceNr)) {
      setError('Please provide a valid verification code.')
      return
    }
    if (nonce.length !== 8) {
      setError('Please provide a valid verification code.')
      return
    }

    try {
      const userAccount = await accountContext.loginEmail(email, nonceNr)
      if (userAccount && userAccount.onboarded) {
        router.push('/')
      }
      if (userAccount && !userAccount.onboarded) {
        router.push('/onboarding')
      }
      if (!userAccount) {
        setError('Unable to verify your email address.')
      }
    } catch (e) {
      setError('Unable to verify your email address.')
    } finally {
      setLoading(false)
    }
  }

  const resendVerificationEmail = async () => {
    if (resendCooldown > 0) return

    try {
      setResendCooldown(30)
      const token = await accountContext.getToken(email, false)
      if (token) {
        setEmailSent(true)
      } else {
        setEmailSent(false)
        setError('Unable to create verification token')
      }
    } finally {
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  return (
    <div>
      <div className="flex flex-row justify-between">
        <Image
          src={LoginIcons}
          alt="Login Icons"
          className="w-[100px] lg:w-[169px] max-w-[100%] mb-4 lg:my-8 lg:block"
        />
        {props.mobile && (
          <CircleIcon className="mt-1 mx-1" onClick={() => props.setLoginOpen(false)}>
            <IconCross />
          </CircleIcon>
        )}
      </div>

      {!emailSent && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-xl flex items-center gap-3">
              Choose your trust model.{' '}
              <Popover>
                <PopoverTrigger className="plain">
                  <InfoIcon className="-translate-y-[0px]" />
                </PopoverTrigger>
                <PopoverContent>
                  <div className="text-sm">
                    You take the email pill... the story ends, you wake up in your bed and believe whatever you want to
                    believe. You take the Ethereum pill... you stay in the infinite garden, and I show you how deep the
                    rabbit hole goes.
                  </div>
                </PopoverContent>
              </Popover>
            </p>
            {error && (
              <p>
                <Alert title="">{error}</Alert>
              </p>
            )}
            <p className="text-sm text-[#939393]">
              If this is the first time you&apos;re logging in, Devcon Passport will automatically create a new account
              on your behalf.
            </p>
          </div>

          <div className="mt-6">
            <p className="font-semibold">Email — Not interested in Web 3 Connection*</p>
            <div className="relative border border-[#E1E4EA] border-solid rounded-xl mt-2 overflow-hidden">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  ></path>
                </svg>
              </div>
              <input
                type="email"
                className="w-full pl-10 pr-3 py-2 border-none focus:outline-none focus:ring-0"
                placeholder="roadto@devcon.org"
                defaultValue={email}
                onChange={e => setEmail(e.target.value)}
                onSubmit={connectEmail}
              />
            </div>
            <Button
              fat
              fill
              disabled={loading}
              className="w-full plain mt-4 border !border-[#E1E4EA] border-solid"
              color="grey-1"
              onClick={connectEmail}
            >
              {loading ? 'Sending Email...' : 'Continue With Email'}
            </Button>
          </div>

          <div className="flex flex-row w-full items-center gap-4 my-4">
            <Separator className="shrink" />
            <span className="shrink-0 text-xs text-[#939393]">OR</span>
            <Separator className="shrink" />
          </div>

          <div>
            <p className="font-semibold">Wallet — For Web 3 Experiences</p>
            <p className="text-sm text-[#939393] mt-2">
              {/* <Popover>
                <PopoverTrigger className="plain">
                  <InfoIcon2 className="translate-y-[2px] text-[#8C72AE]" style={{ '--color-icon': '#8C72AE' }} />
                </PopoverTrigger>
                <PopoverContent>
                  <div className="text-sm"></div>
                </PopoverContent>
              </Popover>{' '} */}
              To get the full utility out of the Devcon Passport it is recommended to connect your wallet.
            </p>
            <WalletLoginButton onError={setError} />
          </div>

          <p
            className="text-sm mt-4  text-underline text-center cursor-pointer font-semibold"
            onClick={props.skipLogin}
          >
            Skip to Dashboard
          </p>
        </>
      )}

      {emailSent && (
        <div>
          <div className="text-xl">Enter Verification Code.</div>
          {error && (
            <p>
              <Alert title="">{error}</Alert>
            </p>
          )}
          <div className="text-sm text-[#939393] my-2 mb-4">
            We&apos;ve sent a verification code to your email address.
          </div>
          <InputOTP maxLength={8} value={nonce} onChange={value => setNonce(value)} onSubmit={verifyEmail}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
              <InputOTPSlot index={6} />
              <InputOTPSlot index={7} />
            </InputOTPGroup>
          </InputOTP>
          <Button fat fill disabled={loading} className="w-full plain mt-4" color="purple-2" onClick={verifyEmail}>
            {loading ? 'Verifying Email...' : 'Verify Your Email'}
          </Button>
          <Separator className="mt-6 mb-4" />
          <div className="flex flex-row justify-between items-center">
            <div
              className={`text-sm ${
                resendCooldown > 0 ? 'text-gray-400' : 'text-underline cursor-pointer font-semibold'
              }`}
              onClick={resendVerificationEmail}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Code'}
            </div>
            <div className="text-xs cursor-pointer">Help?</div>
          </div>
        </div>
      )}

      <div>
        <p className="text-[#939393] mt-4 lg:mt-12 text-xs">
          Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity through
          our application if you choose to.
        </p>

        <div className="flex flex-row gap-4 mt-2 text-xs text-[#7D52F4]">
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
  )
}

const Login = (props: any) => {
  return (
    <div className="flex flex-col justify-between lg:justify-center h-full w-[400px] 2xl:w-[470px] max-w-full lg:max-w-[50vw] relative text-sm">
      <Image src={LoginLogo} alt="Login Logo" className="w-[200px] max-w-[100%]" />

      <TrustModels {...props} />
    </div>
  )
}

const Index = (props: any) => {
  const router = useRouter()
  // Safari/iOS is just terrible...
  useEffect(() => {
    const setVhAndBackground = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.backgroundColor = 'black'
    }

    setVhAndBackground()
    window.addEventListener('resize', setVhAndBackground)

    return () => {
      window.removeEventListener('resize', setVhAndBackground)
      document.documentElement.style.removeProperty('background-color')
    }
  }, [])

  // Only redirect to login the first time the user visits the site
  useEffect(() => {
    localStorage.setItem('skipLogin', 'true')
  }, [])

  const skipLogin = () => {
    localStorage.setItem('skipLogin', 'true')

    router.push('/')
  }

  return (
    <div className="text-base bg-white">
      <SEO title="Passport Login" />
      <div
        className={cn(
          'flex flex-row lg:p-2 w-full 2xl:justify-center 2xl:items-center fixed inset-0 overflow-hidden',
          css['login-container']
        )}
      >
        <div className="hidden lg:block shrink-0 lg:shrink relative px-16">
          <Login skipLogin={skipLogin} />
        </div>
        <div className="lg:hidden absolute h-full w-full left-0 right-0 bottom-0 top-0 z-10 flex justify-center items-center">
          <MobileLogin skipLogin={skipLogin} />
        </div>
        <div className="w-1/2 shrink-0 grow 2xl:grow-0 2xl:max-w-[800px] relative 2xl:ml-16 flex justify-center">
          <div className="relative w-full h-full lg:h-full z-[1] bg-[#3D00BF] lg:rounded-2xl">
            <div className="relative w-full h-full lg:rounded-2xl overflow-hidden z-10">
              <Image
                src={LoginBackdrop}
                alt="Login Backdrop"
                className={cn(
                  'object-cover h-full w-full lg:rounded-2xl -translate-y-[16vh] lg:translate-y-0',
                  css['mask-image-fade-bottom']
                )}
                quality={100}
                priority
              />
              <Image
                src={DC7Logo}
                alt="Login Logo"
                className="w-[169px] max-w-[100%] absolute bottom-2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden lg:block"
              />
            </div>

            <div className="w-[250px] h-[250px] md:w-[310px] md:h-[310px] absolute top-[45.5%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <Spinner className="-translate-y-[15vh] lg:translate-y-0" />
            </div>

            <div className="lg:hidden absolute bottom-0 left-0 right-0 h-[40vh] overflow-hidden">
              {/* <div className="absolute inset-0 bg-gradient-to-t from-[#3D00BF] to-transparent" /> */}

              <div className={`absolute ${css['bg-radial-gradient']}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Index

// export async function getStaticProps(context: any) {
//   return {
//     props: {
//       // ...(await getGlobalData(context.locale, true)),
//       page: DEFAULT_APP_PAGE,
//       // sessions: await GetSessions(),
//       // speakers: await GetSpeakers(),
//     },
//   }
// }
