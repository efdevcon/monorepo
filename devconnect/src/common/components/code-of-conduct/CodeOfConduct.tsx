import css from './coc.module.scss'

export const CodeOfConduct = () => {
  return (
    <div className={css['code-of-conduct']} id="code-of-conduct">
      <p className="large-text bold">Code of Conduct</p>
      <p className="big-text underline bold">TL;DR</p>
      <p>
        <b>Be excellent to each other</b>. If a participant is, in our sole discretion, harassing or otherwise
        unacceptably impacting other participants&apos; ability to enjoy Devconnect, we at all times reserve the right
        to remove the offending person(s) from the event without refund.
      </p>
      <p className="big-text underline bold">Don&apos;t Shill</p>
      <p>
        Devconnect is designed for builders and developers -{' '}
        <i>
          <b>
            We aim to create a welcoming, collaborative space which allows for great networking opportunities. Please
            respect this space and the opportunity it affords by not aggressively shilling ICOs, investment
            opportunities, or financial products.
          </b>
        </i>{' '}
        If unsure, please ask the staff.
      </p>
      <p className="big-text underline bold">Harassment Policy</p>
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
        This Code of Conduct applies to everyone participating at Devconnect - from attendees and exhibitors to
        speakers, press, volunteers, etc.
      </p>
      <p>
        {' '}
        Anyone can report harassment. If you were or are being harassed, notice that someone else was or is being
        harassed, or have any other concerns related to harassment, you can contact a Devconnect volunteer or staff
        member, make a report at the registration desk or info booth, or submit a complaint to help@devconnect.org.
      </p>
      <p className="big-text underline bold">Approved Swag Only</p>
      <p>
        <b>
          Only pre-approved teams are authorized to distribute swag (clothing, sales, freebies, or any form of
          promotional material) at Devconnect!
        </b>{' '}
        Examples of permitted groups include the Devconnect team, and some of the other pre-approved event organizers.
        Please respect this decision. If you are unsure of whether you are allowed to distribute your swag, ask the
        friendly staff!
      </p>
      <p className="big-text underline bold">Wifi Etiquette</p>
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
      <p className="big-text underline bold">Media Policy</p>
      <p>
        At Devconnect we aim to respect the privacy of our attendees. It is important for you to review the Devconnect
        Media Policy and to ensure you understand and follow it.
      </p>{' '}
      <p className="big-text underline bold">Be Respectful to Speakers (and audiences)</p>
      <p>
        Be mindful of your volume when you&apos;re in or near event venues. Noise levels can quickly get out of control
        and become disruptive to the programme going on inside! Please respect the speakers and participants if you are
        arriving late to an event and/or getting up to leave an event early — try to cause as little disruption as
        possible.
      </p>
      <p className="big-text underline bold">Local Laws</p>
      <p>
        You must comply with all venue and facility rules and regulations during your participation in Devconnect,
        including all safety instructions and requirements. It is also very important to note that <b>ALL</b> attendees
        are expected to conform to <b>ALL</b> local laws, including Covid-19 restrictions and policies imposed by the
        venue, facility, and/or local authorities.
      </p>
      <p className="big-text underline bold">How to Report</p>
      <p>If you notice any violations of this Code of Conduct please report them to help@devconnect.org.</p>
      <p className="big-text underline bold">Remember</p>
      <p className="bold">
        Devconnect is what you make of it, and as a community we can create a safe, meaningful, and incredible
        experience for everyone! 🦄
      </p>
    </div>
  )
}
