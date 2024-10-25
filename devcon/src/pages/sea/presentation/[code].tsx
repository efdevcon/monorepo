import { useRouter } from 'next/router'
import React, { useEffect } from 'react'

const Redirect = (props: any) => {
  const router = useRouter()

  useEffect(() => {
    const link = props.session.resources_presentation
    if (link) {
      router.push(link)
    }
  }, [router, props.session.resources_presentation])

  if (!props.session.resources_presentation) {
    return <div className="p-2">No presentation link found. Please contact the organisers.</div>
  }

  return (
    <div className="p-2">
      Redirecting to <a href={props.session.resources_presentation}>{props.session.resources_presentation}</a>
    </div>
  )
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context: any) {
  const res = await fetch(`https://api.devcon.org/sessions/${context.params.code}`)
  const session = await res.json()
  if (!session) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      session: {
        ...session.data,
      },
    },
  }
}

export default Redirect
