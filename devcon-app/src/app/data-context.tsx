'use client'
import React from 'react'

export type Data = {
  sessions?: any
  speakers?: any
}

const DataContext = React.createContext<Data>({ sessions: [], speakers: [] })

export const DataProvider = DataContext.Provider
export const DataConsumer = DataContext.Consumer

export default DataContext
