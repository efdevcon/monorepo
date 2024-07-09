import { Verifier } from './verifier'
import Background from 'assets/images/pages/program.svg'
import { Ticket, TicketDiscount } from './tickets'
import css from '../../common/card/call-to-action.module.scss'
import ticketCss from 'pages/tickets.module.scss'
import discounts from './discounts.json'
import { Link } from 'components/common/link'
import cn from 'classnames'

export function SelfClaimingDiscounts() {
  return (
    <div className="section  relative">
      <div className="anchor absolute -top-20" id="discounts"></div>
      <div className="h2 bold mb-4 pt-8 border-top">Discounts</div>
      <p>We're working to make Devcon 7 more accessible than ever before.</p>
      <p>
        We're proud to offer discounted tickets to community contributors through 1. self-claiming methods, and 2. our
        standard application-based process.
      </p>

      <div className="text-xl bold font-secondary mb-4 mt-8">Self-claim (Open until August 31)</div>
      <p>
        Simply connect your wallet, sign a message proving that you own this wallet, and claim your discount. Claiming
        open until September 15.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
        {discounts
          .sort((a, b) => b.target - a.target)
          .map((i: TicketDiscount) => {
            return <Ticket key={i.name} {...i} />
          })}
        <Ticket name='Local Builders' description='Discount for SEA Residents, and Indian residents' body="Prove you're eligible for a Local SEA Builder discount with zkPassport for SEA Residents, and AnonAadhaar for Indian residents. Application approval required." target={0} discount={0} tags={['zkPassport', 'AnonAadhaar']} />
      </div>

      <div className={`rounded-xl shadow mt-8 ${css['message-card']} ${css['blue']}`}>
        <div className={`z-1 ${css['background']}`}>
          <Background />
        </div>

        <Verifier />
      </div>

      <div className="text-xl bold font-secondary mb-6 mt-8" id="app-based">Application-based (Open indefinitely)</div>
      <ul className="list-inside list-decimal mb-12 flex flex-col gap-4 text-sm">
        <li>
          <span className="font-bold text-base">Local SEA Builders ($49 USD)</span>
          <p className="ml-5">
            For locals who are passionate about Ethereum & want to attend Devcon. Local residents can apply via
            zkPassport or AnonAadhaar below, OR via{' '}
            <Link
              indicateExternal
              to="https://forms.gle/WWDCFybVVFSaxPee8"
              className="text-[#1b6fae] hover:text-[#448dc3]"
            >
              our manual application
            </Link>
            . <i>ID submission required.</i>
          </p>
          <ul className="list-inside list-disc mt-4 ml-8">
            <li>
              SEA Residents —{' '}
              <Link indicateExternal to="https://devcon.zkpassport.id/" className="text-[#1b6fae] hover:text-[#448dc3]">
                zkPassport
              </Link>
              : Use your Passport & Zero-Knowledge proofs to prove SEA residency, which can help qualify you for a Local
              Builder Discount.
            </li>
            <li>
              Indian Residents —{' '}
              <Link
                indicateExternal
                to="https://devcon7.anon-aadhaar.pse.dev/"
                className="text-[#1b6fae] hover:text-[#448dc3]"
              >
                AnonAahdhaar
              </Link>
              : Use your Aadhaar card & Zero-Knowledge Proofs to prove Indian residency, which can help qualify you for
              Local Builder Discount.
            </li>
          </ul>
        </li>
        <li>
          <Link
            to="https://forms.gle/bRdrSrfq7EPVQXMY7"
            indicateExternal
            className="font-bold text-base text-[#1b6fae] hover:text-[#448dc3]"
          >
            Builder
          </Link>{' '}
          ($299 USD)
          <p className="ml-5">
            For builders of all kinds who actively volunteer or contribute their time to the growth, research and
            development of Ethereum or the ecosystem. <i>ID submission required.</i>
          </p>
        </li>
        <li>
          <Link
            to="https://forms.gle/qhAuAQFeTBTe8U9f9"
            indicateExternal
            className="font-bold text-base text-[#1b6fae] hover:text-[#448dc3]"
          >
            Academic (Students & Teachers)
          </Link>{' '}
          ($99 USD)
          <p className="ml-5">
            For students & educators who wish to learn more about Ethereum.{' '}
            <i>
              Must be a current student with valid student ID or transcript, or justly employed by an Academic
              Institution.
            </i>{' '}
            <i>ID submission required.</i>
          </p>
        </li>
        <li>
          <Link
            to="https://forms.gle/CZ9cuwMMGB5N1XuC8"
            indicateExternal
            className="font-bold text-base text-[#1b6fae] hover:text-[#448dc3]"
          >
            Youth (under 18)
          </Link>{' '}
          ($20 USD)
          <p className="ml-5">
            For those under 18 years of age who are passionate about Ethereum & want to attend Devcon.{' '}
            <i>ID submission required.</i>
          </p>
        </li>
      </ul>

      <div className="h2 bold font-secondary border-top pt-8 pb-8 border-bottom mb-8">Other Ways to Attend</div>

      <div className={cn('flex flex-col')}>
        <div className="flex items-center mb-4">
          <button className={cn(ticketCss['round-button'], 'mr-3 shrink-0')}>
            <span>{1}</span>
          </button>
          <Link
            to="https://forms.gle/5PZBFecCCuRsQqLu8"
            indicateExternal
            className="bold h5 flex items-center justify-center text-[#1b6fae] hover:text-[#448dc3]"
          >
            Community Ticket Requests
          </Link>
        </div>
        <p className="mb-8">
          Leaders & organizers of various web2 & web3 communities or meetups can apply for free or discounted tickets
          for their groups to attend.
        </p>
      </div>
      {/* <Link to="https://forms.gle/5PZBFecCCuRsQqLu8" className="font-bold text-[#1b6fae] hover:text-[#448dc3]">
        Community Ticket Requests
      </Link>
      <p className="mb-8">
        Leaders & organizers of various web2 & web3 communities or meetups can apply for free or discounted tickets for
        their groups to attend.
      </p> */}
    </div>
  )
}
