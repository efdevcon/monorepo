import React, { useState } from 'react'
import css from './settings.module.scss'
import { useAccountContext } from 'context/account-context'
import { Alert } from 'components/common/alert'
import AccountFooter from '../AccountFooter'
import { Button } from 'components/common/button'
import { AppNav } from '../../navigation'

const roles = ['Developer', 'Designer', 'Researcher', 'Entrepreneur', 'Marketing', 'Product', 'Investor', 'Operations', 'Sales', 'Community', 'Legal', 'People']
const tracks = ['Core Protocol', 'Cypherpunk & Privacy', 'Usability', 'Real World Ethereum', 'Applied Cryptography', 'Cryptoeconomics', 'Coordination', 'Developer Experience', 'Security', 'Layer2s']
const tags = [
  'Layer 1', 'Staking', 'EIP', 'SSF', 'Consensus', 
  'FOSS', 'Censorship Resistance', 'Privacy', 'Identity', 'Decentralization',
  'UI', 'UX', 'Design', 'Account Abstraction', 'Design Thinking', 'User Research',
  'Use Cases', 'Impact', 'Product-Market Fit', 'Regulatory',
  'ZKP', 'MPC', 'Mixers', 'Signatures', 'Quantum Resistance',
  'Mechanism Design', 'Game Theory', 'Tokenomics', 'MEV', 'Intents', 'Restaking',
  'DAOs', 'Governance', 'Quadratic Voting', 'Cooperation',
  'DevEx', 'Libraries', 'Tooling', 'DevRel', 'Infrastructure',
  'Auditing', 'Bugs', 'Hacks', 'Key Management', 
  'Scalability', 'Layer2', 'Rollups', 'DAS', 'Bridges', 'zkEVM'
]

export default function ProfileSettings() {
  const accountContext = useAccountContext()
  const currentAccount = accountContext.account
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState(accountContext.account?.role ?? '')
  const [selectedTracks, setSelectedTracks] = useState<string[]>(accountContext.account?.tracks ?? [])
  const [selectedTags, setSelectedTags] = useState<string[]>(accountContext.account?.tags ?? [])

  if (!accountContext.account) {
    return <></>
  }

  async function updateProfile() {
    if (accountContext && currentAccount) {

      const updated = await accountContext.updateAccount(currentAccount.id, { 
        ...currentAccount,
        role: selectedRole,
        tracks: selectedTracks ?? [],
        tags: selectedTags ?? []
      })
      if (updated) {
        setError('Profile successfully updated.')
      } else {
        setError('Error updating profile.')
      }
    }
  }

  return (
    <>
      <AppNav
        nested
        links={[
          {
            title: 'Profile',
          },
        ]}
      />

      <div className={css['container']}>
        <div>
          <div className="section">
            <div className="content">

              <div className={css['alert']}>
                {error && <Alert title='Info' type="info" message={error} />}
              </div>

              <div className={css['form']}>
                <p className={`${css['title']} title`}>Edit Profile</p>
                <p className={css['content']}>Your profile settings are used to optimize and recommend sessions and speakers to you.</p>

                <div>
                  <p className={css['content']}>Which role describes you best?</p>
                  <select 
                    value={selectedRole} 
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className={css['select']}
                  >
                    <option value=""></option>
                    {roles.map((role: string) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className={css['content']}>Which tracks are you most interested in?</p>
                  <select 
                    multiple
                    size={tracks.length}
                    value={selectedTracks} 
                    onChange={(e) => setSelectedTracks(Array.from(e.target.selectedOptions, option => option.value))}
                    className={css['select']}
                  >
                    {tracks.map((track: string) => (
                      <option key={track} value={track}>
                        {track}
                    </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className={css['content']}>Which tags are you most interested in?</p>
                  <select
                    multiple
                    size={10}
                    value={selectedTags}
                    onChange={(e) => setSelectedTags(Array.from(e.target.selectedOptions, option => option.value))}
                    className={css['select']}
                  >
                    {tags.map((tag: string) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <Button className={`red`} onClick={updateProfile}>Update profile</Button>
              </div>
            </div>
          </div>
        </div>

        <AccountFooter />
      </div>
    </>
  )
}
