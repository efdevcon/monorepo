import React from 'react'
import css from './legal.module.scss'

export const CodeOfConduct = () => {
  return (
    <div className={`${css['legal']} mb-8`}>
      <p className="font-xl bold">Code of Conduct</p>
      <p className="font-lg text-underline bold">TL;DR</p>
      <p>
        <b>Be excellent to each other</b>. If a participant is, in our sole discretion, harassing or otherwise
        unacceptably impacting other participants&apos; ability to enjoy Devcon, we at all times reserve the right to
        remove the offending person(s) from the event without refund.
      </p>
      <p className="font-lg text-underline bold">Don&apos;t Shill</p>
      <p>
        Devcon is designed for builders and developers -{' '}
        <i>
          <b>
            We aim to create a welcoming, collaborative space which allows for great networking opportunities. Please
            respect this space and the opportunity it affords by not aggressively shilling ICOs, investment
            opportunities, or financial products.
          </b>
        </i>{' '}
        If unsure, please ask the staff.
      </p>
      <p className="font-lg text-underline bold">Harassment Policy</p>
      <p>We do not condone any form of harassment against any participant, for any reason. </p>
      <p>
        {' '}
        Harassment includes, but is not limited to, any threatening, abusive, or insulting words, behavior, or
        communication (whether in person or online), whether relating to gender, sexual orientation, physical or mental
        ability, age, socioeconomic status, ethnicity, physical appearance, race, religion, sexual images, or otherwise.
        Harassment also includes hacking, deliberate intimidation, stalking, inappropriate physical contact, and
        unwelcome sexual attention.
      </p>
      <p>
        {' '}
        Participants asked to stop any harassing behavior must comply immediately. We reserve the right to respond to
        harassment in the manner we deem appropriate, including but not limited to expulsion without refund and referral
        to the relevant authorities.
      </p>
      <p>
        {' '}
        This Code of Conduct applies to everyone participating at Devcon - from attendees and exhibitors to speakers,
        press, volunteers, etc.
      </p>
      <p>
        {' '}
        Anyone can report harassment. If you were or are being harassed, notice that someone else was or is being
        harassed, or have any other concerns related to harassment, you can contact a Devcon volunteer or staff member,
        make a report at the registration desk or info booth, or submit a complaint to{' '}
        <a className="generic hover-underline" href="mailto:support@devcon.org">
          support@devcon.org
        </a>
        .
      </p>
      <p className="font-lg text-underline bold">Approved Swag Only</p>
      <p>
        <b>
          Only pre-approved teams are authorized to distribute swag (clothing, sales, freebies, or any form of
          promotional material) at Devcon!
        </b>{' '}
        Examples of permitted groups include the Devcon team, and some of the other pre-approved event organizers.
        Please respect this decision. If you are unsure of whether you are allowed to distribute your swag, ask the
        friendly staff!
      </p>
      <p className="font-lg text-underline bold">Wifi Etiquette</p>
      <p>We want all attendees to be able to enjoy fast, reliable WiFi. As such, please keep the following in mind:</p>
      <ul>
        <li>
          <i>No ARP storms</i>
        </li>
        <li>
          <i>No Private WiFi access points</i>
        </li>
        <li>
          <i>No Private DHCP servers</i>
        </li>
      </ul>
      <p className="font-lg text-underline bold">Media Policy</p>
      <p>
        At Devcon we aim to respect the privacy of our attendees. It is important for you to review the Devcon Media
        Policy and to ensure you understand and follow it.
      </p>{' '}
      <p className="font-lg text-underline bold">Be Respectful to Speakers (and audiences)</p>
      <p>
        Be mindful of your volume when you&apos;re in or near event venues. Noise levels can quickly get out of control
        and become disruptive to the programme going on inside! Please respect the speakers and participants if you are
        arriving late to an event and/or getting up to leave an event early — try to cause as little disruption as
        possible.
      </p>
      <p className="font-lg text-underline bold">Local Laws</p>
      <p>
        You must comply with all venue and facility rules and regulations during your participation in Devcon, including
        all safety instructions and requirements. It is also very important to note that <b>ALL</b> attendees are
        expected to conform to <b>ALL</b> local laws, including Covid-19 restrictions and policies imposed by the venue,
        facility, and/or local authorities.
      </p>
      <p className="font-lg text-underline bold">How to Report</p>
      <p>
        If you notice any violations of this Code of Conduct please report them to{' '}
        <a className="generic hover-underline" href="mailto:support@devcon.org">
          support@devcon.org
        </a>
        .
      </p>
      <p className="font-lg text-underline bold">Remember</p>
      <p className="bold">
        Devcon is what you make of it, and as a community we can create a safe, meaningful, and incredible experience
        for everyone! 🦄
      </p>
    </div>
  )
}

// Section title — bold uppercase heading, rendered inline with the auto-
// numbered marker so each section reads as "1. PREAMBLE", "2. ADMITTANCE", etc.
const SectionTitle = ({ children }: { children: React.ReactNode }) => <b className="font-lg">{children}</b>

