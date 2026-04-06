import React, { lazy, Suspense } from 'react'
import SideAdsLayout from "./Components/SideAdsLayout"; // Google Ads //
import './App.css'

const OneLineDraw = lazy(() => import('./Components/OneLineDraw.jsx'));

function App() {

  return (
    <>
      <SideAdsLayout showAds={true}> {/* Google Ads */}
        <Suspense fallback={<div className="loading">Loading Game...</div>}>
          <OneLineDraw />
        </Suspense>
      </SideAdsLayout>
    </>
  )
}

export default App