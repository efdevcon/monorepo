import React, { useState } from 'react'
import { Link, navigate, useLocation } from '@reach/router'
import { useAccountContext } from 'src/context/account-context'
import { Alert } from './common/alert'
import { isEmail } from 'src/utils/validators'

export default function Connect() {
  const accountContext = useAccountContext()
  const location = useLocation()
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  const connectWeb3AndLogin = async () => {
    const nonce = await accountContext.getNonce()
    const message = `Sign this message to prove you have access to this wallet. This won't cost you anything.\n\nNonce: ${nonce} *\n * You don't need to remember this.`
    const signedMessage = await accountContext.signMessage(message)

    if (!signedMessage) {
      setError('Unable to connect to web3')
      return
    }

    const userAccount = await accountContext.loginWeb3(
      signedMessage.address,
      signedMessage.message,
      signedMessage.signature
    )
    if (!userAccount) {
      setError('Unable to login with web3')
    }
  }

  const connectEmail = async () => {
    if (!isEmail(email)) {
      setError('No valid email address provided.')
      return
    }

    const userAccount = await accountContext.loginEmail(email, 123456) // TODO: Email nonce
    if (!userAccount) {
      const msg = 'Unable to login with email.'
      setError(msg)
    }
  }

  const disconnect = async () => {
    accountContext.logout(accountContext.account?._id)
  }

  if (accountContext.account) {
    if (location?.search) {
      navigate('/app/profile' + location.search)
    } else {
      navigate('/app/profile')
    }

    return null
  }

  return (
    <div>
      {error && <Alert type="info" message={error} />}

      {!accountContext.account && (
        <div>
          <p>If this is the first time you're logging in, it will automatically create a new account.</p>
          <p>
            <strong>Choose Web3 Login method.</strong>
          </p>
          <br />

          <div>
            <h3>For beginning web3 users</h3>
            <input
              type="text"
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <br />
            <button onClick={connectEmail}>Sign in with email</button>
          </div>

          <br />
          <p>—or—</p>
          <br />

          <div>
            <h3>For experienced users</h3>
            <button onClick={connectWeb3AndLogin}>Sign in with wallet</button>
          </div>
          <br />

          <p>
            Devcon facilitates complete ownership over your data, while allowing you to access web3 interactivity
            through our application if you choose to participate.
          </p>
          <p>
            <small>
              Your general experience and cross device compatibality may be affected if you choose an existing wallet
              with web3 modal support.
            </small>
          </p>
        </div>
      )}

      {accountContext.account && (
        <div>
          <p>
            You're already logged in. View your <Link to="/app/profile">profile</Link>.
          </p>
          <br />
          <p>
            <button onClick={disconnect}>Logout</button>
          </p>
        </div>
      )}
    </div>
  )
}
