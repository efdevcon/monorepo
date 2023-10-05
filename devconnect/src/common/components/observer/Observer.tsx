import React from 'react'

// useful: https://wilsotobianco.com/experiments/intersection-observer-playground/

type ObserverProps = {
  children: React.ReactElement
  activeClassName?: string
  observerOptions?: IntersectionObserverInit
  repeating?: boolean
  onVisibilityChange?: (visible: boolean) => any
}

const Observer = (props: ObserverProps) => {
  const childRef = React.createRef<any>()
  const [enteredViewPort, setEnteredViewPort] = React.useState(false)

  React.useEffect(() => {
    if (!childRef.current) return

    const observer = new IntersectionObserver(
      rects => {
        const rect = rects[0]

        if (rect && rect.isIntersecting) {
          setEnteredViewPort(true)
        } else if (props.repeating) {
          setEnteredViewPort(false)
        }
      },
      {
        root: null, // null means root is viewport
        rootMargin: '0px',
        threshold: 0.1,
        ...props.observerOptions,
      }
    )

    observer.observe(childRef.current)

    return () => observer.disconnect()
  }, [childRef])

  React.useEffect(() => {
    if (props.onVisibilityChange) props.onVisibilityChange(enteredViewPort)
  }, [enteredViewPort, props.onVisibilityChange])

  let className = props.children.props.className

  if (enteredViewPort) {
    if (props.activeClassName) {
      className += ` ${props.activeClassName}`
    } else {
      className += ' fade-in-up'
    }
  }

  return React.cloneElement(props.children, {
    ref: childRef,
    className,
  })
}

export default Observer
