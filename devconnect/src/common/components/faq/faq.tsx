import { useTina } from 'tinacms/dist/react'
import { client } from '../../../../tina/__generated__/client'
import { PagesQuery, PagesIndex } from '../../../../tina/__generated__/types'
import ChevronDown from 'assets/icons/chevron-down.svg'
import ChevronUp from 'assets/icons/chevron-up.svg'
import RichText from 'lib/components/tina-cms/RichText'
import { motion } from 'framer-motion'
import { useState } from 'react'

const FAQ = (props: any) => {
  const [openFAQ, setOpenFAQ] = useState<string | null>(null)

  return (
    <div className="section mt-4 text-black">
      <div className="my-4 h2">Frequently Asked Questions</div>
      <div className="flex flex-col">
        {props.questions?.map(({ question, answer }: { question: string; answer: any }) => {
          const open = question === openFAQ

          return (
            <div key={question} className="w-full border-[#E2E3FF] bg-[#F8F9FE] rounded-xl shadow mb-4">
              <button
                className="w-full p-4 bold cursor-pointer select-none hover:opacity-70 flex justify-between items-center"
                onClick={() => setOpenFAQ(open ? null : question)}
                type="button"
                aria-expanded={open}
              >
                {question}
                <span className="flex opacity-60">{open ? <ChevronUp /> : <ChevronDown />}</span>
              </button>

              {open && (
                <motion.div
                  initial={{ y: '-20%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  className="w-full p-4 pt-2"
                >
                  <RichText content={answer} />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FAQ
