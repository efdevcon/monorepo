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
    href: string
  }[]
  children: React.ReactNode
}

const Page = (props: PageProps) => {
  return (
    <div className="p-4">
      <div className="flex flex-col gap-4">
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
                    <BreadcrumbLink href={breadcrumb.href}>
                      {index === props.breadcrumbs.length - 1 ? (
                        <span className="font-semibold">{breadcrumb.label}</span>
                      ) : (
                        label
                      )}
                    </BreadcrumbLink>
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
        {props.children}
      </div>
    </div>
  )
}

export default Page