export const TermsOfService = () => {
  return (
    <div className={`${css['legal']} mb-8`}>
      <p className="font-xl bold">DEVCON 8 TICKET SALE TERMS AND CONDITIONS</p>

      <p className="font-xl bold">
        PLEASE READ THESE TERMS AND CONDITIONS BEFORE FINALISING YOUR PURCHASE OF TICKETS FOR DEVCON 8
      </p>

      <p>
        The Ethereum Foundation will host Devcon 8 in Mumbai, India from 3 to 6 November 2026 (
        <b>&ldquo;Devcon&rdquo;</b>).
      </p>

      <p>
        This agreement (<b>&ldquo;Agreement&rdquo;</b>) is made by and between Stiftung Ethereum, a Swiss Foundation
        located at Zeughausgasse 7a, 6300 Zug, Switzerland (<b>&ldquo;We&rdquo;</b> or <b>&ldquo;Us&rdquo;</b>), and
        participants in Devcon, including, but not limited to, persons purchasing tickets for Devcon, attendees,
        speakers, supporters, sponsors, exhibitors, and volunteers (<b>&ldquo;You&rdquo;</b>, and together with Us, the{' '}
        <b>&ldquo;Parties&rdquo;</b>).
      </p>

      <p>This Agreement includes and incorporates by reference:</p>

      <ul>
        <li>
          <a className="generic hover-underline" href="https://devcon.org/privacy-notice/">The Devcon 8 Privacy Notice</a>;
        </li>
        <li>
          <a className="generic hover-underline" href="https://ethereum.org/terms-of-use/">The Website Terms of Use</a>;
        </li>
        <li>
          <a className="generic hover-underline" href="https://ethereum.org/privacy-policy/">The Privacy Policy</a>;
        </li>
        <li>
          <a className="generic hover-underline" href="https://ethereum.org/cookie-policy/">The Cookie Policy</a>;
        </li>
        <li>
          <a className="generic hover-underline" href="https://devcon.org/code-of-conduct/">The Attendee Code of Conduct</a>; and
        </li>
        <li>
          <a className="generic hover-underline" href="https://docs.google.com/document/d/18zUyAaCU3ECt7tNEfuaQIyy7-nItP-3GosroivC2AME/edit?tab=t.0">
            The Attendee Media Policy
          </a>{' '}
          and{' '}
          <a className="generic hover-underline" href="https://docs.google.com/document/d/1HEgags68dJOa-mJjzZ93bKBJ9Z19OIsHXxqdqanbzCA/edit?tab=t.0">
            Media Code of Conduct
          </a>
          .
        </li>
      </ul>

      <p>
        Devcon is intended to be an educational and collaborative conference. The purpose of this Agreement is to ensure
        that Devcon is and remains a high quality, meaningful, and safe conference for all organisers and participants
        as well as the broader Ethereum ecosystem.
      </p>

      <ol>
        <li>
          <SectionTitle>PREAMBLE</SectionTitle>
          <ol>
            <li>
              This Agreement sets out the terms and conditions for purchasing tickets to, admittance to, attending,
              and/or participating in Devcon.
            </li>
            <li>
              Please read these terms and conditions carefully before You submit Your order to Us. These terms and
              conditions explain the terms of purchasing tickets to, admittance to, attending, and otherwise
              participating in Devcon, including, but not limited to, prohibited activities, intellectual property
              rights, control of credentials issued by Us, how You and We may change or end the contract, and other
              important information.
            </li>
            <li>
              Our acceptance of Your order will take place when You receive a confirmation receipt that Your order has
              been successfully completed, at which point the Agreement will come into existence between You and Us.
            </li>
            <li>
              You may contact Us at <a className="generic hover-underline" href="mailto:support@devcon.org">support@devcon.org</a>. If We have to contact
              You, We will do so by the email You have provided to Us.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>ADMITTANCE</SectionTitle>
          <ol>
            <li>
              Your ticket entitles You to valid credentials issued by Us (the <b>&ldquo;Wristband&rdquo;</b>), which
              allow You admittance to Devcon. You are responsible for checking in at Devcon with proof of a valid ticket
              to receive Your Wristband. <b>No one will be admitted to Devcon without a Wristband.</b>
            </li>
            <li>
              Any and all other costs, arrangements, and legal requirements arising out of or relating to Your
              attendance of Devcon are solely Your responsibility. This includes, but is not limited to, passports,
              visas, entry permits, security clearances, health requirements, travel documents, insurance, transport,
              accommodation, and all related needs and expenses. We do not provide immigration, visa, travel, tax,
              legal, or other professional advice. Any information, letter, acknowledgement, confirmation, or other
              document that We may provide in connection with Devcon is provided for administrative convenience only and
              does not guarantee that You will receive a visa, be allowed to board any transport, be allowed to enter
              the country in which Devcon is held, or be allowed to remain in that country. We shall bear no liability
              if You fail to make the appropriate arrangements, obtain the wrong visa or entry permission, are denied a
              visa, are refused boarding or entry, are removed or required to leave the country in which Devcon is held,
              or are otherwise unable to attend Devcon.
            </li>
            <li>
              We reserve the right, in Our sole discretion and without refund or other liability, to refuse admittance
              to, remove, expel, suspend, or ban anyone from present or future events:
              <ol className={css.lettered}>
                <li>For health, safety, security, legal, or regulatory concerns;</li>
                <li>Who is under 18 years old and has not received prior written approval from Us;</li>
                <li>
                  Who breaches the terms under this Agreement, including the rules and policies incorporated by
                  reference herein;
                </li>
                <li>
                  Who is determined by Us to have behaved in a manner that is harassing, threatening, abusive,
                  insulting, intimidating, unsafe, disruptive, or unlawful, or that otherwise unacceptably impacts other
                  participants&rsquo; ability to enjoy Devcon, including any conduct contrary to the Attendee Code of
                  Conduct;
                </li>
                <li>
                  Who is determined by Us to have engaged in any unlawful, fraudulent, deceptive, non-compliant, or
                  unauthorised activity, including any unlawful solicitation, sale, marketing, fundraising, token sale,
                  securities-related activity, financial promotion, investment activity, or other regulated activity;
                </li>
                <li>
                  Who interferes with, or is determined by Us to have interfered with, the administration, security, or
                  enjoyment of Devcon; and/or
                </li>
                <li>
                  Who fails to comply with any instruction or requirement issued by Us, the venue, service providers,
                  security personnel, or applicable authorities.
                </li>
              </ol>
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>AGE LIMITATIONS</SectionTitle>
          <ol>
            <li>
              You must be 18 years of age or older to purchase a ticket to, attend, or participate in Devcon. By
              purchasing a ticket, You represent and warrant that You are 18 years of age or older, not barred from
              attending Devcon under the laws of the applicable jurisdiction, have the capacity to purchase a ticket,
              attend, and participate in Devcon, and have purchased a ticket for Your own attendance of and
              participation in Devcon.
            </li>
            <li>
              If You are under the age of 18 and wish to attend Devcon, please reach out to us at{' '}
              <a className="generic hover-underline" href="mailto:support@devcon.org">support@devcon.org</a> before purchasing a ticket.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>WRISTBAND CONTROL</SectionTitle>
          <ol>
            <li>
              <b>You must produce a valid Wristband to be admitted to and/or attend Devcon.</b> The Wristband must be
              worn and displayed prominently at all times while at Devcon or designated off-site activities.{' '}
              <b>You are responsible for the safekeeping of the Wristband during Devcon.</b>
            </li>
            <li>
              Tickets, order confirmations, Wristbands, QR codes, badges, passes, and any other credentials issued by Us
              are personal revocable licences issued to You and shall at all times remain the sole property of Us. They
              do not confer any property right, entitlement, or guaranteed right of admission. Wristbands and other
              credentials must be surrendered to Us or Our representatives upon demand. For the avoidance of doubt, the
              licence is personal to You and is non-transferable.
            </li>
            <li>
              False certification, misuse of a Wristband, or any other method or device used to assist unauthorised
              personnel to gain admittance to Devcon will be just cause for: (a) denying entry to and expelling You and
              any other persons involved from Devcon without any obligation on Our part to refund any fees; and (b)
              banning You and any other persons involved from present and future events.
            </li>
            <li>
              Your Wristband may be invalidated if any part of it is removed, altered, or defaced. We will not be
              responsible for any Wristband that is invalidated, lost, stolen, or destroyed.
            </li>
            <li>
              If Your Wristband is lost, stolen, damaged, destroyed, or otherwise invalidated, We may, in Our sole
              discretion, issue You a replacement Wristband subject to verification checks and payment of any
              applicable replacement fee. We may refuse to issue a replacement Wristband if We are not satisfied that
              You are the valid ticket holder, or if We suspect misuse, transfer, attempted transfer, fraud,
              unauthorised access, or any other breach of this Agreement. Any replacement Wristband may invalidate
              the original Wristband.
            </li>
            <li>
              Tickets, Wristbands, and other credentials may not be sold, resold, transferred, assigned, or otherwise
              made available to any other person without Our prior written permission. Any unauthorised transfer or
              attempted transfer may result in cancellation without refund.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>PROHIBITED ACTIVITIES</SectionTitle>
          <ol>
            <li>
              Devcon is an educational conference. You understand and agree that Devcon is not a sales conference,
              employment job fair, investment conference, fundraising venue, financial promotion venue, or other type of
              conference. As such, solicitation, sales, marketing, promotions, offers to sell, fundraising, token sales,
              announcements of ICOs, crowdsales, securities-related activities, financial promotions,
              &ldquo;suitcasing&rdquo;, and outboarding are all prohibited at Devcon. Any activities including, but not
              limited to, marketing, promoting, offering to sell, selling, or soliciting investments, financial
              products, securities, or other regulated products or services are also strictly prohibited.
              &ldquo;Suitcasing&rdquo; refers to the practice of &ldquo;working the aisles&rdquo; of an event from a
              suitcase or briefcase, soliciting business from other attendees and participants.
            </li>
            <li>
              We reserve the right to deny entrance to or expel any person from Devcon who is determined by Us to have
              engaged in any unlawful, fraudulent, deceptive, non-compliant, or unauthorised activity at or in
              connection with Devcon. This includes, but is not limited to, any unlawful or non-compliant solicitation,
              sale, marketing, fundraising, securities-related activity, financial promotion, investment activity, or
              other regulated activity.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>CHANGES TO THE EVENT</SectionTitle>
          <ol>
            <li>
              Devcon is subject to the needs and requirements of, without limitation, the venue, location, local
              authorities, attendees, speakers, sponsors, administration, safety, security, legal compliance, and
              operations. You understand and agree that We may at Our sole discretion alter, restrict, postpone,
              reschedule, or cancel any aspect of Devcon, including, but not limited to, the content, programme, format,
              sessions, speakers, moderators, venue, rooms, capacity, access rules, health or safety requirements,
              dates, and timings without notice and without refund, except where required by applicable law or expressly
              decided by Us.
            </li>
            <li>
              In addition to the requirements and prohibitions set forth in this Agreement, We may at Our sole
              discretion also exclude any person from purchasing a ticket. We also reserve the right to cancel, at Our
              sole discretion, any ticket upon refund of the fee paid to Us, provided, however, that if any ticket is
              cancelled for violating any of the terms set out in this Agreement, no refund will be made.
            </li>
            <li>
              We may implement safety measures, such as those relating to the COVID-19 pandemic, including those as
              mandated by local law, instructed by local authorities, or required by the venue or service providers.
              Compliance with such measures, and applicable consents from You, may be mandatory for the purchase of
              tickets to, admittance to, attendance of, or participation in Devcon.
            </li>
            <li>
              We may amend, supplement, replace, or issue additional policies, rules, guidelines, instructions, or
              requirements relating to Devcon at any time, including for legal, regulatory, safety, security,
              operational, venue, community, or administrative reasons. Compliance with such policies, rules,
              guidelines, instructions, and requirements may be mandatory for the purchase of tickets to, admittance to,
              attendance of, or participation in Devcon.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>CANCELLATION POLICY</SectionTitle>
          <ol>
            <li>
              <b>There are no guaranteed refunds for ticket cancellations.</b> We will consider exceptions on a
              case-by-case basis upon Your written request to <a className="generic hover-underline" href="mailto:support@devcon.org">support@devcon.org</a>{' '}
              prior to the first day of Devcon. Any refunds are limited to a maximum amount of the price paid by You to
              Us.
            </li>
            <li>
              If a refund request is approved for a ticket paid for in cryptocurrency, the refund will be made in the
              same cryptocurrency and You will be responsible for paying the gas fees of the transaction of the refund.
              Such gas fees will be deducted from the refund amount.
            </li>
            <li>
              Please remember that cancelling Your ticket or sponsorship does not automatically cancel Your hotel,
              travel, visa, transport, or other arrangements. You are responsible for Your own hotel, travel, visa,
              transport, insurance, and other plans including, but not limited to, all costs, expenses, and fees
              associated with the cancellation, change, failure, or inability to use such arrangements.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>PRESENTATIONS, VIEWS AND MATERIALS</SectionTitle>
          <ol>
            <li>
              The views expressed by any Devcon attendee, speaker, sponsor, supporter, exhibitor, or other participant
              should not be taken as those of the Ethereum Foundation. All Devcon attendees, speakers, sponsors,
              supporters, exhibitors, and other participants are solely responsible for the content of any and all of
              their own presentations, publications, statements, activities, and related materials. The presence of any
              person, project, protocol, product, service, or other initiative at Devcon does not constitute Our
              endorsement, recommendation, approval, verification, or support of that person, project, protocol,
              product, service, or initiative.
            </li>
            <li>
              As Devcon is an educational conference, none of the presentations, publications, statements, activities,
              and related materials at or in connection with Devcon should be taken as investment, financial, trading,
              tax, legal, regulatory, accounting, or other professional advice, or as any offer, solicitation,
              recommendation, inducement, or promotion to buy, sell, subscribe for, hold, or otherwise deal in any
              investment, security, token, cryptoasset, financial product, or regulated product or service.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>PHOTOGRAPHY, RECORDING, LIVE STREAMING, AND VIDEO RECORDING</SectionTitle>
          <ol>
            <li>
              We reserve the right to use images or videos taken at Devcon for present and future marketing materials,
              including images that may bear Your image or likeness. If You do not wish to appear in media images or
              videos at Devcon, please refer to the Attendee Media Policy.
            </li>
            <li>
              You may not record, stream, or otherwise broadcast audio or video of any and all sessions at Devcon. We
              allow cameras and photography at Devcon; however, professional video recording is strictly prohibited and
              anyone doing so may be immediately escorted out of the venue and may be asked to surrender his or her
              Wristband without refund. You are responsible for compliance with all applicable intellectual property,
              privacy and publicity laws, rules, and regulations.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>INTELLECTUAL PROPERTY</SectionTitle>
          <ol>
            <li>
              All intellectual property (including works of authorship, copyrights, inventions, patents, trademarks,
              personality rights, and moral rights) owned or licensed by anyone prior to Devcon, including, but not
              limited to, Us and the Parties presenting at Devcon, shall remain with that party.
            </li>
            <li>
              You may not use or reproduce, or allow anyone else to use or reproduce, any trademarks relating to the
              Ethereum Foundation, including, but not limited to, the wordmark &ldquo;Ethereum Foundation&rdquo;, in any
              Devcon content or in any materials distributed at or in connection with Devcon for any reason without Our
              prior written permission.
            </li>
            <li>
              For the avoidance of doubt, nothing in this Agreement shall be deemed to vest in You any legal or
              beneficial right in or to any intellectual property owned or licensed by Us or any of the Parties
              presenting at Devcon, all of which shall at all times remain the exclusive property of Us or the
              respective Parties presenting at Devcon.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>PRIVACY &amp; DATA PROTECTION</SectionTitle>
          <ol>
            <li>
              We may process your name, contact data, and other personal data relating to your ticket purchase and
              attendance at Devcon 8 (<b>&ldquo;Devcon&rdquo;</b>) (together, <b>&ldquo;Data&rdquo;</b>) for the
              purposes and in the course of Devcon.
            </li>
            <li>
              You have to purchase tickets to Devcon on the Pretix platform. The operator of the Pretix platform,
              rami.io GmbH, Berthold-Mogel-Straße 1, 69126 Heidelberg, Germany, is our data processor. Your Data will be
              stored by the data processor in Germany. Your Data may in addition be stored on our servers in the EU. We,
              as your data controller, apply appropriate technical and organisational measures designed to protect your
              Data.
            </li>
            <li>
              In some cases, you may have the option to verify your eligibility for a particular ticket category or
              discount through the SELF app or other similar third-party verification services operated by independent
              providers (<b>&ldquo;Verification Providers&rdquo;</b>). Where you do so, the relevant Verification
              Provider may process your Data as an independent controller in connection with that verification process.
              That verification process takes place outside our systems and we do not control the Verification
              Provider&rsquo;s processing of your Data. For more information about how the relevant Verification
              Provider may process your Data, please review that provider&rsquo;s privacy notice.
            </li>
            <li>
              Where you use a Verification Provider for verification, we may receive from that Verification Provider a
              cryptographic proof or verification result confirming that specified eligibility criteria have been met in
              relation to the relevant email address, ticket purchase, or ticket holder. We do not receive or store the
              underlying identity document, identity document number, or other underlying document data used by the
              Verification Provider to generate that proof or verification result.
            </li>
            <li>
              If you have purchased a ticket to Devcon, you may request a ticket purchase confirmation letter from us.
              If you do so, we may ask you to provide additional Data, including your full name, contact details,
              identity document, proof of address, ticket purchase information, and other information reasonably
              required to verify your identity, confirm your ticket purchase, conduct appropriate checks, and prepare
              the letter. Where you do so, we may use third-party service providers to conduct identity verification,
              sanctions screening, or similar checks in connection with your request. Such providers may process your
              Data as our processors or as independent controllers, depending on the relevant service and provider.
              Where a provider acts as an independent controller, its processing of your Data will be subject to its own
              privacy notice.
            </li>
            <li>
              We process your Data for the following purposes: (a) ticket purchase; (b) verification that you are the
              holder of the ticket; (c) administration of ticket categories, discounts, and eligibility criteria; (d)
              fraud prevention and protection against misuse of tickets or discounts; (e) processing ticket purchase
              confirmation letter requests; and (f) Devcon registration, check-in, admittance, participation, safety,
              security, and administration.
            </li>
            <li>
              You are under no obligation to provide us with your Data. However, if you do not do so, you may not be
              able to purchase a ticket, attend or otherwise participate in Devcon, access particular ticket types or
              discounts, or receive a ticket purchase confirmation letter. Should the provision of your Data be
              mandatory by law, we will inform you separately thereof.
            </li>
            <li>
              We process your Data for the performance of our contract with you insofar as such processing is necessary
              for ticket purchase, ticket administration, and attendance at Devcon, and otherwise on the basis of our
              overriding legitimate interest in achieving the purposes set out above, in accordance with Article
              6(1)(b), Article 6(1)(f), and, where applicable, Article 6(1)(c) of the General Data Protection Regulation
              (<b>&ldquo;GDPR&rdquo;</b>).
            </li>
            <li>
              To achieve the purposes set out above, some of your Data may be transferred to the following categories of
              recipients:
              <ol className={css.lettered}>
                <li>IT service providers that we may use, such as Pretix;</li>
                <li>
                  Third-party Verification Providers, such as SELF or other similar services, which may process personal
                  data as independent controllers;
                </li>
                <li>Identity verification, sanctions screening, or similar service providers; and</li>
                <li>
                  Courts, regulators, law enforcement authorities, or other third parties where such disclosure is
                  required by applicable law, regulation, or legal process, or is necessary for the establishment,
                  exercise, or defence of legal claims.
                </li>
              </ol>
            </li>
            <li>
              Some of the recipients referred to above may be located in and/or process personal data outside of your
              home country. The level of data protection in another country may not be equivalent to that in your home
              country. However, we only transfer your Data to countries which the EU Commission has determined to have
              an adequate level of data protection, or we may take measures to ensure that all recipients provide an
              adequate level of data protection. We may do this, for example, by entering into appropriate data transfer
              agreements based on Standard Contractual Clauses (2021/914/EC).
            </li>
            <li>
              We may retain your Data for as long as: (a) required under statutory retention obligations; and/or (b) for
              potential legal claims, where personal data is needed to raise or defend a claim, and such claims are not
              yet time-barred.
            </li>
            <li>
              Under the applicable law, you have the right to (under the conditions set out in applicable law):
              <ol className={css.lettered}>
                <li>
                  Obtain confirmation as to whether and what kind of personal data we store about you and to request
                  copies of such data;
                </li>
                <li>Request rectification or erasure of your personal data;</li>
                <li>Request us to restrict the processing of your personal data;</li>
                <li>Object to the processing of your personal data;</li>
                <li>Request data portability; and</li>
                <li>Lodge a complaint with the competent supervisory authority.</li>
              </ol>
            </li>
            <li>
              Please address your requests or questions concerning the processing of your personal data to:
              <p className="mt-2">
                Stiftung Ethereum (Foundation Ethereum)
                <br />
                Zeughausgasse 7a, 6300 Zug, Switzerland
                <br />
                Email: <a className="generic hover-underline" href="mailto:notices@ethereum.org">notices@ethereum.org</a>
              </p>
            </li>
            <li>
              Our representative in the EU according to Article 27 GDPR is:
              <p className="mt-2">
                Ethereum Dev GmbH
                <br />
                Oranienstrasse 6, 10997 Berlin, Germany
                <br />
                Email: <a className="generic hover-underline" href="mailto:notices@ethereum.org">notices@ethereum.org</a>
              </p>
            </li>
            <li>
              We may amend this privacy notice from time to time. Any updated version of this privacy notice will be
              made available through the relevant Devcon or event channels.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>FORCE MAJEURE</SectionTitle>
          <p className="mt-2">
            We shall not be held responsible for any delay or failure in the performance of Our obligations under this
            Agreement to the extent that such delay or failure is caused by any event, circumstance, or cause beyond Our
            reasonable control, including, but not limited to, fire, flood, earthquakes, strike, civil, governmental, or
            military authority, acts of God, acts of terrorism, acts of war, disease, epidemics or pandemics, blackouts,
            insurrections, riots, civil disturbances, electrical disruptions, third-party injunctions, the
            unavailability of all or part of the venue, or any other event, circumstance, or cause that makes it
            illegal, impossible, or impracticable for Devcon, or any part of Devcon, to be held, operated, or made
            available as planned. For one or more of such reasons, We may postpone, reschedule, relocate, modify,
            restrict, or cancel any part of or the entirety of Devcon without liability on Our part. In the event any
            part of or the entirety of Devcon cannot be held, operated, or made available as planned, or is postponed,
            rescheduled, relocated, modified, restricted, or cancelled pursuant to this section, We shall not be liable
            to You for any incidental, consequential, special, direct, or indirect damages, costs, or losses incurred,
            including, but not limited to, transportation costs, accommodation costs, visa costs, insurance costs, or
            financial losses. We will review refund or fee transfer requests submitted in writing on a case-by-case
            basis.
          </p>
        </li>

        <li>
          <SectionTitle>DISCLAIMER &amp; LIMITATION OF LIABILITY</SectionTitle>
          <ol>
            <li>
              We give no warranties in respect of any aspect of Devcon or any materials relating to or offered at Devcon
              and, to the fullest extent possible under the laws governing this Agreement, disclaim all implied
              warranties, including but not limited to warranties of fitness for a particular purpose, accuracy,
              timeliness, or merchantability. Devcon is provided on an &ldquo;as-is&rdquo; basis. Neither We nor Our
              affiliates accept any responsibility or liability for reliance by You or any person on any aspect of
              Devcon or any information provided at Devcon. Some jurisdictions do not allow exclusion of warranties or
              limitations on the duration of implied warranties, so the above disclaimer may not apply to You in its
              entirety, but will apply to the maximum extent permitted by the applicable law.
            </li>
            <li>
              Except as required by law, neither We nor Our affiliates shall be liable for any direct, indirect,
              special, incidental, or consequential costs, damages, or losses arising directly or indirectly from Devcon
              or any other aspect related thereto or in connection with this Agreement.
            </li>
            <li>
              Our maximum aggregate liability for any claim in any way connected with or arising from Devcon or this
              Agreement, whether in contract, tort, or otherwise (including any negligent act or omission) shall be
              limited to the amount paid by You to Us under this Agreement. The foregoing does not affect any liability
              which cannot be excluded or limited under applicable law.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>INDEMNIFICATION</SectionTitle>
          <p className="mt-2">
            You shall indemnify Us and hold Us harmless, together with Our respective directors, officers, council
            members, agents, employees, contractors, representatives, volunteers, and service providers (collectively,{' '}
            <b>&ldquo;Indemnitees&rdquo;</b>), from and against any and all claims, suits, causes of action, damages,
            losses, liabilities, costs, and expenses (including, but not limited to, reasonable attorneys&rsquo; fees
            and court costs) of any kind whatsoever (collectively, <b>&ldquo;Claims&rdquo;</b>) arising out of or in
            connection with Your or Your agents&rsquo;, employees&rsquo;, guests&rsquo;, assigns&rsquo;, or
            transferees&rsquo;: (a) admittance to, attendance of, or participation in Devcon; (b) purchase of tickets;
            (c) use of the Wristband; (d) breach of this Agreement; or (e) act or omission, neglect, or wrongdoing. You
            shall, at Your sole cost and expense, defend (with counsel acceptable to the Indemnitees) the Indemnitees
            against any and all such Claims. You and all persons using a Wristband, attending, accessing, or otherwise
            participating in Devcon assume all risk and danger of personal injury, death, and all other hazards and
            losses, both personal and property, arising from or related in any way to Devcon, whether occurring prior
            to, during, or after Devcon, and You hereby release the Indemnitees from any such claims or injuries to the
            extent permissible by applicable law. This section shall survive the termination or expiration of this
            Agreement.
          </p>
        </li>

        <li>
          <SectionTitle>COMPLIANCE WITH LAWS</SectionTitle>
          <ol>
            <li>You are solely responsible for all personal property You bring to Devcon.</li>
            <li>
              By purchasing tickets to Devcon, You agree to comply with the terms of this Agreement, including all the
              rules and policies incorporated herein. You further agree to comply with all applicable laws, rules,
              ordinances, regulations, sanctions, export controls, immigration requirements, and other legal
              requirements that apply to You or to Your purchase of tickets to, attendance of, or participation in
              Devcon. You also agree to comply with any policies, instructions, or requirements issued from time to time
              by Us, the venue, service providers, security personnel, or applicable authorities.
            </li>
            <li>
              You agree that Your purchase of tickets to, attendance of, and participation in Devcon will not be for any
              unlawful purpose and will not violate, cause Us to violate, or assist in the violation of, any law,
              statute, ordinance, regulation, sanctions program, export control, anti-money laundering law, anti-bribery
              law, anti-corruption law, counter-terrorism financing law, immigration requirement, or other legal
              restriction applicable to You, Us, Devcon, the venue, payment providers, service providers, or the
              relevant transaction.
            </li>
            <li>
              To the extent permissible by law, You and Your representatives waive any rights and claims for damages
              arising out of or relating to the enforcement of the Wristband control restrictions, the prohibited
              activities restrictions, the video restrictions, and the other restrictions expressly set forth in this
              Agreement.
            </li>
            <li>
              We may require identity verification, age verification, ticket verification, security screening, or other
              checks as a condition of ticket purchase, registration, check-in, admittance to, attendance of, or
              participation in Devcon. Failure or refusal to complete any such checks may result in refusal of
              admittance, expulsion, cancellation of Your ticket, or revocation of Your Wristband or other credentials
              without refund.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>WAIVER AND SEVERABILITY</SectionTitle>
          <ol>
            <li>
              No waiver by Us of any term or condition set out in the Agreement shall be deemed a further or continuing
              waiver of such term or condition or a waiver of any other term or condition, and any failure of Us to
              assert a right or provision under the Agreement shall not constitute a waiver of such right or provision.
            </li>
            <li>
              If any provision of the Agreement is held by a court or other tribunal of competent jurisdiction to be
              invalid, illegal, or unenforceable for any reason, such provision shall be eliminated or limited to the
              minimum extent such that the remaining provisions of the Agreement will continue in full force and effect.
            </li>
          </ol>
        </li>

        <li>
          <SectionTitle>GOVERNING LAW</SectionTitle>
          <p className="mt-2">
            This Agreement and all matters relating to Devcon shall be governed by and construed in accordance with the
            laws of Switzerland (excluding treaties or International Conventions such as the UN Convention on Contracts
            for the International Sale of Goods) without regard for conflicts of laws principles.
          </p>
        </li>

        <li>
          <SectionTitle>DISPUTE RESOLUTION</SectionTitle>
          <p className="mt-2">
            Any dispute, controversy, or claim arising out of or relating to this Agreement, including the validity,
            invalidity, breach, or termination thereof, shall be resolved by arbitration in accordance with the Swiss
            Rules of International Arbitration of the Swiss Chambers&rsquo; Arbitration Institution in force on the date
            on which the Notice of Arbitration is submitted in accordance with these Rules. The number of arbitrators
            shall be one. The seat of the arbitration shall be Zurich unless the parties agree on a different seat. The
            arbitral proceedings shall be conducted in English.
          </p>
        </li>

        <li>
          <SectionTitle>ENTIRE AGREEMENT</SectionTitle>
          <p className="mt-2">
            The Agreement, including the documents incorporated by reference, constitutes the sole and entire agreement
            between You and Us with respect to Your purchase of tickets to, admittance to, attendance of, or
            participation in Devcon and supersedes all prior and contemporaneous understandings, agreements,
            representations and warranties, both written and oral, with respect to the same. Each Party agrees that it
            has not entered into the Agreement in reliance on, and shall have no remedy in respect of, any statement,
            representation, covenant, warranty, undertaking, or indemnity by any person other than as expressly set out
            in the Agreement.
          </p>
        </li>
      </ol>
    </div>
  )
}

