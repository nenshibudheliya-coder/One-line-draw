{/* Google Ads */ }

import AdUnit from "./AdUnit";

const SideAdsLayout = ({ children, showAds }) => {
    return (
        <div style={{ display: "flex" }}>

            {/* LEFT AD */}
            {showAds && (
                <div style={{ width: "120px" }}>
                    <AdUnit slot="1111111111" style={{ display: "block" }} />
                </div>
            )}

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, textAlign: "center" }}>

                {/* TOP AD */}
                {showAds && (
                    <AdUnit slot="2222222222" style={{ display: "block" }} />
                )}

                {children}

                {/* BOTTOM AD */}
                {showAds && (
                    <AdUnit slot="3333333333" style={{ display: "block" }} />
                )}
            </div>

            {/* RIGHT AD */}
            {showAds && (
                <div style={{ width: "120px" }}>
                    <AdUnit slot="4444444444" style={{ display: "block" }} />
                </div>
            )}

        </div>
    );
};

export default SideAdsLayout;