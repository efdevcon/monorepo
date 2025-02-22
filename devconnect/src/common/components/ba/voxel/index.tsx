import initializeVoxel from './main'
import { useEffect, useRef, useState } from 'react'
import css from './voxel.module.scss'
import indexCss from 'pages/index.module.scss'
import cn from 'classnames'

// https://tympanus.net/codrops/2023/03/28/turning-3d-models-to-voxel-art-with-three-js/

const rotatingText = [
  'coming to argentina',
  'community',
  'decentralized',
  'permissionless',
  'interoperable',
  'sovereignty',
  'scalable',
  'cypherpunk',
]

const VoxelComponent = () => {
  const initialized = useRef(false)
  const [activeModelIndex, setActiveModelIndex] = useState(0)

  useEffect(() => {
    if (!initialized.current) {
      initializeVoxel(setActiveModelIndex)
      initialized.current = true
    }
  }, [setActiveModelIndex])

  return (
    <>
      <div className="absolute top-4 left-4 z-10 text-2xl text-[#74ACDF] font-secondary">
        <div className="text-lg font-secondary">Ethereum is</div>
        <div
          key={activeModelIndex}
          className={cn(
            'uppercase relative leading-none font-bold group-hover:scale-105 group-hover:translate-x-[2.5%] group-hover:translate-y-[2.5%] transition-all duration-300',
            indexCss.revealFromLeft
          )}
        >
          {rotatingText[activeModelIndex]}
        </div>
      </div>
      <div className={css.voxelContainer} id="voxel-container">
        <div className="content">
          <canvas id="canvas"></canvas>
          <div className="container">
            <div id="loader">loading the models...</div>
          </div>
          <div id="selector"></div>
        </div>
      </div>
    </>
  )
}

export default VoxelComponent
