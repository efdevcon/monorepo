import { Verifier } from './verifier'
import Background from 'assets/images/pages/program.svg'
import { Ticket, TicketDiscount } from './tickets'
import css from '../../common/card/call-to-action.module.scss'
import discounts from './discounts.json'
import { Link } from 'components/common/link'

export function SelfClaimingDiscounts() {
  return (
    <div className="section  relative">
      <div className="anchor absolute -top-20" id="discounts"></div>
      <div className="h2 bold mb-6 pt-8 border-top">Discounts</div>
      <p>We're working to make Devcon 7 more accessible than ever before.</p>
      <p>
        We're proud to offer discounted tickets to community contributors through 1. self-claiming methods, and 2. our
        standard application-based process.
      </p>

      <div className="text-xl bold font-secondary mb-6 mt-8">Self-claim (Open until August 31)</div>
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
      </div>

      <div className={`rounded-xl shadow mt-8 ${css['message-card']} ${css['blue']}`}>
        <div className={`z-1 ${css['background']}`}>
          <Background />
        </div>

        <Verifier />
      </div>

      <div className="text-xl bold font-secondary mb-6 mt-8">Application-based (Open indefinitely)</div>
      <ul className="list-inside list-decimal mb-12 flex flex-col gap-4 text-sm">
        <li>
          <span className="font-bold text-base">Local SEA Builders ($49)</span>
          <p className="ml-5">
            For locals who are passionate about Ethereum & want to attend Devcon. Local residents can apply via
            zkPassport or AnonAadhaar below, OR via{' '}
            <Link to="https://forms.gle/WWDCFybVVFSaxPee8" className="text-[#1b6fae] hover:text-[#448dc3]">
              our manual application
            </Link>
            . <i>ID submission required.</i>
          </p>
          <ul className="list-inside list-disc mt-4 ml-8">
            <li>
              SEA Residents —{' '}
              <Link to="https://devcon.zkpassport.id/" className="text-[#1b6fae] hover:text-[#448dc3]">
                zkPassport
              </Link>
              : Use your Passport & Zero-Knowledge proofs to prove SEA residency, which can help qualify you for a Local
              Builder Discount.
            </li>
            <li>
              Indian Residents —{' '}
              <Link to="https://devcon7.anon-aadhaar.pse.dev/" className="text-[#1b6fae] hover:text-[#448dc3]">
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
            className="font-bold text-base text-[#1b6fae] hover:text-[#448dc3]"
          >
            Builder
          </Link>{' '}
          ($149)
          <p className="ml-5">
            For builders of all kinds who actively volunteer or contribute their time to the growth, research and
            development of Ethereum or the ecosystem. <i>ID submission required.</i>
          </p>
        </li>
        <li>
          <Link
            to="https://forms.gle/qhAuAQFeTBTe8U9f9"
            className="font-bold text-base text-[#1b6fae] hover:text-[#448dc3]"
          >
            Academic (Students & Teachers)
          </Link>{' '}
          ($299)
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
            className="font-bold text-base text-[#1b6fae] hover:text-[#448dc3]"
          >
            Youth (under 18)
          </Link>{' '}
          ($20)
          <p className="ml-5">
            For those under 18 years of age who are passionate about Ethereum & want to attend Devcon.{' '}
            <i>ID submission required.</i>
          </p>
        </li>
      </ul>

      <div className="bold font-secondary mb-6">Other ways to attend</div>
      <ul className="list-inside list-decimal mb-8">
        <li>
          <Link to="https://forms.gle/5PZBFecCCuRsQqLu8" className="font-bold text-[#1b6fae] hover:text-[#448dc3]">
            Community Ticket Requests
          </Link>
          <p className="ml-5">
            Leaders & organizers of various web2 & web3 communities or meetups can apply for free or discounted tickets
            for their groups to attend.
          </p>
        </li>
      </ul>
    </div>
  )
}
