import React from 'react'
import { useFormField } from 'src/hooks/useFormField'
import { useIntl } from 'gatsby-plugin-intl'
import css from './newsletter.module.scss'
import { Alert } from '../alert'
import { Button } from 'src/components/common/button'
import { EMAIL_DEVCON } from 'src/utils/constants'

export interface Result {
  result: 'success' | 'error'
  msg: string
}

interface Props {
  id?: string
}

export const Newsletter = (props: Props) => {
  const intl = useIntl()
  const emailField = useFormField()
  const [result, setResult] = React.useState<Result | undefined>(undefined)

  function onDismiss() {
    setResult(undefined)
  }

  return (
    <form action="https://login.sendpulse.com/forms/simple/u/eyJ1c2VyX2lkIjo4MjUxNTM4LCJhZGRyZXNzX2Jvb2tfaWQiOjEwNDI3MSwibGFuZyI6ImVuIn0=" method="post">
      <div>
        <p className="semi-bold">{intl.formatMessage({ id: 'newsletter_title' })}</p>
        <div>
          {result ? (
            <div className={css['alert-container']}>
              <Alert type={result.result} message={result.msg} dismissable={true} dismissed={onDismiss} />
            </div>
          ) : (
            <>
              <p>{intl.formatMessage({ id: 'newsletter_subtitle' })}</p>
              <div className={css['container']}>
                <input
                  className={css['input']}
                  type="email"
                  name='email'
                  id={props.id ?? 'newsletter_email'}
                  placeholder={intl.formatMessage({ id: 'newsletter_enter' })}
                  {...emailField}
                />
                <input type="hidden" name="sender" value={EMAIL_DEVCON} />
                <Button className={`white ${css['button']}`} type="submit">
                  {intl.formatMessage({ id: 'newsletter_subscribe' })}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