export const PrivacyNotice = () => {
  return (
    <div className={`${css['legal']} mb-8`}>
      <p className="font-xl bold">DEVCON 8 PRIVACY NOTICE</p>

      <ol>
        <li>
          We may process your name, contact data, and other personal data relating to your ticket purchase and
          attendance at Devcon 8 (<b>&ldquo;Devcon&rdquo;</b>) (together, <b>&ldquo;Data&rdquo;</b>) for the purposes
          and in the course of Devcon.
        </li>
        <li>
          You have to purchase tickets to Devcon on the Pretix platform. The operator of the Pretix platform, rami.io
          GmbH, Berthold-Mogel-Straße 1, 69126 Heidelberg, Germany, is our data processor. Your Data will be stored by
          the data processor in Germany. Your Data may in addition be stored on our servers in the EU. We, as your data
          controller, apply appropriate technical and organisational measures designed to protect your Data.
        </li>
        <li>
          In some cases, you may have the option to verify your eligibility for a particular ticket category or discount
          through the SELF app or other similar third-party verification services operated by independent providers (
          <b>&ldquo;Verification Providers&rdquo;</b>). Where you do so, the relevant Verification Provider may process
          your Data as an independent controller in connection with that verification process. That verification process
          takes place outside our systems and we do not control the Verification Provider&rsquo;s processing of your
          Data. For more information about how the relevant Verification Provider may process your Data, please review
          that provider&rsquo;s privacy notice.
        </li>
        <li>
          Where you use a Verification Provider for verification, we may receive from that Verification Provider a
          cryptographic proof or verification result confirming that specified eligibility criteria have been met in
          relation to the relevant email address, ticket purchase, or ticket holder. We do not receive or store the
          underlying identity document, identity document number, or other underlying document data used by the
          Verification Provider to generate that proof or verification result.
        </li>
        <li>
          If you have purchased a ticket to Devcon, you may request a ticket purchase confirmation letter from us. If
          you do so, we may ask you to provide additional Data, including your full name, contact details, identity
          document, proof of address, ticket purchase information, and other information reasonably required to verify
          your identity, confirm your ticket purchase, conduct appropriate checks, and prepare the letter. Where you do
          so, we may use third-party service providers to conduct identity verification, sanctions screening, or similar
          checks in connection with your request. Such providers may process your Data as our processors or as
          independent controllers, depending on the relevant service and provider. Where a provider acts as an
          independent controller, its processing of your Data will be subject to its own privacy notice.
        </li>
        <li>
          We process your Data for the following purposes: (a) ticket purchase; (b) verification that you are the holder
          of the ticket; (c) administration of ticket categories, discounts, and eligibility criteria; (d) fraud
          prevention and protection against misuse of tickets or discounts; (e) processing ticket purchase confirmation
          letter requests; and (f) Devcon registration, check-in, admittance, participation, safety, security, and
          administration.
        </li>
        <li>
          You are under no obligation to provide us with your Data. However, if you do not do so, you may not be able to
          purchase a ticket, attend or otherwise participate in Devcon, access particular ticket types or discounts, or
          receive a ticket purchase confirmation letter. Should the provision of your Data be mandatory by law, we will
          inform you separately thereof.
        </li>
        <li>
          We process your Data for the performance of our contract with you insofar as such processing is necessary for
          ticket purchase, ticket administration, and attendance at Devcon, and otherwise on the basis of our overriding
          legitimate interest in achieving the purposes set out above, in accordance with Article 6(1)(b), Article
          6(1)(f), and, where applicable, Article 6(1)(c) of the General Data Protection Regulation (
          <b>&ldquo;GDPR&rdquo;</b>).
        </li>
        <li>
          To achieve the purposes set out above, some of your Data may be transferred to the following categories of
          recipients:
          <ol className={css.lettered}>
            <li>IT service providers that we may use, such as Pretix;</li>
            <li>
              Third-party Verification Providers, such as SELF or other similar services, which may process personal
              data as independent controllers;
            </li>
            <li>Identity verification, sanctions screening, or similar service providers; and</li>
            <li>
              Courts, regulators, law enforcement authorities, or other third parties where such disclosure is required
              by applicable law, regulation, or legal process, or is necessary for the establishment, exercise, or
              defence of legal claims.
            </li>
          </ol>
        </li>
        <li>
          Some of the recipients referred to above may be located in and/or process personal data outside of your home
          country. The level of data protection in another country may not be equivalent to that in your home country.
          However, we only transfer your Data to countries which the EU Commission has determined to have an adequate
          level of data protection, or we may take measures to ensure that all recipients provide an adequate level of
          data protection. We may do this, for example, by entering into appropriate data transfer agreements based on
          Standard Contractual Clauses (2021/914/EC).
        </li>
        <li>
          We may retain your Data for as long as: (a) required under statutory retention obligations; and/or (b) for
          potential legal claims, where personal data is needed to raise or defend a claim, and such claims are not yet
          time-barred.
        </li>
        <li>
          Under the applicable law, you have the right to (under the conditions set out in applicable law):
          <ol className={css.lettered}>
            <li>
              Obtain confirmation as to whether and what kind of personal data we store about you and to request copies
              of such data;
            </li>
            <li>Request rectification or erasure of your personal data;</li>
            <li>Request us to restrict the processing of your personal data;</li>
            <li>Object to the processing of your personal data;</li>
            <li>Request data portability; and</li>
            <li>Lodge a complaint with the competent supervisory authority.</li>
          </ol>
        </li>
        <li>
          Please address your requests or questions concerning the processing of your personal data to:
          <p className="mt-2">
            Stiftung Ethereum (Foundation Ethereum)
            <br />
            Zeughausgasse 7a, 6300 Zug, Switzerland
            <br />
            Email: <a className="generic hover-underline" href="mailto:notices@ethereum.org">notices@ethereum.org</a>
          </p>
        </li>
        <li>
          Our representative in the EU according to Article 27 GDPR is:
          <p className="mt-2">
            Ethereum Dev GmbH
            <br />
            Oranienstrasse 6, 10997 Berlin, Germany
            <br />
            Email: <a className="generic hover-underline" href="mailto:notices@ethereum.org">notices@ethereum.org</a>
          </p>
        </li>
        <li>
          We may amend this privacy notice from time to time. Any updated version of this privacy notice will be made
          available through the relevant Devcon or event channels.
        </li>
      </ol>
    </div>
  )
}
