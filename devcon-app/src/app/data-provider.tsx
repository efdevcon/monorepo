'use client'
import React from 'react'
import { DataProvider, Data as DataType } from './data-context'
import { PWAPrompt } from 'components/domain/app/pwa-prompt'

const DataWrapper = ({ children, data }: { children: React.ReactNode; data: DataType }) => {
  return (
    <DataProvider value={data}>
      <PWAPrompt />
      {children}
    </DataProvider>
  )
}

export default DataWrapper
