{/* Google Ads */ }

import { useEffect, useRef, useState } from "react";

const AdUnit = ({ slot, style, className }) => {
    const adRef = useRef(null);

    useEffect(() => {
        try {
            if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("Ad error:", e);
        }
    }, []);

    return (
        <ins
            className={`adsbygoogle ${className || ""}`}
            style={style || { display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXX"
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
            ref={adRef}
        ></ins>
    );
};

export default AdUnit;