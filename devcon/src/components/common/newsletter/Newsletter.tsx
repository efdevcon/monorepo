import React from 'react'
import { Button } from 'lib/components/button'
import Link from 'lib/components/link'

interface Props {
  id?: string
}

export const Newsletter = (props: Props) => {
  return (
    <div>
      <p className="semi-bold">Subscribe to our newsletter</p>
      <Link href="https://paragraph.com/@efevents/subscribe">
        <Button color="black-1" className="!flex w-full mt-2 !justify-start" fill fat type="submit">
          Subscribe
        </Button>
      </Link>
    </div>
  )
}
