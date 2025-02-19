import initializeVoxel from './main'
import { useEffect, useRef } from 'react'
import css from './voxel.module.scss'

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
