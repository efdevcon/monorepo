import { useEffect } from 'react'
import { init } from './webgl/js'

const Cube = () => {
  useEffect(() => {
    const stop = init()

    return () => stop()
  }, [])

  return null
}

export default Cube
