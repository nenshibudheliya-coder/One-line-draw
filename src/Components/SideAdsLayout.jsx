{/* Google Ads */ }

import AdUnit from "./AdUnit";

const SideAdsLayout = ({ children, showAds }) => {
    return (
        <div className="ad-layout-container">

            {/* LEFT AD */}
            {showAds && (
                <div className="ad-side-container">
                    <AdUnit slot="1111111111" className="ad-unit-block" />
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="main-content-container">

                {/* TOP AD */}
                {showAds && (
                    <AdUnit slot="2222222222" className="ad-unit-block" />
                )}

                {children}

                {/* BOTTOM AD */}
                {showAds && (
                    <AdUnit slot="3333333333" className="ad-unit-block" />
                )}
            </div>

            {/* RIGHT AD */}
            {showAds && (
                <div className="ad-side-container">
                    <AdUnit slot="4444444444" className="ad-unit-block" />
                </div>
            )}

        </div>
    );
};

export default SideAdsLayout;