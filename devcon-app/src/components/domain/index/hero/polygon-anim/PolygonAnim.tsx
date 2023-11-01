import React from 'react'
import css from './polyanim.module.scss'
import Sketch from './app.js'
//@ts-ignore
import fragment from './demo3/fragment.glsl'
//@ts-ignore
import vertex from './demo3/vertex.glsl'

const Polygon = () => {
  React.useEffect(() => {
    // const sketch = new Sketch({
    //   dom: document.getElementById('container'),
    //   next: document.querySelector('.nav-next'),
    //   detail: 10,
    //   duration: 2,
    //   fragment: fragment,
    //   vertex: vertex,
    //   offsettop: 0,
    //   ease: 'power2.in',
    // })

    // const sketch = new Sketch({
    //   dom: document.getElementById('container'),
    //   next: document.querySelector('.nav-next'),
    //   detail: 50,
    //   fragment: fragment,
    //   vertex: vertex,
    //   offsettop: 0.9,
    //   ease: "power2.in"
    // });

    // const sketch = new Sketch({
    //   dom: document.getElementById('container'),
    //   next: document.querySelector('.nav-next'),
    //   detail: 100,
    //   fragment: fragment,
    //   vertex: vertex,
    //   offsettop: 0.4,
    // });

    const sketch = new Sketch({
      dom: document.getElementById('container'),
      next: document.querySelector('.nav-next'),
      detail: 20,
      fragment: fragment,
      vertex: vertex,
      offsettop: 0.4,
    })

    // const sketch = new Sketch({
    //   dom: document.getElementById('container'),
    //   next: document.querySelector('.nav-next'),
    //   detail: 100,
    //   fragment: fragment,
    //   vertex: vertex,
    //   offsettop: 0.5,
    // })

    // sketch.render()
  }, [])

  return (
    <div className={`${css['polygon-anim']}`}>
      <div
        id="container"
        className="aspect"
        data-images='["carousel/bogota/Bogota0.jpg", "participate_background.png"]'
      ></div>
      <div className="content">
        <h2 className="content__title">
          <span>South Alpine</span>
          <em>Engineering</em>
          <span>Solutions</span>
        </h2>
        <a className="nav nav-next">Next</a>
      </div>
    </div>
  )
}

export default Polygon
