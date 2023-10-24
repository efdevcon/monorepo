import React from 'react'
import css from './carousel.module.scss'

import Image1 from './images/image1.jpg'
import Image2 from './images/image2.jpg'
import Image3 from './images/image3.jpg'
import Image4 from './images/image4.jpg'
import Image5 from './images/image5.jpg'
import Image6 from './images/image6.jpg'

export function Carousel() {
  return (
    <div className={css['container']}>
      <h3>Bogota Colombia</h3>

      <div className={css['images']}>
        <img src={Image1} alt="Bogota" />
        <img src={Image2} alt="Bogota" />
        <img src={Image3} alt="Bogota" />
        <img src={Image4} alt="Bogota" />
        <img src={Image5} alt="Bogota" />
        <img src={Image6} alt="Bogota" />
        <img src={Image1} alt="Bogota" />
        <img src={Image2} alt="Bogota" />
        <img src={Image3} alt="Bogota" />
        <img src={Image4} alt="Bogota" />
        <img src={Image5} alt="Bogota" />
        <img src={Image6} alt="Bogota" />
      </div>
    </div>
  )
}
