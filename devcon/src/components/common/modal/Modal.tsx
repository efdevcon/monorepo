import React from 'react'
import { createPortal } from 'react-dom'
import css from './modal.module.scss'
import IconClose from 'assets/icons/cross.svg'
import IconChevronLeft from 'assets/icons/chevron_left.svg'
import IconChevronRight from 'assets/icons/chevron_right.svg'
import { Button } from 'components/common/button'
import Image from 'next/legacy/image'

type ModalProps = {
  open: boolean
  unstyled?: boolean
  autoHeight?: boolean
  className?: string
  close: () => void
  children: React.ReactNode
  [key: string]: any
}

const SliderControls = (props: any) => {
  return (
    <div className={css['controls']}>
      <div className={css['dots']}>
        {props.slides.map((_: any, i: number) => {
          const selected = i === props.currentSlideIndex

          let className = css['dot']

          if (selected) className += ` ${css['active']}`

          return (
            <div key={i} className={className} onClick={() => props.setCurrentSlideIndex(i)}>
              <div className={css['circle']}></div>
            </div>
          )
        })}
      </div>

      <div className={css['arrows']}>
        <Button
          className={`${css['arrow']} red sm squared`}
          disabled={props.currentSlideIndex === 0}
          onClick={() => props.setCurrentSlideIndex((prev: number) => prev - 1)}
        >
          <IconChevronLeft />
        </Button>
        <Button
          className={`${css['arrow']} red sm squared`}
          disabled={props.currentSlideIndex === props.slides.length - 1}
          onClick={() => props.setCurrentSlideIndex((prev: number) => prev + 1)}
        >
          <IconChevronRight />
        </Button>
      </div>
    </div>
  )
}

const ModalContent = (props: ModalProps) => {
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0)
  const childrenAsArray = React.Children.toArray(props.children)
  const currentSlide: any = childrenAsArray[currentSlideIndex]

  // TO-DO: This fails on hot reload?
  const isSlider =
    childrenAsArray.length > 0 &&
    childrenAsArray.every((element: any) => {
      return element.type.displayName === 'ModalSlide'
    })

  const activeProps = isSlider && currentSlide ? currentSlide.props : props

  const title = activeProps.title || props.title
  const image = activeProps.image || props.image

  // Prevent page scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  let className = css['container']

  if (props.unstyled) className += ` ${css['unstyled']}`

  return (
    <div
      className={className}
      data-type="modal-container"
      onClick={e => {
        e.stopPropagation()
      }}
    >
      {image && (
        <div className={css['left']}>
          <Image src={image} objectFit="cover" alt="Modal image" />
        </div>
      )}

      <div className={css['right']}>
        <IconClose onClick={props.close} className={`icon ${css['close']}`} />

        {title && (
          <div className={css['header']}>
            <h4 className="text-uppercase title">{title} —</h4>
          </div>
        )}

        <div className={css['content']} data-type="modal-content">
          {isSlider ? (
            <div className={css['slides']}>
              {React.Children.map(props.children, (child, index) => {
                let className = css['slide']

                const selected = index === currentSlideIndex

                if (selected) className += ` ${css['selected']}`

                return <div className={className}>{child}</div>
              })}
            </div>
          ) : (
            props.children
          )}

          {isSlider && (
            <SliderControls
              slides={childrenAsArray}
              currentSlideIndex={currentSlideIndex}
              setCurrentSlideIndex={setCurrentSlideIndex}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const ModalSlide = (props: any) => {
  return <div>{props.children}</div>
}

ModalSlide.displayName = 'ModalSlide'

export { ModalSlide }

export const Modal = (props: ModalProps) => {
  if (!props.open) return <></>

  let className = css['modal']

  if (props.autoHeight) {
    className += ` ${css['auto-height']}`
  }

  if (props.className) {
    className += ` ${props.className}`
  }

  return (
    <>
      {createPortal(
        <div
          className={className}
          onClick={e => {
            e.stopPropagation()
            props.close()
          }}
        >
          <ModalContent {...props} />
        </div>,
        document.body
      )}
    </>
  )
}

/*
  <Modal image="" title="">
    <ModalSlide image="" title="">
      Some content goes here
    </ModalSlide>
    <ModalSlide>

    </ModalSlide>
  </Modal>

*/
