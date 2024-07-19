import { FormEvent, useEffect, useState } from 'react'
import { getCsrfToken, signIn, signOut, useSession } from 'next-auth/react'
import { Button } from 'lib/components/button'
import { useDebounceValue } from 'usehooks-ts'
import { Link } from 'components/common/link'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import css from './discounts.module.scss'

interface Props {
  className?: string
}

interface DiscountsBody {
  id: string
  type: 'github' | 'ethereum'
  discount: number
  discounts: { list: string; discount: number }[]
}

export function Verifier(props: Props) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [inputValue, setInputValue] = useState('')
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const [discount, setDiscount] = useState<DiscountsBody | undefined>()
  const [voucher, setVoucher] = useState('')
  const [error, setError] = useState('')
  const { data: session } = useSession()

  const popupCenter = async (url: string, title: string) => {
    const width = 375
    const height = 600
    var left = (screen.width - width) / 2
    var top = (screen.height - height) / 2

    if (session && session.type === 'ethereum') await signOut({ redirect: false })
    const newWindow = window.open(url, title, 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top)

    newWindow?.focus()
  }

  const handleSiweSignIn = async () => {
    try {
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce: await getCsrfToken(),
      })

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      })

      if (session && session.type === 'github') await signOut({ redirect: false })

      signIn('credentials', {
        message: JSON.stringify(message),
        redirect: false,
        signature,
      })
    } catch (error) {
      console.error('handleLogin error', error)
      setError('Unable to sign in with Ethereum')
    }
  }

  async function clear() {
    await signOut({ redirect: false })
    setInputValue('')
    setValue('')
    setDiscount(undefined)
    setVoucher('')
  }

  async function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    setValue(e.target.value)
    if (!e.target.value) setDiscount(undefined)
  }

  useEffect(() => {
    if (!debouncedValue) return

    async function fetchData() {
      const response = await fetch(`/api/discounts/validate/${debouncedValue}`)
      const body = await response.json()
      setDiscount(body.data)
    }

    fetchData()
  }, [debouncedValue])

  useEffect(() => {
    async function fetchData() {
      if (!session?.id) return
      const discountRes = await fetch(`/api/discounts/validate/${session.id}`)
      const discountBody = await discountRes.json()

      const voucherRes = await fetch(`/api/discounts/claim/${session?.id}`)
      const voucherBody = await voucherRes.json()

      if (voucherRes.status === 401) {
        clear()
        return setError('Unauthorized')
      }

      setError('')
      setInputValue(session.id)
      setValue(session.id)
      setDiscount(discountBody.data)
      setVoucher(voucherBody.data.voucher)
    }

    fetchData()
  }, [session])

  useEffect(() => {
    if (debouncedValue && isConnected && session?.type !== 'ethereum' && discount?.type === 'ethereum') {
      handleSiweSignIn()
    }
  }, [debouncedValue, isConnected, session?.type, discount?.type])

  async function validate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!debouncedValue) {
      setDiscount(undefined)
      return
    }

    const response = await fetch(`/api/discounts/validate/${debouncedValue}`)
    const body = await response.json()
    setDiscount(body.data)
  }

  async function claim() {
    if (!session?.id) return setError('Unauthorized')

    const response = await fetch(`/api/discounts/claim/${session?.id}`)
    const body = await response.json()

    if (response.status === 401) {
      setError('Unauthorized')
    }
    if (response.status === 200) {
      setError('')
      setVoucher(body.data.voucher)
    }
  }

  return (
    <form className={props.className} onSubmit={validate}>
      <div className={css['header']}>
        <p className="bold font-lg">Check eligibility</p>
        <div className={`label bold ${css['tag']} ghost rounded-lg`}>Now live</div>
      </div>

      <div className="flex flex-col justify-between gap-4 lg:flex-row">
        <div className="w-full lg:w-2/5">
          <strong>Enter wallet address or Github username.</strong>
          <p>Validate any single source of criteria to unlock discounted Devcon tickets.</p>
        </div>

        <div className="w-full lg:w-2/5 z-[2]">
          <input
            className={`rounded-full w-full border-solid border p-2.5 px-5 ${
              discount ? (discount?.discount > 0 ? 'border-green-300' : 'border-red-300') : 'border-slate-300'
            }`}
            type="text"
            placeholder="Address or Github username"
            value={inputValue}
            onChange={onInputChange}
          />
        </div>

        <div className="z-[2]">
          {!voucher && !discount && (
            <Button color="blue-1" fill fat>
              Validate
            </Button>
          )}

          {!voucher && discount && discount.discount === 0 && (
            <button onClick={clear}>
              <Button color="black-1" fill fat>
                Clear
              </Button>
            </button>
          )}

          {!voucher &&
            discount &&
            discount.discount > 0 &&
            discount.type === 'github' &&
            session?.type !== 'github' && (
              <button onClick={() => popupCenter('/signin', 'Sign-in With Github')}>
                <Button color="green-1" fill fat>
                  Connect Github
                </Button>
              </button>
            )}

          {!voucher &&
            discount &&
            discount.discount > 0 &&
            discount.type === 'ethereum' &&
            session?.type !== 'ethereum' &&
            !isConnected && <w3m-button balance="hide" />}

          {!voucher &&
            discount &&
            discount.discount > 0 &&
            discount.type === 'ethereum' &&
            session?.type !== 'ethereum' && 
            isConnected && (
              <button onClick={handleSiweSignIn}>
                <Button color="green-1" fill fat>
                  Sign Message
                </Button>
              </button>
            )}

          {!voucher && discount && discount.discount > 0 && discount.type === session?.type && (
            <button onClick={claim}>
              <Button color="green-1" fill fat>
                Claim Discount
              </Button>
            </button>
          )}

          {voucher && (
            <div className="flex flex-row items-center gap-2">
              <Link
                className="font-medium text-[#1b6fae] hover:text-[#448dc3]"
                to={`https://tickets.devcon.org/redeem?voucher=${voucher}`}
                target="_blank"
              >
                Redeem
              </Link>
              <span className="text-sm cursor-pointer" onClick={clear}>
                Reset
              </span>
            </div>
          )}
        </div>
      </div>

      {discount && (
        <div className="mt-8">
          {discount.discount === 0 && (
            <p>
              Unfortunately, <b>{debouncedValue}</b> is not eligible for a discount. Please try another account or
              address.
            </p>
          )}
          {discount.discount > 0 && (
            <p>
              Congratulations! You are eligible to purchase Devcon tickets with a <b>{discount.discount}% Discount</b>.{' '}
            </p>
          )}
        </div>
      )}
    </form>
  )
}
