import Image from 'next/legacy/image'
import React from 'react'
import css from './css-3d.module.scss'
import floorplan from './mall-floor-plan.png'

const Layer = (props: any) => {
  return (
    <div {...props}>
      <Image src={floorplan} alt="floorplan" />
      <p className={css['label']}>L{props['data-floor']}</p>
      <div className={css['pin-container']} style={{ '--x': '100%', '--y': '100%' } as any}>
        <div className={css['pin']}>PIN</div>
      </div>
    </div>
  )
}

const useFloor = () => {
  const [currentFloor, setCurrentFloor] = React.useState()
  const [hoveredFloor, setHoveredFloor] = React.useState()

  return [
    [currentFloor, setCurrentFloor],
    [hoveredFloor, setHoveredFloor],
  ]
}

export const CSS3D = () => {
  const floors = [{}, {}, {}, {}]
  const [rotateY, setRotateY] = React.useState(45)
  const [rotateZ, setRotateZ] = React.useState(-35)
  const [rotateX, setRotateX] = React.useState(55)
  const [translateY, setTranslateY] = React.useState(0)
  const [translateX, setTranslateX] = React.useState(0)
  const [currentFloor, setCurrentFloor] = React.useState<undefined | number>()
  // const [[currentFloor, setCurrentFloor], [hoveredFloor, setHoveredFloor]] = useFloor()

  const style = {} as any

  if (translateX) style['--translate-x'] = `${translateX}%`
  if (translateY) style['--translate-y'] = `${translateY}%`
  if (rotateX) style['--rotate-x'] = `${rotateX}deg`
  if (rotateZ) style['--rotate-z'] = `${rotateZ}deg`
  if (rotateY) style['--rotate-y'] = `${rotateY}deg`

  return (
    <div className={css['container']}>
      <div
        className={(() => {
          let className = css['scene']
          const selectionActive = currentFloor !== undefined

          if (selectionActive) className += ` ${css['selection-active']}`

          return className
        })()}
      >
        {floors.map((floor, index) => {
          const selected = index === currentFloor

          return (
            <Layer
              key={index}
              style={style}
              data-floor={index}
              onClick={() => setCurrentFloor(selected ? undefined : index)}
              // onMouseEnter={() => {
              //   setHoveredFloor(index)
              // }}
              // onMouseLeave={() => {
              //   setHoveredFloor(undefined)
              // }}
              className={(() => {
                let className = `${css['layer']} ${css[`floor-${index}`]}`

                if (selected) className += ` ${css['selected']}`

                return className
              })()}
            />
          )
        })}
      </div>
      {/* rotateX:{" "}
      <input
        value={rotateX}
        onChange={(e) => setRotateX(e.target.value)}
        type="number"
      />
      rotateY:{" "}
      <input
        value={rotateY}
        onChange={(e) => setRotateY(e.target.value)}
        type="number"
      />
      rotateZ:{" "}
      <input
        value={rotateZ}
        onChange={(e) => setRotateZ(e.target.value)}
        type="number"
      />
      translateX:{" "}
      <input
        value={translateX}
        onChange={(e) => setTranslateX(e.target.value)}
        type="number"
      />
      translateY:{" "}
      <input
        value={translateY}
        onChange={(e) => setTranslateY(e.target.value)}
        type="number"
      /> */}
    </div>
  )
}
