import React from 'react'
import css from './legal.module.scss'
import { Link } from 'components/common/link'

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
        make a report at the registration desk or info booth, or submit a complaint to support@devcon.org.
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
      <p>If you notice any violations of this Code of Conduct please report them to support@devcon.org.</p>
      <p className="font-lg text-underline bold">Remember</p>
      <p className="bold">
        Devcon is what you make of it, and as a community we can create a safe, meaningful, and incredible experience
        for everyone! 🦄
      </p>
    </div>
  )
}

export const TermsOfService = () => {
  return (
    <div className={`${css['legal']} mb-8`}>
      <p className="font-xl bold">DEVCON 7 SEA TICKET SALE TERMS AND CONDITIONS</p>

      <p className="font-xl">
        PLEASE READ THESE TERMS AND CONDITIONS BEFORE FINALIZING YOUR PURCHASE OF TICKETS FOR DEVCON 7 SEA.
      </p>

      <p>
        The Ethereum Foundation will host Devcon 7 SEA in Bangkok, Thailand from 12 to 15 November 2024 (
        <b>&ldquo;Devcon&rdquo;</b>).
      </p>

      <p>
        This agreement (<b>&ldquo;Agreement&rdquo;</b>) is made by and between Stiftung Ethereum, a Swiss Foundation
        located at Zeughausgasse 7a, 6300 Zug, Switzerland (<b>&ldquo;We&rdquo;</b> or <b>&ldquo;Us&rdquo;</b>), and
        participants in Devcon, including, but not limited to, persons purchasing tickets for Devcon, attendees,
        speakers, sponsors, and volunteers (<b>&ldquo;You&rdquo;</b>, and together with Us, the{' '}
        <b>&ldquo;Parties&rdquo;</b>). This Agreement includes and incorporates by reference:
      </p>

      <ul>
        <li>
          The Website Terms of Use located{' '}
          <Link className="generic hover-underline" to="https://ethereum.org/en/terms-of-use/">
            here
          </Link>
        </li>
        <li>
          The Privacy Policy located{' '}
          <Link className="generic hover-underline" to="https://ethereum.org/en/privacy-policy/">
            here
          </Link>
        </li>
        <li>
          The Devcon Ticket Sale Privacy Notice located{' '}
          <Link
            className="generic hover-underline"
            to="https://docs.google.com/document/d/122-G_xgVVFBgLt_3MNtTSaaXZxygtQK5O1VfGvi17Kk/edit"
          >
            here
          </Link>
        </li>
        <li>
          The Cookie Policy located{' '}
          <Link className="generic hover-underline" to="https://ethereum.org/en/cookie-policy/">
            here
          </Link>
        </li>
        <li>
          The Media Code of Conduct located{' '}
          <Link
            className="generic hover-underline"
            to="https://docs.google.com/document/d/1HEgags68dJOa-mJjzZ93bKBJ9Z19OIsHXxqdqanbzCA/edit?usp=sharing"
          >
            here
          </Link>
        </li>
        <li>
          The Attendee Code of Conduct located{' '}
          <Link
            className="generic hover-underline"
            to="https://docs.google.com/document/d/1SbodeXFRpp-z0ZQcYExJukB53DdNyDwskhDAml55ipM/edit?usp=sharing"
          >
            here
          </Link>
        </li>
        <li>
          The Attendee Media Policy located{' '}
          <Link
            className="generic hover-underline"
            to="https://docs.google.com/document/d/18zUyAaCU3ECt7tNEfuaQIyy7-nItP-3GosroivC2AME/edit"
          >
            here
          </Link>
        </li>
      </ul>

      <p>
        Devcon is intended to be an educational and collaborative conference. The purpose of this Agreement is to ensure
        that Devcon is and remains a high quality, meaningful, and safe conference for all organizers and participants
        as well as the broader Ethereum ecosystem.
      </p>

      <p className="bold font-lg text-underline">1.0 PREAMBLE</p>

      <p>
        1.1 This Agreement sets out the terms and conditions for purchasing tickets to, admittance to, attending, and/or
        participating in Devcon.
      </p>

      <p>
        1.2 Please read these terms and conditions carefully before You submit Your order to Us. These terms and
        conditions explain the terms of purchasing tickets to, admittance to, attending, and otherwise participating in
        Devcon, including, but not limited to, prohibited activities, intellectual property rights, control of
        credentials issued by Us, how You and We may change or end the contract, and other important information.
      </p>

      <p>
        1.3 Our acceptance of Your order will take place when You receive a confirmation receipt that Your order has
        been successfully completed, at which point the Agreement will come into existence between You and Us.
      </p>

      <p>
        1.4 You may contact Us at support@devcon.org. If We have to contact You, We will do so by the email You have
        provided to Us.
      </p>

      <p className="bold font-lg text-underline">2.0 ADMITTANCE</p>

      <p>
        2.1 Your ticket entitles You to valid credentials issued by Us (the <b>&ldquo;Wristband&rdquo;</b>) that
        entitles You admittance to Devcon. You are responsible for checking in at Devcon with proof of a valid ticket to
        receive Your Wristband. <b>No one will be admitted to Devcon without a Wristband.</b>
      </p>

      <p>
        2.2 Any and all other costs and legal requirements arising out of or relating to Your attendance of Devcon
        (including, but not limited to, visa, travel, and accommodation needs and expenses) are solely Your
        responsibility. We shall bear no liability for any costs or failures to make such appropriate arrangements.
      </p>

      <p>
        2.3 We reserve the right, in Our sole discretion and without refund, to refuse admittance to or expel from
        Devcon anyone: (a) for health or safety concerns; (b) who is under 18 years old and has not received prior
        written approval from Us; (c) who breaches the terms under this Agreement, including the rules and policies
        incorporated by reference herein; (d) who is determined to behave in a manner that could be disruptive to
        others; or (e) who is determined to interfere or participate in conduct that could interfere with the
        administration of Devcon or the enjoyment of Devcon by others.
      </p>

      <p className="bold font-lg text-underline">3.0 AGE LIMITATIONS</p>

      <p>
        3.1 You must be 18 years of age or older to purchase a ticket to, attend Devcon. By purchasing a ticket, You
        represent and warrant that You are 18 years of age or older, not barred from attending Devcon under the laws of
        the applicable jurisdiction, have the capacity to purchase a ticket, attend, and participate in Devcon, and have
        purchased a ticket for Your own attendance of and participation in Devcon.
      </p>

      <p>
        3.2 If You are under the age of 18 and wish to attend Devcon, please reach out to us at support@devcon.org
        before purchasing a ticket.
      </p>

      <p className="bold font-lg text-underline">4.0 WRISTBAND CONTROL</p>

      <p>
        4.1 <b>You must produce a valid Wristband to be admitted to and/or attend Devcon.</b> The Wristband must be worn
        and displayed prominently at all times while at Devcon or designated off-site activities.{' '}
        <b>You are responsible for the safekeeping of the Wristband during Devcon.</b>
      </p>

      <p>
        4.2 Wristbands are personal revocable licenses issued to You and shall at all times remain the sole property of
        Us. Wristbands must be surrendered to Us or Our representatives upon demand. For the avoidance of doubt, the
        abovementioned personal license is one that is available to You only and is non-transferable.
      </p>

      <p>
        4.3 False certification, misuse of a Wristband, or any other method or device used to assist unauthorized
        personnel to gain admittance to Devcon will be just cause for: (a) denying entry to and expelling You and any
        other persons involved from Devcon without any obligation on Our part to refund any fees; and (b) banning You
        and any other persons involved from present and future events.
      </p>

      <p>
        4.4 Your Wristband may be invalidated if any part of it is removed, altered, or defaced. We will not be
        responsible for any Wristband that is invalidated, lost, stolen, or destroyed.
      </p>

      <p className="bold font-lg text-underline">5.0 SOLICITING, RECRUITING, AND OTHER PROHIBITED ACTIVITIES</p>

      <p>
        5.1 Devcon is intended to be an educational conference. You understand and agree that Devcon is not a sales
        conference, employment job fair, or other type of conference.{' '}
        <b>
          As such, solicitation, sales, marketing, or promotions or offers to sell, including, but not limited to,
          announcements of ICOs, crowdsales, or similar promotional pitches, &ldquo;suitcasing&rdquo;, or outboarding
          are all prohibited at Devcon.
        </b>{' '}
        Any activities including, but not limited to, marketing, promoting, offering to sell, or sales of any kind of
        investments is also strictly prohibited. &ldquo;Suitcasing&rdquo; refers to the practice of &ldquo;working the
        aisles&rdquo; of an event from a suitcase or briefcase, soliciting business from other attendees and
        participants.
      </p>

      <p>
        5.2 We reserve the right to deny entrance or expel any person from Devcon who engages in, assists in, or is
        reputed to engage or assist in, unethical or non-compliant marketing practices which include, but are not
        limited to, solicitation, sales, promotion of sales, offers to sell, or engagement in any other prohibited or
        illegal activity at Devcon.
      </p>

      <p className="bold font-lg text-underline">6.0 CHANGES TO THE EVENT / RIGHT TO REFUSE ORDER</p>

      <p>
        6.1 Devcon is subject to the needs and requirements of, without limitation, the venue, location, local
        authorities, attendees, speakers, sponsors, and administration. You understand and agree that We may at Our sole
        discretion alter or cancel any aspect of Devcon, including, but not limited to, the content, program, speakers,
        moderators, venue, and time without notice and without refund.
      </p>

      <p>
        6.2 In addition to the requirements and prohibitions set forth in this Agreement, We may at Our sole discretion
        also exclude any person from purchasing a ticket. We also reserve the right to cancel, at Our sole discretion,
        any ticket upon refund of the fee paid to Us, provided, however, that if any ticket is cancelled for violating
        any of the terms set out in this Agreement, no refund will be made.
      </p>

      <p>
        6.3 We may implement safety measures, such as those relating to the COVID-19 pandemic, including those as
        mandated by local law, instructed by local authorities, or required by the venue or service providers.
        Compliance with such measures, and applicable consents from You, may be mandatory for the purchase of tickets
        to, admittance to, attendance of, or participation in Devcon.
      </p>

      <p className="bold font-lg text-underline">7.0 CANCELLATION POLICY</p>

      <p>
        7.1 <b>There are no guaranteed refunds for ticket cancellations.</b> We will consider exceptions on a
        case-by-case basis upon Your written request to support@devcon.org prior to the first day of Devcon. Any refunds
        are limited to a maximum amount of the price paid by You to Us.
      </p>

      <p>
        7.2 If a refund request is approved for a ticket paid for in cryptocurrency, the refund will be made in the same
        cryptocurrency and You will be responsible for paying the gas fees of the transaction of the refund. Such gas
        fees will be deducted from the refund amount.
      </p>

      <p>
        7.3 Please remember that cancelling Your ticket or sponsorship does not automatically cancel Your hotel and
        travel arrangements. You are responsible for Your own hotel and travel plans including, but not limited to, all
        costs, expenses, and fees associated with the cancellation.
      </p>

      <p className="bold font-lg text-underline">8.0 PRESENTATIONS, VIEWS AND MATERIALS</p>

      <p>
        8.1 The views expressed by any Devcon attendee, speaker, or sponsor should not be taken as those of the Ethereum
        Foundation. All Devcon attendees, speakers, and sponsors are solely responsible for the content of any and all
        of their own presentations, publications, and related materials.
      </p>

      <p>
        8.2 As Devcon is intended to be an educational conference, none of the presentations, publications, and related
        materials at Devcon should be taken as investment, financial, legal, or other professional advice.
      </p>

      <p className="bold font-lg text-underline">9.0 PHOTOGRAPHY, RECORDING, LIVE STREAMING AND VIDEO RECORDING</p>

      <p>
        9.1 We reserve the right to use images or videos taken at Devcon for present and future marketing materials,
        including images that may bear Your image or likeness. If You do not wish to appear in media images or videos at
        Devcon, please refer to the Media Policy above.
      </p>

      <p>
        9.2 You may not record, stream, or otherwise broadcast audio or video of any and all sessions at Devcon. We
        allow cameras and photography at Devcon; however, professional video recording is strictly prohibited and anyone
        doing so may be immediately escorted out of the venue and may be asked to surrender his or her Wristband without
        refund of fees. You are responsible for compliance with all applicable intellectual property, privacy and
        publicity laws, rules, and regulations.
      </p>

      <p className="bold font-lg text-underline">10.0 INTELLECTUAL PROPERTY</p>

      <p>
        10.1 All intellectual property (including works of authorship, copyrights, inventions, patents, trademarks,
        personality rights, and moral rights) owned or licensed by anyone prior to Devcon, including, but not limited
        to, Us and the Parties presenting at Devcon, shall remain with that party.
      </p>

      <p>
        10.2 You may not use or reproduce, or allow anyone else to use or reproduce, any trademarks relating to the
        Ethereum Foundation, including, but not limited to, the wordmark &ldquo;Ethereum Foundation&rdquo;, in any
        Devcon content or in any materials distributed at or in connection with Devcon for any reason without Our prior
        written permission.
      </p>

      <p>
        10.3 For the avoidance of doubt, nothing in this Agreement shall be deemed to vest in You any legal or
        beneficial right in or to any intellectual property owned or licensed by Us or any of the Parties presenting at
        Devcon, all of which shall at all times remain the exclusive property of Us or the respective Parties presenting
        at Devcon.
      </p>

      <p className="bold font-lg text-underline">11.0 PRIVACY & DATA PROTECTION</p>

      <p>
        11.1 We may process Your name and contact data (<b>&ldquo;Data&rdquo;</b>) for the purposes and in the course of
        Devcon.
      </p>

      <p>
        11.2 You have to purchase tickets to Devcon on the Pretix platform. The operator of the Pretix platform, rami.io
        GmbH, Berthold-Mogel-Straße 1, 69126 Heidelberg, Germany, is Our data processor. Your data will be stored by the
        data processor in Germany. Your data may in addition be stored on Our servers in the EU. We, as Your data
        controller, encrypt Your Data.
      </p>

      <p>
        11.3 In order to complete the ticketing process, You may have the option to create an account with 0xPARC
        Foundation on their Zupass website at{' '}
        <Link className="generic hover-underline" to="https://zupass.org">
          https://zupass.org
        </Link>
        . Where You do so, 0xPARC Foundation may process Your name, email address (the same email address used for the
        purchase of the ticket), a password, and potentially more information as a controller and store Your data in the
        EU. For more information about how 0xPARC Foundation may process Your personal data, please review their privacy
        notice. We have no influence on 0xPARC Foundation's data processing.
      </p>

      <p>
        11.4 An encrypted data exchange may take place in which 0xPARC Foundation is informed by us whether the email
        address You have provided holds a ticket to Devcon. If so, 0xPARC Foundation may generate a QR code that can be
        scanned at the venue in order to gain You entry.
      </p>

      <p>
        11.5 We process the Data for the following purposes: (a) ticket purchase; and (b) verification that You are the
        holder of the ticket. You are under no obligation to provide us with the Data. However, if You do not do so, You
        may not be able to attend or otherwise participate in Devcon. Should the provision of Your Data be mandatory by
        law, we will inform You separately thereof.
      </p>

      <p>
        11.6 We process Your Data on the basis of Our overriding legitimate interest in achieving the purposes set out
        above, in accordance with Article 6(1)(f) General Data Protection Regulation (<b>&ldquo;GDPR&rdquo;</b>).
      </p>

      <p>
        11.7 To achieve the purposes set out above, some of Your Data may be transferred to the following categories of
        recipients:
      </p>

      <ul>
        <li>(a) IT service providers that we may use (e.g. Pretix); and</li>
        <li>(b) 0xPARC Foundation which may process Your Data as an independent controller.</li>
      </ul>

      <p>
        Some of the recipients referred to above may be located in and/or process personal data outside of Your home
        country. The level of data protection in another country may not be equivalent to that in Your home country.
        However, we only transfer Your personal data to countries which the EU Commission has determined to have an
        adequate level of data protection, or we may take measures to ensure that all recipients provide an adequate
        level of data protection. We may do this, for example, by entering into appropriate data transfer agreements
        based on Standard Contractual Clauses (2021/914/EC).
      </p>

      <p>
        11.8 We may retain Your Data for as long as: (a) required under statutory retention obligations; and/or (b) for
        potential legal claims, where personal data is needed to raise or defend a claim, and such claims are not yet
        time-barred.
      </p>

      <p>11.9 Under the applicable law, You have the right to (under the conditions set out in applicable law):</p>

      <ul>
        <li>
          (a) Obtain confirmation as to whether and what kind of personal data we store about You and to request copies
          of such data;
        </li>
        <li>(b) Request rectification or erasure of Your personal data;</li>
        <li>(c) Request us to restrict the processing of Your personal data;</li>
        <li>(d) Object to the processing of Your personal data;</li>
        <li>(e) Request data portability; and</li>
        <li>(f) Lodge a complaint with the competent supervisory authority.</li>
      </ul>

      <p>11.10 Please address Your requests or questions concerning the processing of Your personal data to:</p>

      <p>
        Stiftung Ethereum (Foundation Ethereum)
        <br />
        Zeughausgasse 7a, 6300 Zug, Switzerland
        <br />
        Email: notices@ethereum.org
      </p>

      <p>11.11 Our representative in the EU according to Article 27 GDPR is:</p>

      <p>
        Ethereum Dev GmbH
        <br />
        Oranienstrasse 6, 10997 Berlin, Germany
        <br />
        Email: notices@ethereum.org
      </p>

      <p className="bold font-lg text-underline">12.0 FORCE MAJEURE</p>

      <p>
        We shall not be held responsible for any delay or failure in the performance of Our obligations under this
        Agreement to the extent that such delay or failure is caused by fire, flood, earthquakes, strike, civil,
        governmental, or military authority, acts of God, acts of terrorism, acts of war, disease, epidemics or
        pandemics, blackouts, insurrections, riots, civil disturbances, electrical disruptions, third-party injunctions,
        the unavailability of all or part of the venue, or other similar causes beyond Our reasonable control and
        without the fault of Us or Our subcontractors. For one or more of such reasons, We may postpone, reschedule, or
        cancel any part of or the entirety of Devcon without liability on Our part. In the event any part of or the
        entirety of Devcon cannot be held or is postponed pursuant to this section, We shall not be liable to You for
        any incidental, consequential, special, direct, or indirect damages, costs, or losses incurred, including, but
        not limited to, transportation costs, accommodations costs, or financial losses. We will review refund or fee
        transfer requests submitted in writing on a case-by-case basis.
      </p>

      <p className="bold font-lg text-underline">13.0 DISCLAIMER OF WARRANTIES & LIMITATION OF LIABILITY</p>

      <p>
        13.1 We give no warranties in respect of any aspect of Devcon or any materials relating to or offered at Devcon
        and, to the fullest extent possible under the laws governing this Agreement, disclaim all implied warranties,
        including but not limited to warranties of fitness for a particular purpose, accuracy, timeliness, or
        merchantability. Devcon is provided on an &ldquo;as-is&rdquo; basis. Neither We nor Our affiliates accept any
        responsibility or liability for reliance by You or any person on any aspect of Devcon or any information
        provided at Devcon. Some jurisdictions do not allow exclusion of warranties or limitations on the duration of
        implied warranties, so the above disclaimer may not apply to You in their entirety, but will apply to the
        maximum extent permitted by the applicable law.
      </p>

      <p>
        13.2 Except as required by law, neither We nor Our affiliates shall be liable for any direct, indirect, special,
        incidental, or consequential costs, damages, or losses arising directly or indirectly from Devcon or any other
        aspect related thereto or in connection with this Agreement.
      </p>

      <p>
        13.3 Our maximum aggregate liability for any claim in any way connected with or arising from Devcon or this
        Agreement, whether in contract, tort, or otherwise (including any negligent act or omission) shall be limited to
        the amount paid by You to Us under this Agreement. The foregoing does not affect any liability which cannot be
        excluded or limited under applicable law.
      </p>

      <p className="bold font-lg text-underline">14.0 PERSONAL INJURY, LOSS AND INDEMNIFICATION</p>

      <p>
        YOU SHALL INDEMNIFY US AND HOLD HARMLESS US and Our respective directors, officers, members, owners, agents,
        employees, and servants (collectively <b>&ldquo;Indemnitees&rdquo;</b>) from and against any and all claims,
        suits, causes of action, damages, losses, liabilities, costs, and expenses (including, but not limited to,
        reasonable attorneys&rsquo; fees and court costs) of any kind whatsoever (collectively{' '}
        <b>&ldquo;Claims&rdquo;</b>) arising out of or in connection with Your or Your agents&rsquo;, employees&rsquo;,
        guests&rsquo; or assigns&rsquo;, or transferees&rsquo;: (a) admittance to, attendance of, or participation in
        Devcon; (b) purchase of tickets; (c) use of the Wristband; (d) breach of this Agreement; or (e) act or omission,
        neglect, or wrongdoing. You shall, at Your sole cost and expense, defend (with counsel acceptable to the
        Indemnitees) the Indemnitees against any and all such Claims. You and all persons using a Wristband, attending,
        accessing, or otherwise participating in Devcon assume all risk and danger of personal injury, death, and all
        other hazards and losses, both personal and property, arising from or related in any way to Devcon, whether
        occurring prior to, during, or after Devcon, and You hereby release the Indemnitees from any such claims or
        injuries to the extent permissible by applicable law. This section shall survive the termination or expiration
        of this Agreement.
      </p>

      <p className="bold font-lg text-underline">15.0 COMPLIANCE WITH LAWS, RULES, AND REGULATIONS</p>

      <p>15.1 You are solely responsible for all personal property You bring to Devcon.</p>

      <p>
        15.2 By purchasing tickets to Devcon, You agree to comply with the terms of this Agreement, including all the
        rules and policies incorporated herein. You further agree to comply with all applicable local and federal laws,
        as well as any applicable rules, ordinances, or regulations that may be adopted from time to time, both at the
        location where Devcon takes place and in Your country of residence.
      </p>

      <p>
        15.3 You agree that Your purchase of tickets to, attendance of, and participation in Devcon will not be for any
        unlawful purpose and do not violate, or assist in the violation of, any law, statute, ordinance, regulation, or
        sanctions programs administered in the countries where We operate or where Devcon is held, including but not
        limited to those administered by the US Department of Treasury’s Office of Foreign Assets Control.
      </p>

      <p>
        15.4 To the extent permissible by law, You and Your representatives waive any rights and claims for damages
        arising out of or relating to the enforcement of the Wristband control restrictions, the prohibited activities
        restrictions, the video restrictions, and the other restrictions expressly set forth in this Agreement.
      </p>

      <p className="bold font-lg text-underline">16.0 WAIVER AND SEVERABILITY</p>

      <p>
        16.1 No waiver by Us of any term or condition set out in the Agreement shall be deemed a further or continuing
        waiver of such term or condition or a waiver of any other term or condition, and any failure of Us to assert a
        right or provision under the Agreement shall not constitute a waiver of such right or provision.
      </p>

      <p>
        16.2 If any provision of the Agreement is held by a court or other tribunal of competent jurisdiction to be
        invalid, illegal, or unenforceable for any reason, such provision shall be eliminated or limited to the minimum
        extent such that the remaining provisions of the Agreement will continue in full force and effect.
      </p>

      <p className="bold font-lg text-underline">17.0 GOVERNING LAW</p>

      <p>
        This Agreement and all matters relating to Devcon shall be governed by and construed in accordance with the laws
        of Switzerland (excluding treaties or International Conventions such as the UN Convention on Contracts for the
        International Sale of Goods).
      </p>

      <p className="bold font-lg text-underline">18.0 DISPUTE RESOLUTION</p>

      <p>
        Any dispute, controversy, or claim arising out of or relating to this Agreement, including the validity,
        invalidity, breach, or termination thereof, shall be resolved by arbitration in accordance with the Swiss Rules
        of International Arbitration of the Swiss Chambers&rsquo; Arbitration Institution in force on the date on which
        the Notice of Arbitration is submitted in accordance with these Rules. The number of arbitrators shall be one.
        The seat of the arbitration shall be Zurich unless the parties agree on a different seat. The arbitral
        proceedings shall be conducted in English.
      </p>

      <p className="bold font-lg text-underline">19.0 ENTIRE AGREEMENT</p>

      <p>
        The Agreement, including the documents incorporated by reference, constitutes the sole and entire agreement
        between You and Us with relating to Your purchase of tickets to, admittance to, attendance of, or participation
        in Devcon and supersedes all prior and contemporaneous understandings, agreements, representations and
        warranties, both written and oral, with respect to the same. The Parties agree that each has not entered into
        the Agreement in reliance of, and shall have no remedy in respect of, any statement, representation, covenant,
        warranty, undertaking, or indemnity by any person other than as expressly set out in the Agreement.
      </p>
    </div>
  )
}
