import React from 'react'
import Head from 'next/head'
import Markdown from 'react-markdown'
import { CopyProvider, useCopy, Copy, CopyOverview } from 'lib/components/use-copy'
import { getCopyContent } from 'lib/components/use-copy/server/get-content'

const basePath = process.env.COPY_CONTENT_PATH || './content'

const defaults = {
  hero: {
    title: 'Welcome to Devcon',
    subtitle:
      'An intensive introduction for new Ethereum explorers, a global family reunion for those already part of our ecosystem.',
  },
  about: {
    heading: '## What is Devcon?',
    body: `Devcon is the Ethereum conference for **developers**, researchers, thinkers, and makers.

We host Devcon to educate and empower the community to build and use decentralized systems.

Our goal is to push the boundaries of possibility in our mission to bring decentralized protocols, tools, and culture to the world.`,
  },
  features: {
    heading: '## Key Features',
    item1: 'Talks & Workshops from leading Ethereum builders',
    item2: 'Community-driven programming and DIPs',
    item3: 'A global gathering spanning multiple continents',
  },
}

const copyConfig = {
  basePath,
  devMode: process.env.NODE_ENV === 'development',
  apiEndpoint: '/api/copy/save',
}

export default function CmsTestPage(props: any) {
  return (
    <CopyProvider config={copyConfig}>
      <CmsTestContent serverContent={props.copyContent} />
    </CopyProvider>
  )
}

function CmsTestContent({ serverContent }: { serverContent: typeof defaults }) {
  const content = useCopy('cms-test', defaults, serverContent)

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
        <title>CMS Test Page</title>
      </Head>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '12px 16px', background: '#fef3c7', borderRadius: 8, marginBottom: 32, fontSize: 14 }}>
          Dev-only test page for <code>use-copy</code> library. Not indexed by search engines.
        </div>

        <section style={{ marginBottom: 48 }}>
          <Copy field={content.hero.title}>
            <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>{String(content.hero.title)}</h1>
          </Copy>
          <Copy field={content.hero.subtitle}>
            <p style={{ fontSize: 18, color: '#6b7280', lineHeight: 1.6 }}>{String(content.hero.subtitle)}</p>
          </Copy>
        </section>

        <section style={{ marginBottom: 48 }}>
          <Copy field={content.about.heading}>
            <Markdown>{String(content.about.heading)}</Markdown>
          </Copy>
          <Copy field={content.about.body}>
            <div style={{ lineHeight: 1.7 }}>
              <Markdown>{String(content.about.body)}</Markdown>
            </div>
          </Copy>
        </section>

        <section style={{ marginBottom: 48 }}>
          <Copy field={content.features.heading}>
            <Markdown>{String(content.features.heading)}</Markdown>
          </Copy>
          <ul style={{ listStyle: 'disc', paddingLeft: 24, lineHeight: 2 }}>
            <li>
              <Copy field={content.features.item1}>
                <span>{String(content.features.item1)}</span>
              </Copy>
            </li>
            <li>
              <Copy field={content.features.item2}>
                <span>{String(content.features.item2)}</span>
              </Copy>
            </li>
            <li>
              <Copy field={content.features.item3}>
                <span>{String(content.features.item3)}</span>
              </Copy>
            </li>
          </ul>
        </section>
      </div>

      <CopyOverview />
    </>
  )
}

export async function getStaticProps() {
  const copyContent = getCopyContent('cms-test', defaults, { basePath })

  return {
    props: {
      copyContent,
    },
  }
}
