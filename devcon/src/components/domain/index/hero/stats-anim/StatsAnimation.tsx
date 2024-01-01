import React from 'react'
import { Engine, Render, Runner, Bodies, Composite, Composites, MouseConstraint, Mouse, Common } from 'matter-js'
import css from './stats-animation.module.scss'
import useDimensions from 'react-cool-dimensions'

const StatsAnimation = () => {
  const [mounted, setMounted] = React.useState(false)
  // const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const renderRef = React.useRef<any>()
  const { observe, unobserve, width, height, entry } = useDimensions()

  React.useEffect(() => {
    if (!mounted) {
      setMounted(true)

      return
    }

    observe()

    const mountContainer = document.getElementById('matter-container')

    if (!mountContainer) return

    // create an engine
    var engine = Engine.create({
      positionIterations: 6,
    })

    // create a renderer
    var render = Render.create({
      element: mountContainer,
      engine: engine,
      options: {
        width,
        height,
        // showVelocity: true,
        showAngleIndicator: false,
        wireframes: false,
      },
    })

    var mouse = Mouse.create(render.canvas),
      mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
          stiffness: 0.2,
          render: {
            visible: false,
          },
        },
      })

    // @ts-ignore
    mouseConstraint.mouse.element.removeEventListener('mousewheel', mouseConstraint.mouse.mousewheel)
    // @ts-ignore

    mouseConstraint.mouse.element.removeEventListener('DOMMouseScroll', mouseConstraint.mouse.mousewheel)

    // Need this in order to scroll on mobile, but it means we can't interact with the content - we'll reserve touch interactions for when a cursor is available
    const isTouchDevice = window.matchMedia('(hover: none)').matches

    if (isTouchDevice) {
      // @ts-ignore
      mouseConstraint.mouse.element.removeEventListener('touchmove', mouseConstraint.mouse.mousemove)
      // @ts-ignore
      mouseConstraint.mouse.element.removeEventListener('touchstart', mouseConstraint.mouse.mousedown)
      // @ts-ignore
      mouseConstraint.mouse.element.removeEventListener('touchend', mouseConstraint.mouse.mouseup)
    }

    engine.positionIterations = 6
    engine.velocityIterations = 6

    const createHtmlObject = (id: string) => {
      const elem = document.getElementById(id) as any
      const elemSize = elem.getBoundingClientRect()
      const body = Bodies.rectangle(
        Math.max(elemSize.width * 1.2, Math.random() * width * 0.9),
        Math.max(elemSize.height * 1.2, Math.random() * height),
        elemSize.width * 0.95,
        elemSize.height * 0.95,
        {
          render: { fillStyle: 'transparent' },
          frictionAir: 0.2,
          density: 0.1,
        }
      )

      const render = () => {
        const { x, y } = body.position
        elem.style.top = `${y - elemSize.height / 2}px`
        elem.style.left = `${x - elemSize.width / 2}px`
        elem.style.transform = `rotate(${body.angle}rad)`
      }

      return {
        body,
        elem,
        render,
      }
    }

    const htmlObjects = [
      createHtmlObject('box1'),
      createHtmlObject('box2'),
      createHtmlObject('box3'),
      createHtmlObject('box4'),
      createHtmlObject('box5'),
      createHtmlObject('box6'),
      createHtmlObject('box7'),
      createHtmlObject('box8'),
      createHtmlObject('box9'),
      createHtmlObject('box10'),
    ]

    const wallOptions = {
      isStatic: true,
      render: {
        fillStyle: 'transparent',
        strokeStyle: 'transparent',
        lineWidth: 20,
      },
    }
    const walls = [
      Bodies.rectangle(width / 2, height, width, 20, wallOptions),
      Bodies.rectangle(width / 2, 0, width, 20, wallOptions),
      Bodies.rectangle(0, height / 2, 20, height, wallOptions),
      Bodies.rectangle(width, height / 2, 20, height, wallOptions),
    ]

    const bodies = [
      ...htmlObjects.map(htmlObject => htmlObject.body) /*covid, mountain, unicorn, rocket, panda*/,
      ...walls,
      mouseConstraint,
    ] as Array<any>

    let stack

    const useFillerObjects = window.matchMedia('(min-width: 800px)').matches

    if (useFillerObjects) {
      const icons = ['unicorn.png', 'panda.png', 'mountain.png', 'rocket.png']
      const colors = ['#F5D222', '#88C43F', '#E55066', '#0FADCF', '#00B3A4', '#F69022', '#E4F6FA']

      const canvasWidth = width // Width of the canvas
      const canvasHeight = height // Height of the canvas
      const objectWidth = 58 // Width of each object
      const objectHeight = 58 // Height of each object

      const columns = Math.floor(canvasWidth / objectWidth) / 4
      const rows = Math.floor(canvasHeight / objectHeight) / 4

      const columnGap = (canvasWidth - columns * objectWidth) / (columns - 1)
      const rowGap = (canvasHeight - rows * objectHeight) / (rows - 1)

      stack = Composites.stack(0, 0, columns, rows, columnGap, rowGap, function (x: any, y: any) {
        switch (Math.round(Common.random(0, 8))) {
          // case 0: {
          //   const color = colors[Math.floor(Math.random() * colors.length)]

          //   return Bodies.polygon(x, Math.random() * height, 4, Common.random(40, 50), { render: { fillStyle: color } })
          // }

          // case 1: {
          //   const color = colors[Math.floor(Math.random() * colors.length)]

          //   return Bodies.circle(x, Math.random() * height, Common.random(40, 50), { render: { fillStyle: color } })
          // }
          // case 2: {
          //   const color = colors[Math.floor(Math.random() * colors.length)]

          //   return Bodies.polygon(x, Math.random() * height, 3, Common.random(40, 50), { render: { fillStyle: color } })
          // }

          default:
            const radius = 29
            const icon = icons[Math.floor(Math.random() * icons.length)]

            return Bodies.circle(x, Math.random() * height, radius, {
              render: {
                sprite: {
                  texture: `/assets/textures/${icon}`,
                  xScale: 0.7,
                  yScale: 0.7,
                },
              },
              frictionAir: 0.15,
              density: 0.1,
            })
        }
      })

      bodies.push(stack)
    }

    // add all of the bodies to the world
    Composite.add(engine.world, bodies)

    Render.lookAt(render, {
      min: { x: 0, y: 0 },
      max: { x: width, y: height },
    })

    // run the renderer
    Render.run(render)

    // create runner
    var runner = Runner.create()

    // run the engine
    Runner.run(runner, engine)

    let cancel = 0

    ;(function rerender() {
      htmlObjects.forEach(obj => {
        obj.render()
      })
      Engine.update(engine)
      cancel = requestAnimationFrame(rerender)
    })()

    return () => {
      cancelAnimationFrame(cancel)
      renderRef.current = null
      Render.stop(render)
      Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [mounted, width, height, observe])

  if (!mounted) return null

  return (
    <div id="matter-container" ref={observe} className={css['container']}>
      <div id="box1" className={`${css['element']} ${css['white']}`}>
        <span className={css['number']}>350+</span> Speakers
      </div>
      <div id="box2" className={`${css['element']} ${css['teal']}`}>
        <span className={css['number']}>2000+</span> Hours of Content
      </div>
      <div id="box3" className={`${css['element']} ${css['red']}`}>
        <span className={css['number']}>4 </span>Days
      </div>
      <div id="box4" className={`${css['element']} ${css['yellow']}`}>
        <span className={css['number']}>300+</span> Sessions
      </div>
      <div id="box5" className={`${css['element']} ${css['purple']}`}>
        <span className={css['number']}>7 </span>Community Hubs
      </div>
      <div id="box6" className={`${css['element']} ${css['blue']}`}>
        <span className={css['number']}>5500+</span> Attendees
      </div>
      <div id="box7" className={`${css['element']} ${css['orange']}`}>
        <span className={css['number']}>50 </span>Side Events
      </div>
      <div id="box8" className={`${css['element']} ${css['green']}`}>
        <span className={css['number']}>1337 </span>Hacker Basement
      </div>
      <div id="box9" className={`${css['element']} ${css['blue-2']}`}>
        <span className={css['number']}>105+</span> Countries Represented
      </div>
      <div id="box10" className={`${css['element']} ${css['red']}`}>
        <span className={css['number']}>10 </span>Tracks
      </div>
    </div>
  )
}

export default StatsAnimation //unmountOnResizeHOC(StatsAnimation);
