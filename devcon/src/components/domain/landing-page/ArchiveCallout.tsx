import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from 'components/common/link'
import { ctaPrimary } from 'components/common/cta'
import { sectionX, sectionInner, sectionHeading, eyebrow, bodyCopy } from 'components/common/styles'
import { Reveal } from 'components/common/reveal/Reveal'

const ARCHIVE_URL = 'https://archive.devcon.org/watch/?event=devcon8&sort=eventId&order=desc'

// Post-event pointer to the Devcon Archive, where the Devcon 8 recordings
// land next to every past edition. Transparent: sits on the page-level
// #fbfafc→#eaeefe wash between the photo marquee and the supporters band.
export const ArchiveCallout = () => {
  const t = useTranslations('home.archive')
  return (
    <div className={`${sectionX} py-[48px] sm:py-[64px]`}>
      <Reveal className={`${sectionInner} flex flex-col items-center gap-[16px] text-center`}>
        <p className={eyebrow}>{t('eyebrow')}</p>
        <h2 className={`${sectionHeading} max-w-[720px]`}>{t('heading')}</h2>
        <p className={`${bodyCopy} text-[#221144] max-w-[620px]`}>{t('body')}</p>
        <Link to={ARCHIVE_URL} className={`${ctaPrimary} mt-[8px]`}>
          {t('cta')}
          <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </Reveal>
    </div>
  )
}
