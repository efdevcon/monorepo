import React from 'react'
import css from './footer.module.scss'
import IconArrowUpward from 'assets/icons/arrow_upward.svg'
import ImageEF from 'assets/images/ef-logo.svg'
import { Link } from 'components/common/link'
import { Link as LinkType } from 'types/Link'
import { Newsletter } from 'components/common/newsletter'
import { usePageContext } from 'context/page-context'
import { EMAIL_DEVCON, LINK_ETHEREUM_FOUNDATION } from 'utils/constants'
import HeaderLogoArchive from '../header/HeaderLogo'
import { Copyright } from '../Copyright'
import { useRouter } from 'next/router'
import { useTranslations } from 'next-intl'
import useNavigationData from 'components/common/layouts/header/useNavigationData'
import IconGithub from 'assets/icons/github.svg'
import IconTwitter from 'assets/icons/twitter.svg'
import IconYoutube from 'assets/icons/youtube.svg'
import IconTelegram from 'assets/icons/telegram.svg'
import IconWarpcast from 'assets/icons/farcaster.svg'
import IconDiscord from 'assets/icons/discord.svg'
import { CodeOfConduct, TermsOfService } from './Legal'
import { Modal } from 'components/common/modal'
import LogoFlowers from 'assets/images/dc-7/logo-flowers.png'
import DC7Background from 'assets/images/dc-7/footer-bg.png'
import { Button } from 'lib/components/button'
import Image from 'next/image'

type SocialMediaProps = {
  onShare?: () => void
  url?: string
  className?: string
}

const ModalLink = (props: { children: any; title: string }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Modal className={css['modal-overrides']} unstyled open={open} close={() => setOpen(false)}>
        {props.children}
      </Modal>
      <a
        className="bold font-xs text-uppercase hover-underline"
        style={{ cursor: 'pointer' }}
        target="_blank"
        onClick={() => setOpen(true)}
      >
        {props.title}
      </a>
    </>
  )
}

export const SocialMedia = ({ onShare, url, className: extraClassName }: SocialMediaProps) => {
  let className = `${css['social-media']} text-xl`

  if (extraClassName) className += ` ${extraClassName}`

  return (
    <div className={className}>
      <Link to="https://twitter.com/efdevcon">
        <IconTwitter style={{ cursor: 'pointer' }} />
      </Link>
      <Link to="https://warpcast.com/~/channel/devcon">
        <IconWarpcast style={{ cursor: 'pointer' }} />
      </Link>
      <Link to="https://t.me/devcon_SEA">
        <IconTelegram style={{ cursor: 'pointer' }} />
      </Link>
      <Link to="https://github.com/efdevcon">
        <IconGithub style={{ cursor: 'pointer' }} />
      </Link>
      <Link to="https://www.youtube.com/c/EthereumFoundation/search?query=devcon">
        <IconYoutube style={{ cursor: 'pointer' }} />
      </Link>
      {/* <Share url={url} onShare={onShare} /> */}
    </div>
  )
}

