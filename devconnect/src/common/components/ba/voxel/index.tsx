import initializeVoxel from './main'
import { useEffect, useRef, useState } from 'react'
import css from './voxel.module.scss'
import indexCss from 'pages/index.module.scss'
import cn from 'classnames'

// https://tympanus.net/codrops/2023/03/28/turning-3d-models-to-voxel-art-with-three-js/

const rotatingText = [
  'community',
  'borderless',
  'ownership',
  'decentralized',
  'private',
  'freedom',
  'money',
  'permissionless',
  'secure',
  'progress',
  'coming to argentina',
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
      <div className="relative h-[300px] lg:h-auto lg:absolute top-4 left-4 z-10 text-3xl text-[#74ACDF]">
        <div className="text-xl">Ethereum is</div>
        <div
          key={activeModelIndex}
          className={cn(
            'uppercase relative leading-none font-bold group-hover:lg:scale-105 group-hover:lg:translate-x-[2.5%] group-hover:lg:translate-y-[2.5%] transition-all duration-300',
            indexCss.revealFromLeft
          )}
        >
          {rotatingText[activeModelIndex]}
        </div>
      </div>
      <div className={cn(css.voxelContainer, 'w-full')} id="voxel-container">
        <div className="content w-full">
          <canvas id="canvas" className="w-full"></canvas>
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
