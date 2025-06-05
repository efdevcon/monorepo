import { ReactNode } from 'react'
import cn from 'classnames'
import styles from './styles.module.scss'

interface TiledButtonProps {
  children: ReactNode
  className?: string
  icon?: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export const TiledButton = ({ children, className, icon, onClick, type = 'button' }: TiledButtonProps) => {
  return (
    <button type={type} onClick={onClick} className={cn(styles['tiled-button'], className)}>
      <div className="group-hover:translate-y-[3px] transition-transform flex items-center gap-2">
        {children}
        {icon}
      </div>
    </button>
  )
}