const TopSection = () => {
  const intl = useTranslations()
  const router = useRouter()
  const lang = router.locale
  const navigationData = useNavigationData()
  let footerData = navigationData.footer

  return (
    <div className={css['top-section']}>
      <div className="section relative">
        <div className="hidden lg:flex absolute right-0 top-0 h-full w-full overflow-hidden">
          <Image
            src={DC7Background}
            alt="Devcon 7 logo faded in background"
            className="object-contain object-right h-full w-full opacity-70"
          />
        </div>

        <div className={css['content']}>
          <div className={css['col-1']}>
            <Link to={`/${lang}/`} style={{ maxWidth: '225px', minWidth: '130px', display: 'block' }}>
              {/* <HeaderLogoArchive /> */}
              <Image
                src={LogoFlowers}
                alt="Devcon 7 Logo"
                className="w-[85%] max-w-[350px] lg:w-auto lg:max-w-[400px]"
              />
            </Link>

            <SocialMedia />
          </div>

          <div className={css['col-2']}>
            <div>
              <p className="semi-bold !mb-2">{intl('footer_about_devcon_1')}</p>
              <p>{intl('footer_about_devcon_2')}</p>
              <p>{intl('footer_about_devcon_3')}</p>
            </div>
          </div>

          <div className={`${css['col-3']} flex gap-12 xl:gap-8 2xl:gap-20`}>
            <ul className={css['list']}>
              <li className="semi-bold">Devcon</li>
              {footerData?.left.map((link: LinkType, index: number) => {
                return (
                  <li className="" key={index}>
                    <Link to={link.url} className="plain hover-underline" indicateExternal>
                      {link.title}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <ul className={css['list']}>
              <li className="semi-bold">Community</li>
              {footerData?.right.map((link: LinkType, index: number) => {
                return (
                  <li className="" key={index}>
                    <Link to={link.url} className="plain hover-underline" indicateExternal>
                      {link.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className={css['col-4']}>
            <div className={css['contact']}>
              <p className="semi-bold">{intl('getintouch')}</p>
              <p className={css['email-1']}>{EMAIL_DEVCON}</p>

              <div className={css['newsletter']}>
                <Newsletter id="footer_newsletter_email" />
              </div>
            </div>
          </div>

          <div className={css['col-5']}>
            <div className={`${css['scroll-up']} shrink-0 hidden xl:flex`}>
              <Button
                size="sm"
                className="border-2"
                circle
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <IconArrowUpward style={{ cursor: 'pointer' }} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Non-grid version, not sure if worth keeping, but just leaving it here for now
// const TopSectionNew = () => {
//   const intl = useTranslations()
//   const router = useRouter()
//   const lang = router.locale
//   const navigationData = useNavigationData()
//   let footerData = navigationData.footer

//   return (
//     <div className={css['top-section']}>
//       <div className="section relative text-sm">
//         <div className="hidden xl:flex absolute right-0 top-0 h-full w-full overflow-hidden pointer-events-none">
//           <Image
//             src={DC7Background}
//             alt="Devcon 7 logo faded in background"
//             className="object-contain object-right h-full w-full opacity-70"
//           />
//         </div>

//         <div className={`flex gap-8 xl:gap-16 ${css['items']} py-8 flex-col xl:flex-row`}>
//           <div className="flex gap-16 xl:contents justify-between">
//             <div className="flex flex-col shrink-0 w-[225px] relative">
//               <Link to={`/${lang}/`} style={{ maxWidth: '100%', minWidth: '130px', display: 'block' }}>
//                 {/* <HeaderLogoArchive /> */}
//                 <Image src={LogoFlowers} alt="Devcon 7 Logo" className="w-[85%] max-w-full lg:w-auto" />
//               </Link>

//               <SocialMedia />
//             </div>

//             <div className="shrink xl:basis-1/4">
//               <p className="semi-bold mb-2">{intl('footer_about_devcon_1')}</p>
//               <p className="mb-4">{intl('footer_about_devcon_2')}</p>
//               <p>{intl('footer_about_devcon_3')}</p>
//             </div>
//           </div>

//           <div className="flex xl:contents justify-between">
//             <div className="flex xl:justify-center gap-16 shrink-0 grow">
//               <ul className={css['list']}>
//                 <li className="semi-bold">Devcon</li>
//                 {footerData?.left.map((link: LinkType, index: number) => {
//                   return (
//                     <li className="" key={index}>
//                       <Link to={link.url} className="plain hover-underline" indicateExternal>
//                         {link.title}
//                       </Link>
//                     </li>
//                   )
//                 })}
//               </ul>

//               <ul className={css['list']}>
//                 <li className="semi-bold">Community</li>
//                 {footerData?.right.map((link: LinkType, index: number) => {
//                   return (
//                     <li className="" key={index}>
//                       <Link to={link.url} className="plain hover-underline" indicateExternal>
//                         {link.title}
//                       </Link>
//                     </li>
//                   )
//                 })}

//                 {/* <li className="semi-bold mt-2">Contribute</li> */}
//                 {/* {footerData?.rightBottom.map((link: LinkType, index: number) => {
//                 return (
//                   <li className="" key={index}>
//                     <Link to={link.url} className="plain hover-underline" indicateExternal>
//                       {link.title}
//                     </Link>
//                   </li>
//                 )
//               })} */}
//               </ul>
//             </div>

//             <div className="flex grow justify-end z-10">
//               <div className={css['contact']}>
//                 <p className="semi-bold">{intl('getintouch')}</p>
//                 <p className={css['email-1']}>{EMAIL_DEVCON}</p>

//                 <div className={css['newsletter']}>
//                   <Newsletter id="footer_newsletter_email" />
//                 </div>
//               </div>

//               <div className={`${css['scroll-up']} shrink-0 hidden xl:flex`}>
//                 <Button
//                   size="sm"
//                   className="border-2"
//                   circle
//                   onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
//                 >
//                   <IconArrowUpward style={{ cursor: 'pointer' }} />
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

export const Footer = () => {
  const intl = useTranslations()

  return (
    <footer className={`footer ${css['container']} ${css['archive']}`}>
      <TopSection />

      <div className={css['bottom-section']}>
        <div className="section bg-white">
          <div className={css['content']}>
            <div className={css['col-1']}>
              <Link external className={css['small-logo']} to={LINK_ETHEREUM_FOUNDATION}>
                <ImageEF />
              </Link>

              <Copyright />
            </div>

            <div className={css['col-3']}>
              <Link
                className="bold font-xs text-uppercase hover-underline"
                to="https://ethereum.org/en/privacy-policy/"
              >
                {intl('privacy_policy')}
              </Link>
              <Link className="bold font-xs text-uppercase hover-underline" to="https://ethereum.org/en/terms-of-use/">
                {intl('terms_of_use')}
              </Link>
              <Link className="bold font-xs text-uppercase hover-underline" to="https://ethereum.org/en/cookie-policy/">
                {intl('cookie_policy')}
              </Link>
              <Link className="bold font-xs text-uppercase hover-underline" to="/code-of-conduct">
                {intl('code_of_conduct')}
              </Link>
              <Link className="bold font-xs text-uppercase hover-underline" to="/terms-of-service">
                {intl('terms_of_service')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
