import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

const Speaker = (props: any) => {
  const router = useRouter()

  useEffect(() => {
    router.push(`https://app.devcon.org/schedule/${props.params.code}`)
  }, [router, props.params.code])

  return <></>
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  return {
    props: {
      params: context.params,
    },
  }
}

export default Speaker
