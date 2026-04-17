import { useEffect } from "react";
import AdUnit from "./AdUnit";

const SideAdsLayout = ({ children, showAds }) => {

    useEffect(() => {
        if (!showAds) return;

        const loadAdsScript = () => {
            if (document.querySelector('script[src*="adsbygoogle.js"]')) return;

            const script = document.createElement("script");
            script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXX";
            script.async = true;
            script.crossOrigin = "anonymous";
            document.head.appendChild(script);

            // Cleanup listeners
            window.removeEventListener('scroll', loadAdsScript);
            window.removeEventListener('mousemove', loadAdsScript);
            window.removeEventListener('touchstart', loadAdsScript);
            window.removeEventListener('keydown', loadAdsScript);
        };

        // Load on interaction to avoid third-party cookie warnings on initial load
        // and improve Lighthouse performance
        window.addEventListener('scroll', loadAdsScript, { passive: true });
        window.addEventListener('mousemove', loadAdsScript, { passive: true });
        window.addEventListener('touchstart', loadAdsScript, { passive: true });
        window.addEventListener('keydown', loadAdsScript, { passive: true });

        // Trigger after a few seconds if no interaction
        const timer = setTimeout(loadAdsScript, 5000);

        return () => {
            window.removeEventListener('scroll', loadAdsScript);
            window.removeEventListener('mousemove', loadAdsScript);
            window.removeEventListener('touchstart', loadAdsScript);
            window.removeEventListener('keydown', loadAdsScript);
            clearTimeout(timer);
        };
    }, [showAds]);

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