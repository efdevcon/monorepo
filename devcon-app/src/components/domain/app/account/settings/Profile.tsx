import React, { useState } from 'react'
import css from './settings.module.scss'
import { useAccountContext } from 'context/account-context'
import Alert from 'lib/components/alert'
import AccountFooter from '../AccountFooter'
import { Button } from 'lib/components/button'
import { cn } from 'lib/shadcn/lib/utils'
import router from 'next/router'
import Tabs from 'components/domain/app/account/tabs'

const roles = [
  'Developer',
  'Designer',
  'Researcher',
  'Entrepreneur',
  'Marketing',
  'Product',
  'Investor',
  'Operations',
  'Sales',
  'Community',
  'Legal',
  'People',
]
const tracks = [
  'Core Protocol',
  'Cypherpunk & Privacy',
  'Usability',
  'Real World Ethereum',
  'Applied Cryptography',
  'Cryptoeconomics',
  'Coordination',
  'Developer Experience',
  'Security',
  'Layer2s',
]
const tags = [
  'Layer 1',
  'Staking',
  'EIP',
  'SSF',
  'Consensus',
  'FOSS',
  'Censorship Resistance',
  'Privacy',
  'Identity',
  'Decentralization',
  'UI',
  'UX',
  'Design',
  'Account Abstraction',
  'Design Thinking',
  'User Research',
  'Use Cases',
  'Impact',
  'Product-Market Fit',
  'Regulatory',
  'ZKP',
  'MPC',
  'Mixers',
  'Signatures',
  'Quantum Resistance',
  'Mechanism Design',
  'Game Theory',
  'Tokenomics',
  'MEV',
  'Intents',
  'Restaking',
  'DAOs',
  'Governance',
  'Quadratic Voting',
  'Cooperation',
  'DevEx',
  'Libraries',
  'Tooling',
  'DevRel',
  'Infrastructure',
  'Auditing',
  'Bugs',
  'Hacks',
  'Key Management',
  'Scalability',
  'Layer2',
  'Rollups',
  'DAS',
  'Bridges',
  'zkEVM',
]

export default function ProfileSettings() {
  const accountContext = useAccountContext()
  const currentAccount = accountContext.account
  const [error, setError] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(accountContext.account?.roles ?? [])
  const [selectedTracks, setSelectedTracks] = useState<string[]>(accountContext.account?.tracks ?? [])
  const [selectedTags, setSelectedTags] = useState<string[]>(accountContext.account?.tags ?? [])

  if (!accountContext.account) {
    return <></>
  }

  async function updateProfile() {
    if (accountContext && currentAccount) {
      const updated = await accountContext.updateAccount(currentAccount.id, {
        ...currentAccount,
        roles: selectedRoles ?? [],
        tracks: selectedTracks ?? [],
        tags: selectedTags ?? [],
      })
      if (updated) {
        router.push('/account')
      } else {
        setError('Error updating profile.')
      }
    }
  }

  return (
    <>
      <div data-type="settings-layout" className={cn('flex flex-row lg:gap-3 relative')}>
        <div className={cn('basis-[60%] grow')}>
          <div className="flex flex-col lg:border lg:border-solid lg:border-[#E4E6EB] lg:bg-[#fbfbfb] rounded-3xl relative">
            {/* <Tabs /> */}
            <div className="flex flex-col gap-3 pb-4 px-4">
              <div className={css['alert']}>
                {error && (
                  <Alert title="Error" color="orange">
                    {error}
                  </Alert>
                )}
              </div>
              <div className={css['form']}>
                <p className={`${css['title']} text-lg font-bold`}>Manage Profile</p>
                <p className={css['content']}>
                  Your profile settings are used to optimize and recommend sessions and speakers to you.
                </p>

                <div>
                  <p className="font-bold mt-4">Which role describes you best?</p>
                  <select
                    multiple
                    size={roles.length}
                    value={selectedRoles}
                    onChange={e => setSelectedRoles(Array.from(e.target.selectedOptions, option => option.value))}
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
                  <p className="font-bold mt-4">Which tracks are you most interested in?</p>
                  <select
                    multiple
                    size={tracks.length}
                    value={selectedTracks}
                    onChange={e => setSelectedTracks(Array.from(e.target.selectedOptions, option => option.value))}
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
                  <p className="font-bold mt-4">Which tags are you most interested in?</p>
                  <select
                    multiple
                    size={10}
                    value={selectedTags}
                    onChange={e => setSelectedTags(Array.from(e.target.selectedOptions, option => option.value))}
                    className={css['select']}
                  >
                    {tags.map((tag: string) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex">
                  <Button color="purple-2" fill onClick={updateProfile}>
                    Update profile
                  </Button>
                </div>
              </div>

              <AccountFooter />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
