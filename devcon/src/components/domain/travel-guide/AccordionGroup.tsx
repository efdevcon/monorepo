import React from 'react'
import { ChevronDown } from 'lucide-react'
import cn from 'classnames'
import css from './accordion-group.module.scss'
import { Reveal, RevealGroup } from './Reveal'

export interface AccordionGroupItem {
  id: string
  title: string
  subtitle?: string
  children: React.ReactNode
}

interface AccordionGroupProps {
  items: AccordionGroupItem[]
  className?: string
  defaultOpenId?: string
  /** Only one item open at a time (opening one closes the previous) */
  singleOpen?: boolean
  /** Play a staggered scroll-in entrance; value = per-item delay offset in ms */
  revealStagger?: number
}

// Items open independently by default; `singleOpen` keeps one open at a time.
// Separate groups are fully independent since each instance owns its own state.
export const AccordionGroup = ({ items, className, defaultOpenId, singleOpen, revealStagger }: AccordionGroupProps) => {
  const [openIds, setOpenIds] = React.useState<Set<string>>(
    () => new Set(defaultOpenId ? [defaultOpenId] : [])
  )

  const toggle = (id: string) => {
    setOpenIds(prev => {
      if (prev.has(id)) {
        const next = new Set(prev)
        next.delete(id)
        return next
      }
      return singleOpen ? new Set([id]) : new Set(prev).add(id)
    })
  }

  // With a reveal stagger, the container doubles as the shared scroll trigger
  // so every item plays its ladder from one intersection.
  const Container = revealStagger != null ? RevealGroup : 'div'

  return (
    <Container className={cn(css['group'], className)}>
      {items.map((item, i) => {
        const isOpen = openIds.has(item.id)

        const itemEl = (
          <div className={cn(css['item'], { [css['item-open']]: isOpen })}>
            <button
              type="button"
              className={css['trigger']}
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${item.id}`}
              onClick={() => toggle(item.id)}
            >
              <span className={css['title-block']}>
                <span className={css['title']}>{item.title}</span>
                {item.subtitle && <span className={css['subtitle']}>{item.subtitle}</span>}
              </span>
              <ChevronDown size={24} className={cn(css['chevron'], { [css['chevron-open']]: isOpen })} />
            </button>
            <div
              id={`accordion-panel-${item.id}`}
              role="region"
              className={cn(css['content-wrap'], { [css['content-open']]: isOpen })}
              aria-hidden={!isOpen}
              inert={!isOpen}
            >
              <div className={css['content-inner']}>
                <div className={css['content']}>{item.children}</div>
              </div>
            </div>
          </div>
        )

        return revealStagger != null ? (
          <Reveal key={item.id} delay={i * revealStagger}>
            {itemEl}
          </Reveal>
        ) : (
          <React.Fragment key={item.id}>{itemEl}</React.Fragment>
        )
      })}
    </Container>
  )
}
