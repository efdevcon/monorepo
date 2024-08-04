import React from 'react'
import { motion } from 'framer-motion'
import css from './list.module.scss'

const list = {
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.2,
    },
  },
  hidden: { opacity: 0 },
}

const itemVariants = {
  visible: { opacity: 1, x: 0 },
  hidden: { opacity: 0, x: -50 },
}

type ListProps = {
  items: {
    id: string
    content: React.ReactElement
  }[]
  className?: string
  [key: string]: any
}

const Checklist = ({ items, className, ...rest }: ListProps) => {
  let clazzName = css['list']

  if (clazzName) clazzName += ` ${className}`

  return (
    <motion.ul initial="hidden" animate="visible" variants={list} className={clazzName} {...rest}>
      {items.map(item => {
        return (
          <motion.li key={item.id} variants={itemVariants}>
            {item.content}
          </motion.li>
        )
      })}
    </motion.ul>
  )
}

export default Checklist
