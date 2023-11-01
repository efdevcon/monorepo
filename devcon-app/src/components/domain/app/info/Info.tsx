import React, { useEffect, useState } from 'react'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'
import css from './info.module.scss'
import { AppNav } from 'components/domain/app/navigation'
import { Category } from 'types/Category'
import { FAQ } from 'types/FAQ'
import { ContentSections } from 'types/ContentSection'
import { ContentSectionRow } from 'components/common/sections/ContentSection'
import { Search } from 'components/common/filter/Filter'
import { Link } from 'components/common/link'
import { useRouter } from 'next/router'
import { PageIntroduction } from 'components/domain/app/home/Home'
import DevaSmallBackground from 'assets/images/deva-small-background.png'

type InfoProps = {
  faqs: Category[]
  cityGuideFaqs: FAQ[]
  sections: ContentSections
}

export const Info = (props: InfoProps) => {
  const router = useRouter()
  const [openFaq, setOpenFaq] = React.useState({} as { [key: string]: boolean })
  const anchor = router.asPath.split('#')[1]
  const [openTabs, setOpenTabs] = React.useState<any>(anchor ? { [anchor]: true } : {})
  const [search, setSearch] = useState('')
  const cityGuideSections = { ...props.sections }
  delete cityGuideSections['is-bogota-safe']
  delete cityGuideSections['registration-checkin']
  const safetySection = props.sections['is-bogota-safe']
  const registrationSection = props.sections['registration-checkin']
  const venueSection = props.sections['venue-guide']
  const foodSection = props.sections['food-drinks']

  const filteredFaq = search
    ? props.faqs.filter(category => {
        if (category.title.toLowerCase().includes(search.toLowerCase())) return true

        return category.questions.some(
          q => q.title.toLowerCase().includes(search) || q.body.toLowerCase().includes(search)
        )
      })
    : props.faqs

  function onSearch(nextVal: any) {
    setSearch(nextVal)

    if (!nextVal) {
      setOpenFaq({})
    } else {
      filteredFaq.forEach(category =>
        setOpenFaq(openFaq => {
          return {
            ...openFaq,
            [category.title]: true,
          }
        })
      )
    }
  }

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Information',
          },
        ]}
      />
      <div className="section">
        <PageIntroduction
          // title="Welcome to the Devcon Passport"
          bodyLeftTitle="Deva Help Desk"
          bodyLeftText="Hey there, I'm Deva your personal guide at Devcon Bogota! Below you can find all the information you are looking for related to having an amazing Devcon Experience."
          backgroundAlt="Devcon passport logo"
          background={DevaSmallBackground}
          ctaText="If you did not find particular information you are looking for feel free to tweet at me!"
          button={{
            text: '@EFDevcon',
            url: 'https://twitter.com/efdevcon',
          }}
        />

        <CollapsedSection /*className={css['no-border']}*/>
          <CollapsedSectionHeader styleOpened>
            <p className="app-header">FAQ</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <div className={css['filter']}>
              <Search className={css['search']} placeholder="Search FAQ" onChange={onSearch} value={search} />
            </div>
            <div className={`${css['faq']} clear-bottom`}>
              {filteredFaq.map(({ questions, title }) => {
                return (
                  <CollapsedSection
                    key={title}
                    // className={css['no-border']}
                    open={openFaq[title]}
                    setOpen={() => {
                      const isOpen = openFaq[title]
                      const nextOpenState = {
                        ...openFaq,
                        [title]: true,
                      }

                      if (isOpen) {
                        delete nextOpenState[title]
                      }

                      setOpenFaq(nextOpenState)
                    }}
                  >
                    <CollapsedSectionHeader styleOpened className={`${css['subheader']}`}>
                      <p className="font-sm-fixed bold">{title}</p>
                    </CollapsedSectionHeader>
                    <CollapsedSectionContent dontAnimate>
                      <div className={css['faq-inner']}>
                        {questions
                          .filter(q => q.title.toLowerCase().includes(search) || q.body.toLowerCase().includes(search))
                          .map(({ body, title }) => {
                            return (
                              <CollapsedSection key={title}>
                                <CollapsedSectionHeader styleOpened className={`${css['subheader']}`}>
                                  <p className="font-sm bold">{title}</p>
                                </CollapsedSectionHeader>
                                <CollapsedSectionContent className={css['faq-inner-content']}>
                                  <div
                                    className={`${css['markdown-body']} markdown font-sm clear-bottom-less`}
                                    dangerouslySetInnerHTML={{ __html: body }}
                                  />
                                </CollapsedSectionContent>
                              </CollapsedSection>
                            )
                          })}
                      </div>
                    </CollapsedSectionContent>
                  </CollapsedSection>
                )
              })}
            </div>
          </CollapsedSectionContent>
        </CollapsedSection>

        {Object.keys(props.sections).map(i => {
          const section = props.sections[i]

          if (section.body || section.data.left || section.data.right) {
            return (
              <CollapsedSection
                id={section.id}
                key={i}
                open={openTabs[i]}
                setOpen={() => {
                  const isOpen = openTabs[i]

                  const nextOpenState = {
                    ...openTabs,
                    [i]: true,
                  }

                  if (isOpen) {
                    delete nextOpenState[i]
                  }

                  setOpenTabs(nextOpenState)
                }}
              >
                <CollapsedSectionHeader styleOpened>
                  <p className="app-header">{section.title}</p>
                </CollapsedSectionHeader>
                <CollapsedSectionContent>
                  <ContentSectionRow className="clear-top-less" section={section} />
                </CollapsedSectionContent>
              </CollapsedSection>
            )
          }
        })}

        <CollapsedSection>
          <CollapsedSectionHeader styleOpened>
            <p className="app-header">App Feedback</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <p className={`${css['github']} clear-bottom clear-top-less`}>
              If you have any (technical) issues, feedback or questions about the App, please connect with us on{' '}
              <Link to="https://github.com/efdevcon/devcon-website/">Github</Link>.
            </p>
          </CollapsedSectionContent>
        </CollapsedSection>

        <Link
          to="https://devcon.org/en/code-of-conduct/"
          title="Code of Conduct"
          className={`${css['modal-link']} app-header`}
        >
          Code of Conduct
        </Link>
        <Link
          to="https://devcon.org/en/terms-of-service/"
          title="Terms of Service"
          className={`${css['modal-link']} app-header`}
        >
          Terms of Service
        </Link>
      </div>
    </>
  )
}
