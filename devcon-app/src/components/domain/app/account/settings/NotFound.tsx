import React from 'react'
import NotFoundIcon from 'assets/icons/not-found.svg'
import css from './notfound.module.scss'

interface Props {
  type: 'email' | 'wallet'
  className?: string
}

export default function NotFound(props: Props) {
  let className = css['container']
  if (props.className) className += ` ${props.className}`

  const emailTitle = 'No Email Found'
  const emailDescription =
    "Connect your email to the Devcon Account to create a recoverability mechanism via OTP and have access without the need for a web3 wallet. Please note you can only add an email address that isn't already used to create an account."

  const walletTitle = 'No Wallet Found'
  const walletDescription =
    "Connect to the Devcon Account using a wallet to gain access to web3 functionality and ensure that your data is controlled based on your preferences. Please note you can only add a wallet that isn't already used to create an account."

  return (
    <div className={className}>
      <div className={css['image']}>
        <NotFoundIcon />
      </div>
      <div className={css['content']}>
        <p className="semi-bold">
          {props.type === 'email' && emailTitle}
          {props.type === 'wallet' && walletTitle}
        </p>
        <p className={css['description']}>
          {props.type === 'email' && emailDescription}
          {props.type === 'wallet' && walletDescription}
        </p>
      </div>
    </div>
  )
}
