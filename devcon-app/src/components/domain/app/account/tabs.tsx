import { Link } from 'components/common/link'
import cn from 'classnames'
import { usePathname } from 'next/navigation'

const tabClass = 'cursor-pointer pb-2 px-0.5 border-b-2 border-solid border-transparent transition-all duration-300'
const activeClass = '!border-[#7D52F4] !text-[#7D52F4] '

const Tabs = () => {
  const pathname = usePathname()

  return (
    <div className="flex gap-4 px-4 lg:pt-4">
      <Link to="/account" className={cn(tabClass, pathname === '/account' && activeClass)}>
        Passport
      </Link>
      <Link to="/account/settings" className={cn(tabClass, pathname === '/account/settings' && activeClass)}>
        Settings & Connections
      </Link>
    </div>
  )
}

export default Tabs
