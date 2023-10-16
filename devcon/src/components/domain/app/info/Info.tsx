import React from 'react'
import { Link, LinkList } from 'components/common/link'
import { CollapsedSection, CollapsedSectionContent, CollapsedSectionHeader } from 'components/common/collapsed-section'
import { Form, FormTextArea, FormInput, FormDropdown } from 'components/common/form'
import { Dropdown } from 'components/common/dropdown'
import { Button } from 'components/common/button'
import css from './info.module.scss'
import { AppNav } from 'components/domain/app/navigation'
import { Category } from 'types/Category'
import { CityGuideContent } from 'pages/bogota'
import { FAQ } from 'types/FAQ'

const ProvideFeedbackForm = () => {
  return (
    <Form
      className={css['feedback-form']}
      onSubmit={console.log}
      defaultValues={{ feedbackCategory: 'general-feedback', name: 'John Doe' }}
    >
      <FormDropdown
        fieldKey="feedbackCategory"
        defaultValue="general-feedback"
        options={[
          {
            text: 'General Feedback',
            value: 'general-feedback',
          },
          {
            text: 'Specific Backfeed',
            value: 'specific-backfeed',
          },
          {
            text: 'Something Else',
            value: 'something-else',
          },
        ]}
      />

      <FormInput fieldKey="name" placeholder="Name" fieldOptions={{ required: true }} />

      <FormInput fieldKey="email" placeholder="Email" fieldOptions={{ required: true }} />

      <FormTextArea fieldKey="message" placeholder="Message" fieldOptions={{ required: true }} />

      <Button className="red">Submit Feedback</Button>
    </Form>
  )
}

type InfoProps = {
  faqs: Category[]
  cityGuideFaqs: FAQ[]
}

export const Info = (props: InfoProps) => {
  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Information',
            to: '/app/info',
          },
        ]}
      />
      <div className="section">
        <CollapsedSection className={css['no-border']}>
          <CollapsedSectionHeader className="border-bottom">
            <p className="app-header">FAQ</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <div className={css['faq']}>
              {props.faqs.map(({ questions, title }) => {
                return (
                  <CollapsedSection key={title} className={css['no-border']}>
                    <CollapsedSectionHeader className={`${css['subheader']} border-bottom`}>
                      <p className="font-sm-fixed bold">{title}</p>
                    </CollapsedSectionHeader>
                    <CollapsedSectionContent>
                      <div className={css['faq-inner']}>
                        {questions.map(({ body, title }) => {
                          return (
                            <CollapsedSection key={title}>
                              <CollapsedSectionHeader className={`${css['subheader']}`}>
                                <p className="font-sm bold">{title}</p>
                              </CollapsedSectionHeader>
                              <CollapsedSectionContent className={css['faq-inner-content']}>
                                <div
                                  className="markdown font-sm clear-bottom-less"
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
        <CollapsedSection>
          <CollapsedSectionHeader>
            <p className="app-header">Registration / Check-in Info</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <p>
              Machine learning is being adopted more and more broadly in technology. Such success is largely due to a
              combination of algorithmic breakthroughs, computation resource improvements, and the access to a large
              amount of diverse training data. The collection of data can raise concerns about siloing, security, and
              user privacy.
            </p>

            <div className={css['links']}>
              <p className="bold">Additional Links</p>
              <LinkList>
                <Link to="https://devcon.org">EF Ecosystem Support Program</Link>
                <Link to="https://devcon.org">Grantee Roundup August 2021</Link>
                <Link to="https://devcon.org">Grantee Roundup July 2021</Link>
              </LinkList>
            </div>
          </CollapsedSectionContent>
        </CollapsedSection>
        <CollapsedSection>
          <CollapsedSectionHeader>
            <p className="app-header">City Guide</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <CityGuideContent {...props} faqs={props.cityGuideFaqs} insideApp />
          </CollapsedSectionContent>
        </CollapsedSection>
        <CollapsedSection>
          <CollapsedSectionHeader>
            <p className="app-header">Health and Safety Guides</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <p className="clear-bottom-less">Nothing here</p>
          </CollapsedSectionContent>
        </CollapsedSection>
        <CollapsedSection>
          <CollapsedSectionHeader>
            <p className="app-header">Venue Guide</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <p className="clear-bottom-less">Nothing here</p>
          </CollapsedSectionContent>
        </CollapsedSection>
        <CollapsedSection>
          <CollapsedSectionHeader>
            <p className="app-header">Local Guides</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <p className="clear-bottom-less">Nothing here</p>
          </CollapsedSectionContent>
        </CollapsedSection>
        <CollapsedSection>
          <CollapsedSectionHeader>
            <p className="app-header">Food & Drink</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <p className="clear-bottom-less">Nothing here</p>
          </CollapsedSectionContent>
        </CollapsedSection>
        {/* <CollapsedSection>
          <CollapsedSectionHeader>
            <p className="app-header">Provide Feedback</p>
          </CollapsedSectionHeader>
          <CollapsedSectionContent>
            <ProvideFeedbackForm />
          </CollapsedSectionContent>
        </CollapsedSection> */}
      </div>
    </>
  )
}
