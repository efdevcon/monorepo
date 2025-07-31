import React from "react"

export interface AccordionItem {
  id: number | string
  title: string | React.ReactNode
  body: string | React.ReactNode
}