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
import cn from 'classnames'

const Login = () => {
  return (
    <div className="flex flex-col justify-between lg:justify-center h-full w-[470px] lg:max-w-[50vw] mr-4">
      <Image src={LoginLogo} alt="Login Logo" className="w-[169px] max-w-[100%]" />

      <div>
        <Image src={LoginIcons} alt="Login Icons" className="w-[169px] max-w-[100%]" />
        <p>
          Choose your trust model. <InfoIcon />
        </p>
        <p>
          If this is the first time you&apos;re logging in, Devcon Passport will automatically create a new account on
          your behalf.
        </p>

        <div>
          <p>Email — Not interested in Web 3 Connection*</p>
          <Button fat className="w-full plain" color="black-1">
            Continue With Email
          </Button>
        </div>

        <div>
          <p>Wallet — For Web 3 Experiences</p>
          <p>
            <InfoIcon2 /> To get the full utility out of the Devcon Passport it is recommended to connect your wallet.
          </p>
          <Button fat fill className="w-full plain" color="black-1">
            Continue With Ethereum
          </Button>
        </div>
      </div>
      <div>
        <p>
          Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity through
          our application if you choose to.
        </p>

        <div className="flex flex-row gap-2">
          <p>Privacy Policy</p>
          <p>Terms of Use</p>
          <p>Cookie Policy</p>
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
    // <AppLayout>
    <div>
      <SEO title="Passport Login" />
      <div className="flex flex-row lg:p-2 h-screen w-screen relative justify-center items-center">
        <div className="shrink-0 absolute h-full lg:relative left-0 right-0 bottom-0 top-0">
          <Login />
        </div>
        <div className="w-1/2 shrink-0 relative">
          <Image src={LoginBackdrop} alt="Login Backdrop" className="object-cover h-full w-full lg:rounded-2xl" />
          {/* <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">hello</div> */}
        </div>
      </div>
    </div>
    /* </AppLayout> */
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
