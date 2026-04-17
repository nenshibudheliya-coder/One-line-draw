import React, { lazy, Suspense } from 'react'
import './App.css'

const OneLineDraw = lazy(() => import('./Components/OneLineDraw.jsx'));

function App() {

  return (
    <>
      <OneLineDraw />
    </>
  )
}

export default App