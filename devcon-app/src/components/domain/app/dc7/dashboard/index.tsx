import React from 'react'

export const Dashboard = () => {
  return (
    // <div className="section">
    <div className="h-[2000px] flex flex-col justify-center items-center">
      {Array.from({ length: 150 }, (_, index) => (
        <div key={index}>Dashboard Page Content</div>
      ))}
    </div>
  )
}
