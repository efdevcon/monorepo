import React from "react"

export interface AccordionItem {
  id: number | string
  title: string | React.ReactChild
  body: string | React.ReactChild
}