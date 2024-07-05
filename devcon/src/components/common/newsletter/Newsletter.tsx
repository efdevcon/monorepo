import React from 'react'
import { useFormField } from 'hooks/useFormField'
import { useTranslations } from 'next-intl'
import css from './newsletter.module.scss'
import { Alert } from '../alert'
import { Button } from 'lib/components/button'
import { EMAIL_DEVCON } from 'utils/constants'
import { motion } from 'framer-motion'

export interface Result {
  result: 'success' | 'error'
  msg: string
}

interface Props {
  id?: string
}

const MC_ENDPOINT =
  'https://ethereum.us7.list-manage.com/subscribe/post-json?u=bfdb1ffb0f71e3a27b9d96aed&amp;id=013a6fa362'

export const Newsletter = (props: Props) => {
  const intl = useTranslations()
  const emailField = useFormField()
  const [result, setResult] = React.useState<Result | undefined>(undefined)

  function onDismiss() {
    setResult(undefined)
  }

  return (
    <form
      action="https://login.sendpulse.com/forms/simple/u/eyJ1c2VyX2lkIjo4MjUxNTM4LCJhZGRyZXNzX2Jvb2tfaWQiOjEwNDI3MSwibGFuZyI6ImVuIn0="
      method="post"
    >
      <div>
        <p className="semi-bold">{intl('newsletter_title')}</p>
        <div>
          {result ? (
            <div className={css['alert-container']}>
              <Alert type={result.result} message={result.msg} dismissable={true} dismissed={onDismiss} />
            </div>
          ) : (
            <>
              <p>{intl('newsletter_subtitle')}</p>
              <div className={`${css['container']} flex-col`}>
                <motion.input
                  className={`${css['input']} rounded-full p-2.5 px-5 border-solid border border-slate-300`}
                  type="email"
                  name="email"
                  whileFocus={{ boxShadow: '0px 0px 4px 0px black' }}
                  id={props.id ?? 'newsletter_email'}
                  placeholder={intl('newsletter_enter')}
                  {...emailField}
                />
                <input type="hidden" name="sender" value={EMAIL_DEVCON} />
                <Button color="black-1" className="!flex w-full mt-2 !justify-start" fill fat type="submit">
                  Subscribe to Newsletter
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
