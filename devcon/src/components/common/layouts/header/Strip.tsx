import React from 'react'
import { useRouter } from 'next/router'
import { Link } from 'components/common/link'
import { ArrowRight } from 'lucide-react'

export const Strip = () => {
  const router = useRouter()
  const isTickets = router.pathname === '/tickets' || router.pathname.startsWith('/tickets/')

  if (isTickets) return null

  return (
    <div id="strip" className="bg-[#1a0d33] w-full">
      <div className="section py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="bg-[#FFAC38] hidden md:flex items-center justify-center px-2 py-1 rounded shrink-0">
              <span className="font-bold text-[#160b2b] text-xs tracking-[1px] whitespace-nowrap">DEVCON TICKETS</span>
            </div>
            <p className="font-bold text-white text-sm whitespace-nowrap">Local early bird tickets now on sale!</p>
          </div>
          <Link to="/tickets" className="flex gap-1 items-center shrink-0 transition-transform hover:scale-[1.02]">
            <span className="font-bold text-[#a077f3] text-sm">Check eligibility</span>
            <ArrowRight className="text-[#a077f3]" size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
