import initializeVoxel from './main'
import { useEffect, useRef } from 'react'
import css from './voxel.module.scss'

// https://tympanus.net/codrops/2023/03/28/turning-3d-models-to-voxel-art-with-three-js/

const VoxelComponent = () => {
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initializeVoxel()
      initialized.current = true
    }
  }, [])

  return (
    <div className={css.voxelContainer}>
      <div className="content">
        <canvas id="canvas"></canvas>
        <div className="container">
          <div id="loader">loading the models...</div>
        </div>
        <div id="selector"></div>
      </div>
    </div>
  )
}

export default VoxelComponent
