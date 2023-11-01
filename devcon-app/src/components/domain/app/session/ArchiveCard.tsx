import React from 'react'
import css from './livestream.module.scss'
import { Session } from 'types/Session'
import { ThumbnailBlock } from 'components/common/thumbnail-block'
import LivestreamIcon from './livestream-icon.png'
import { Link } from 'components/common/link'
import { defaultSlugify } from 'utils/formatting'

interface Props {
  session: Session
}

export const ArchiveCard = (props: Props) => {
  return (
    <div className={css['container']}>
      <h4 className="app-header">Recording</h4>

      <div>
        <ThumbnailBlock className={css['banner']} thumbnail={LivestreamIcon.src}>
          <div className={css['content']}>
            <p className="font-md">
              Visit the Devcon Archive to <Link to={`https://archive.devcon.org/archive/watch/6/${defaultSlugify(props.session.title)}`}>watch the recording</Link>.
            </p>
            <p className={css['powered-by']}>Powered by Swarm & Etherna.</p>
          </div>
        </ThumbnailBlock>
      </div>
    </div>
  )
}
