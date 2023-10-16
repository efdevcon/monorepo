import React, { useState } from 'react'
import css from './settings.module.scss'
import { useAccountContext } from 'context/account-context'
import { Alert } from 'components/common/alert'
import AccountFooter from '../AccountFooter'
import { Button } from 'components/common/button'
import { InputForm } from 'components/common/input-form'
import { isEmail } from 'utils/validators'
import NotFound from './NotFound'
import { useRouter } from 'next/router'
import { AppNav } from '../../navigation'

export default function EmailSettings() {
  const router = useRouter()
  const accountContext = useAccountContext()
  const currentAccount = accountContext.account
  const [email, setEmail] = useState(currentAccount?.email ?? '')
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [nonce, setNonce] = useState('')
  const [areYouSure, setAreYouSure] = useState(false)

  if (!accountContext.account) {
    return <></>
  }

  const canDelete = accountContext.account?.addresses?.length > 0 && !!accountContext.account.email
  const buttonText = accountContext.account.email ? 'Update Email' : 'Add Email'

  const connectEmail = async () => {
    if (!isEmail(email)) {
      setError('Please provide a valid email address.')
      return
    } else {
      setError('')
    }

    const token = await accountContext.getToken(email)
    if (token) {
      setEmailSent(true)
    } else {
      setEmailSent(false)
      setError('Unable to create verification token')
    }
  }

  const verifyEmail = async () => {
    const nonceNr = Number(nonce)
    if (isNaN(nonceNr)) {
      setError('Please provide a valid verification code.')
      return
    }

    const userAccount = await accountContext.loginEmail(email, nonceNr)
    if (userAccount) {
      router.push('/app')
    }
    if (!userAccount) {
      setError('Unable to verify your email address.')
    }
  }

  const removeEmail = async () => {
    if (!accountContext.account) return

    await accountContext.updateAccount(accountContext.account._id, { ...accountContext.account, email: undefined })

    setAreYouSure(false)
    setEmail('')
  }

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Email',
          },
        ]}
      />

      <div className={css['container']}>
        <div>
          <div className="section">
            <div className="content">
              <div className={css['alert']}>{error && <Alert type="info" message={error} />}</div>

              <div className={css['form']}>
                <p className={`${css['title']} title`}>Manage Email</p>

                {!accountContext.account.email && (
                  <div className={css['not-found']}>
                    <NotFound type="email" />
                  </div>
                )}

                {emailSent && (
                  <>
                    <p className={css['content']}>
                      We&apos;ve sent a verification code to your email address. Please enter this code on below.
                    </p>
                    <InputForm
                      className={css['input']}
                      placeholder="Verification code"
                      defaultValue={nonce}
                      onChange={value => setNonce(value)}
                      onSubmit={verifyEmail}
                    />
                    <Button className={`red`} onClick={verifyEmail}>
                      Verify your email
                    </Button>
                  </>
                )}

                {!emailSent && (
                  <>
                    <InputForm
                      className={css['input']}
                      placeholder="Email"
                      defaultValue={email}
                      onChange={value => setEmail(value)}
                      onSubmit={connectEmail}
                    />

                    {!areYouSure && (
                      <Button className={`black`} onClick={connectEmail}>
                        {buttonText}
                      </Button>
                    )}
                  </>
                )}

                {!areYouSure && !emailSent && canDelete && (
                  <Button className={`red ${css['button']}`} onClick={() => setAreYouSure(true)}>
                    Delete Email
                  </Button>
                )}

                {areYouSure && (
                  <>
                    <p>Are you sure you want to remove your associated email address?</p>
                    <Button className={`black ${css['button']}`} onClick={() => setAreYouSure(false)}>
                      No, keep my email
                    </Button>
                    <Button className={`red ${css['button']}`} onClick={removeEmail}>
                      Yes, delete my email
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <AccountFooter />
      </div>
    </>
  )
}
