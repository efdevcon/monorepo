import React, { useState } from 'react'
import { Dialog, DialogContent } from 'lib/components/ui/dialog'
import { X } from 'lucide-react'

export function CriteriaEligibilityButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-1.5 text-sm font-bold text-[#7235ed] hover:underline"
      >
        View criteria and eligibility
      </button>
      <CriteriaDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function CriteriaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          '!p-0 !gap-0 !border-0 !bg-transparent !shadow-none !max-w-none',
          '!top-auto !left-0 !translate-x-0 !translate-y-0 !bottom-0 !w-full',
          'sm:!top-[50%] sm:!left-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!bottom-auto sm:!max-w-[640px] sm:!w-[calc(100%-32px)]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
          'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0',
          'sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
          'data-[state=open]:duration-500 data-[state=closed]:duration-300',
          'data-[state=open]:ease-out data-[state=closed]:ease-in',
        ].join(' ')}
      >
        <div
          className={[
            'relative overflow-hidden border border-solid border-[rgba(34,17,68,0.1)] bg-[#f2f1f4] flex flex-col',
            'rounded-t-2xl rounded-b-none pt-6 pb-8 px-4 gap-6',
            'shadow-[0_-20px_25px_-5px_rgba(22,11,43,0.1),0_-8px_10px_-6px_rgba(22,11,43,0.1)]',
            'sm:rounded-2xl sm:p-8 sm:gap-8',
            'sm:shadow-[0_20px_25px_-5px_rgba(22,11,43,0.1),0_8px_10px_-6px_rgba(22,11,43,0.1)]',
          ].join(' ')}
        >
          <div className="flex items-center justify-between relative w-full">
            <h2 className="text-xl font-bold text-[#160b2b] leading-[28.8px] tracking-[-0.5px]">
              Student application criteria
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="absolute -right-2 -top-2 size-6 flex items-center justify-center text-[#160b2b] cursor-pointer hover:opacity-80 transition-opacity"
            >
              <X className="w-[18px] h-[18px]" strokeWidth={2.25} />
            </button>
          </div>

          <div className="flex flex-col gap-4 items-start w-full">
            <div className="flex flex-col gap-2 items-start w-full">
              <h3 className="text-base font-bold text-[#160b2b] leading-6">Who can apply?</h3>
              <div className="text-base text-[#1a0d33] leading-6 w-full">
                <p className="font-bold mb-3.5">Applicants should meet the following criteria:</p>
                <ul className="list-disc list-outside pl-5 space-y-1">
                  <li>
                    Currently enrolled in an <span className="font-bold">accredited university degree program</span> (Bachelor, Master, or PhD)
                  </li>
                  <li>
                    Studying fields such as computer science, engineering, mathematics, economics, law, governance, public policy, or other relevant disciplines
                  </li>
                  <li>
                    Students contributing to research, open-source projects, or academic work related to blockchain, cryptography, governance, or digital public infrastructure
                  </li>
                  <li>
                    Students involved in university research groups, blockchain clubs, policy initiatives, or developer communities
                  </li>
                  <li>Students with a demonstrated interest in Ethereum and open technologies</li>
                </ul>
              </div>
            </div>
            <div className="text-base text-[#1a0d33] leading-6 w-full space-y-3.5">
              <p>
                <span className="font-bold">Please note:</span> Short-term courses, bootcamps, and online-only programs are not eligible.
              </p>
              <p className="font-bold">Limited number of discounted tickets available.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
