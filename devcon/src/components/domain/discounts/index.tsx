import { Verifier } from './verifier'
import Background from 'assets/images/pages/program.svg'
import { Ticket, TicketDiscount } from './tickets'
import css from '../../common/card/call-to-action.module.scss'
import discounts from './discounts.json'

export function SelfClaimingDiscounts() {
  return (
    <div className="section my-12 relative">
        <div className="anchor absolute -top-20" id="discounts"></div>
        <div className="h2 bold mb-6 pt-8 border-top">Discounts</div>
        <p>Methods for claiming Devcon ticket discounts</p>

        <div className="text-xl bold font-secondary mb-6 mt-8">Self-claimed</div>
        <p>We are offering Reserved or Discounted to a few groups, including</p>

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8'>
          {discounts.sort((a, b) => b.target - a.target).map((i: TicketDiscount) => {
            return <Ticket key={i.name} {...i} />
          })}
        </div>

        <div className={`rounded-xl shadow mt-8 ${css['message-card']} ${css['blue']}`}>
          <div className={`z-1 ${css['background']}`}>
            <Background />
          </div>
      
          <Verifier />
        </div>
      </div>
  )
}
