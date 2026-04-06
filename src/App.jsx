// import { useState } from 'react'
import OneLineDraw from './Components/OneLineDraw.jsx'
import SideAdsLayout from "./Components/SideAdsLayout"; // Google Ads //
import './App.css'

function App() {

  return (
    <>
      <SideAdsLayout showAds={true}> {/* Google Ads */}

        <OneLineDraw />

      </SideAdsLayout>
    </>
  )
}

export default App