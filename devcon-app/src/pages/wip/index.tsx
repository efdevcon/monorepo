import { Home } from 'components/domain/app/home'
import { AppLayout } from 'components/domain/app/Layout'
import React from 'react'
import { SEO } from 'components/domain/seo'
import { useSessionData, useSpeakerData } from 'services/event-data'
import { DEFAULT_APP_PAGE } from 'utils/constants'
import Image from 'next/image'
import LoginBackdrop from './dc-7-images/login-backdrop.png'
import LoginLogo from './dc-7-images/login-logo.png'
import LoginIcons from './dc-7-images/login-icons.png'
import { Button } from 'lib/components/button'
import InfoIcon from 'assets/icons/info-icon.svg'
import InfoIcon2 from 'assets/icons/info-filled.svg'
import { Popover, PopoverTrigger, PopoverContent } from 'lib/components/ui/popover'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from 'lib/components/ui/input-otp'
import { Separator } from 'lib/components/ui/separator'
import { Spinner } from 'components/domain/app/dc7/spinner/spinner'
import DC7Logo from './dc-7-images/dc7-logo.png'
import cn from 'classnames'

const MobileLogin = () => {
  return (
    <div className="text-white flex justify-center items-end h-full max-w-[500px] self-center">
      <div className="mb-8 flex flex-col gap-2 px-8">
        <div>
          <Image
            src={LoginLogo}
            alt="Login Logo"
            className="w-[250px] max-w-[100%] invert"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
        <div className="text-2xl font-semibold">
          Your personalized experience to Devcon SEA — Ethereum Developer Conference.
        </div>
        <div>
          <Button fat fill className="w-full plain mt-2 bold text-lg" size="lg" color="purple-1">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  )
}

const Login = () => {
  return (
    <div className="flex flex-col justify-between lg:justify-center h-full w-[400px] xl:w-[470px] max-w-full lg:max-w-[50vw] relative text-sm">
      <Image src={LoginLogo} alt="Login Logo" className="w-[200px] max-w-[100%]" />

      <div>
        <Image src={LoginIcons} alt="Login Icons" className="w-[169px] max-w-[100%] my-8" />
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
                  believe. You take the Ethereum pill... you stay in Wonderland, and I show you how deep the rabbit hole
                  goes.
                </div>
              </PopoverContent>
            </Popover>
          </p>
          <p className="text-sm opacity-80">
            If this is the first time you&apos;re logging in, Devcon Passport will automatically create a new account on
            your behalf.
          </p>
        </div>

        <div className="mt-4">
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
            />
          </div>
          <Button fat fill className="w-full plain mt-4 border !border-[#E1E4EA] border-solid" color="grey-1">
            Continue With Email
          </Button>
        </div>

        <div className="flex flex-row w-full items-center gap-4 my-4">
          <Separator className="shrink" />
          <span className="shrink-0 font-semibold text-sm">OR</span>
          <Separator className="shrink" />
        </div>

        <div>
          <p className="font-semibold">Wallet — For Web 3 Experiences</p>
          <p className="text-sm opacity-80 mt-2">
            <Popover>
              <PopoverTrigger className="plain">
                <InfoIcon2 className="translate-y-[2px] text-[#8C72AE]" style={{ '--color-icon': '#8C72AE' }} />
              </PopoverTrigger>
              <PopoverContent>
                <div className="text-sm">Based and Ethereum-pilled</div>
              </PopoverContent>
            </Popover>{' '}
            To get the full utility out of the Devcon Passport it is recommended to connect your wallet.
          </p>
          <Button fat fill className="w-full plain mt-4" color="purple-1">
            Continue With Ethereum
          </Button>
        </div>
      </div>
      <div>
        {/* <InputOTP maxLength={8}>
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
        </InputOTP> */}
        <div>
          <p className="opacity-80 mt-12 text-xs">
            Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity
            through our application if you choose to.
          </p>

          <div className="flex flex-row gap-4 mt-2 text-xs text-[#8C72AE]">
            <p className="underline">Privacy Policy</p>
            <p className="underline">Terms of Use</p>
            <p className="underline">Cookie Policy</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const Index = (props: any) => {
  // const sessions = useSessionData()

  // const context = {
  //   navigation: props.navigationData,
  //   notification: props.notification,
  //   appNotifications: [],
  //   current: DEFAULT_APP_PAGE,
  // }

  return (
    <div>
      <SEO title="Passport Login" />
      <div className="flex flex-row lg:p-2 h-screen w-screen relative xl:justify-center xl:items-center">
        <div className="hidden lg:block shrink-0 lg:shrink relative  px-8">
          <Login />
        </div>
        <div className="lg:hidden absolute h-full w-full left-0 right-0 bottom-0 top-0 z-10">
          <MobileLogin />
        </div>
        <div className="w-1/2 shrink-0 grow xl:grow-0 relative xl:ml-16">
          <div className="relative w-full h-full lg:rounded-2xl overflow-hidden">
            <Image src={LoginBackdrop} alt="Login Backdrop" className="object-cover h-full w-full lg:rounded-2xl" />
            <Image
              src={DC7Logo}
              alt="Login Logo"
              className="w-[169px] max-w-[100%] absolute bottom-2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 hidden lg:block"
            />
            <div className="lg:hidden absolute bottom-0 left-0 right-0 h-full">
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#000000] to-transparent"
                // style={{
                //   clipPath: 'ellipse(100% 100% at 50% 100%)',
                // }}
              />
            </div>
          </div>

          <div className="w-[310px] h-[310px] absolute top-[44.5%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Spinner />
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
