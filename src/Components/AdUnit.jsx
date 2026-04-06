{/* Google Ads */ }

import { useEffect, useRef, useState } from "react";

const AdUnit = ({ slot, style }) => {
    const adRef = useRef(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            if (window.adsbygoogle && adRef.current) {
                window.adsbygoogle.push({});
                setLoaded(true);
            }
        } catch (e) {
            console.log("Ad error:", e);
        }
    }, []);

    // agar ad load nahi hua toh hide
    if (!loaded) return null;

    return (
        <ins
            className="adsbygoogle"
            style={style}
            data-ad-client="ca-pub-XXXXXXXXXXXX"
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
            ref={adRef}
        ></ins>
    );
};

export default AdUnit;