import React, { ReactNode } from 'react'

/*
  Component has become a little redundant; effectively equal to just doing:

  <div className="label *type*">...</div>
 
  Can consider removing it - keeping it around for now until design system is fleshed out, just in case Labels should get more complex and warrant a component
*/
export type LabelProps = {
  type?: string
  className?: string
  children?: ReactNode
  style?: {
    [key: string]: string
  }
}

export const Label = (props: LabelProps) => {
  let className = 'label'

  if (props.className) className += ` ${props.className}`

  if (props.type) className += ` ${props.type}`

  return (
    <div className={className} style={props.style}>
      {props.children}
    </div>
  )
}
