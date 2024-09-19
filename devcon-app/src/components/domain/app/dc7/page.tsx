import React from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import Image from 'next/image'
import AppIcons from 'pages/wip/dc-7-images/login-icons-colorless.png'
import ProfileIcon from 'assets/icons/account.svg'

type PageProps = {
  breadcrumbs: {
    label: string
    href?: string
  }[]
  children: React.ReactNode
  rightContent?: React.ReactNode
}

const Page = (props: PageProps) => {
  React.useEffect(() => {
    const setVhAndBackground = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.backgroundColor = 'black'
    }

    setVhAndBackground()
    window.addEventListener('resize', setVhAndBackground)

    return () => {
      window.removeEventListener('resize', setVhAndBackground)
      document.documentElement.style.removeProperty('background-color')
    }
  }, [])

  return (
    <div className="p-4 flex items-center justify-center relative h-[calc(var(--vh,1vh)*100)] bg-white">
      <div className="flex flex-col gap-4 justify-between w-4/5 max-w-[470px] h-[70%] max-h-[800px]">
        <div className="flex flex-col gap-6">
          <Image src={AppIcons} alt="App icons" className="w-[80px]" />
          <Breadcrumb>
            <BreadcrumbList>
              {props.breadcrumbs.map((breadcrumb, index) => {
                let label = breadcrumb.label as any

                if (breadcrumb.href === '/profile') {
                  label = <ProfileIcon />
                }

                return (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      {breadcrumb.href ? (
                        <BreadcrumbLink href={breadcrumb.href} className="cursor-pointer">
                          {index === props.breadcrumbs.length - 1 ? (
                            <span className="font-semibold">{breadcrumb.label}</span>
                          ) : (
                            label
                          )}
                        </BreadcrumbLink>
                      ) : (
                        <span className={index === props.breadcrumbs.length - 1 ? 'font-semibold' : ''}>{label}</span>
                      )}
                    </BreadcrumbItem>
                    {index < props.breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                )
              })}
              {/* <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/components">Components</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem> */}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {props.children}
      </div>
      <div className="w-1/2 shrink-0 grow 2xl:grow-0 2xl:max-w-[800px] relative 2xl:ml-16 flex justify-center rounded-xl overflow-hidden aspect-square">
        {props.rightContent}
      </div>
    </div>
  )
}

export default Page
