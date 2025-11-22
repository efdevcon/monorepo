import React, { useState } from 'react'
import { Fireflies } from './fireflies'
import Image from 'next/image'
import DC8Background from './images/wow.png'
import Logo from './images/logo.png'
import css from './hero.module.scss'
import cn from 'classnames'

// TODO: Move to lib later
const GlassInput = ({
  value,
  onChange,
  className,
  placeholder,
  type,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  type?: string
}) => {
  return (
    <div className={cn(css['glass'], 'group flex items-center', className)}>
      <input
        type={type || 'text'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-[#4B4B66] bg-transparent outline-none group-hover:border-white"
      />
      <div
        style={{
          gap: '4px',
          borderRadius: '34px',
          background: '#FE7A06',
        }}
        className={cn(
          value.length > 0 ? 'opacity-100' : 'opacity-40',
          'h-[95%] shrink-0 flex items-center justify-center px-3 text-sm transition-opacity cursor-pointer text-white font-primary font-medium'
        )}
      >
        Join
      </div>
    </div>
  )
}

const NewsletterForm = () => {
  const [email, setEmail] = useState('')

  return (
    <div className="glass w-[300px]">
      <div className="font-semibold font-primary mb-1" style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}>
        Join the waitlist
      </div>
      <GlassInput
        value={email}
        onChange={setEmail}
        placeholder="Email address"
        type="email"
        className="text-[#4B4B66]"
      />
    </div>
  )
}

const CenteredOverlayContent = () => {
  return (
    <div className="absolute h-full inset-0 w-full flex items-center justify-center z-[11] text-black">
      <div className="flex font-secondary text-white flex-col items-center justify-center gap-3">
        <Image src={Logo} alt="Devcon 8 Logo" />
        <div className="text-3xl font-bold text-center" style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}>
          Ethereum's global community <br /> and developer conference
        </div>
        <div className="text-2xl font-semibold mb-2" style={{ textShadow: '0 2px 8px rgba(70, 73, 135, 0.75)' }}>
          MUMBAI, INDIA
        </div>
        <NewsletterForm />
      </div>
    </div>
  )
}

export const Hero = () => {
  return (
    <div className="relative h-screen w-screen">
      <div className="fixed h-screen w-screen z-[10]">
        <Fireflies id="lower-fireflies" />
        <CenteredOverlayContent />
        <Image src={DC8Background} alt="Devcon 8 Background" fill className="w-full h-full object-cover" />
      </div>
    </div>
  )
}
