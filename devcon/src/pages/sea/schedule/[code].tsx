import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

const Speaker = (props: any) => {
  const router = useRouter()

  useEffect(() => {
    // Devcon 7 sessions live in the old app, kept on its netlify.app host
    // (docs/app-domain-migration.md); app.devcon.org is the Devcon 8 app.
    router.push(`https://devcon-app.netlify.app/schedule/${props.params.code}`)
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
