'use client'

/**
 * SharthokBucks 1000 currency bill – decorative bill shown on leaderboard.
 * Inline styles scoped under .shb-bill to avoid global conflicts.
 */
export default function SharthokBucksCurrency() {
    const watermarkImg = 'data:image/jpeg;base64,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'

    return (
        <div className="shb-bill">
            <style>{`
                .shb-bill * { margin: 0; padding: 0; box-sizing: border-box; }
                .shb-bill .currency {
                    width: 100%;
                    max-width: 700px;
                    height: 320px;
                    margin: 0 auto;
                    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 20%, #a5d6a7 40%, #81c784 60%, #fff3e0 80%, #ffe0b2 100%);
                    border: 3px solid #2e7d32;
                    border-radius: 8px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.4), inset 0 0 100px rgba(255,255,255,0.3);
                }
                .shb-bill .border-pattern {
                    position: absolute;
                    top: 8px; left: 8px; right: 8px; bottom: 8px;
                    border: 2px solid #1b5e20;
                    border-radius: 4px;
                }
                .shb-bill .border-pattern::before {
                    content: '';
                    position: absolute;
                    top: 4px; left: 4px; right: 4px; bottom: 4px;
                    border: 1px dashed #388e3c;
                    border-radius: 2px;
                }
                .shb-bill .watermark {
                    position: absolute;
                    top: 50%; left: 15%;
                    transform: translateY(-50%);
                    font-size: 80px;
                    font-weight: bold;
                    color: rgba(255,152,0,0.08);
                    font-family: 'Arial Black', sans-serif;
                }
                .shb-bill .top-banner {
                    position: absolute;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                }
                .shb-bill .republic-text { font-size: 10px; letter-spacing: 3px; color: #1b5e20; font-weight: bold; }
                .shb-bill .main-title {
                    font-size: 22px; font-weight: bold; color: #2e7d32;
                    letter-spacing: 4px;
                    text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
                    font-family: Georgia, serif;
                }
                .shb-bill .hindi-text { font-size: 11px; color: #e65100; margin-top: 2px; font-style: italic; }
                .shb-bill .portrait-frame {
                    position: absolute;
                    top: 65px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 115px;
                    height: 145px;
                    background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
                    border: 4px solid #bf360c;
                    border-radius: 50% 50% 45% 45%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: inset 0 0 20px rgba(191,54,12,0.2), 0 4px 15px rgba(0,0,0,0.3);
                    overflow: hidden;
                }
                .shb-bill .portrait-img {
                    width: 140%;
                    height: auto;
                    object-fit: cover;
                    object-position: center top;
                    filter: sepia(0.5) contrast(1.2) brightness(1.05) saturate(0.5);
                    mix-blend-mode: multiply;
                }
                .shb-bill .portrait-overlay {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(46,125,50,0.08) 2px, rgba(46,125,50,0.08) 3px);
                    pointer-events: none;
                }
                .shb-bill .portrait-name {
                    position: absolute;
                    bottom: -22px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 8px;
                    color: #5d4037;
                    letter-spacing: 1px;
                    white-space: nowrap;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .shb-bill .left-section {
                    position: absolute;
                    left: 25px;
                    top: 50%;
                    transform: translateY(-50%);
                    text-align: center;
                }
                .shb-bill .denomination-large {
                    font-size: 52px;
                    font-weight: bold;
                    color: #2e7d32;
                    text-shadow: 2px 2px 0 rgba(255,255,255,0.5);
                    line-height: 1;
                }
                .shb-bill .currency-symbol { font-size: 20px; color: #e65100; font-weight: bold; }
                .shb-bill .serial-left { font-size: 9px; color: #c62828; letter-spacing: 1px; margin-top: 10px; font-family: 'Courier New', monospace; }
                .shb-bill .right-section {
                    position: absolute;
                    right: 25px;
                    top: 50%;
                    transform: translateY(-50%);
                    text-align: center;
                }
                .shb-bill .emblem {
                    width: 55px;
                    height: 55px;
                    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border: 2px solid #e65100;
                    margin: 0 auto 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                .shb-bill .emblem-icon { font-size: 28px; }
                .shb-bill .serial-right { font-size: 9px; color: #c62828; letter-spacing: 1px; font-family: 'Courier New', monospace; }
                .shb-bill .bottom-section {
                    position: absolute;
                    bottom: 15px;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: space-between;
                    padding: 0 30px;
                    align-items: flex-end;
                }
                .shb-bill .motto { font-size: 8px; color: #1b5e20; font-style: italic; letter-spacing: 1px; }
                .shb-bill .motto-hindi { font-size: 7px; color: #e65100; }
                .shb-bill .denomination-words { font-size: 10px; color: #2e7d32; font-weight: bold; text-align: center; }
                .shb-bill .governor-sign { text-align: right; font-size: 7px; color: #5d4037; }
                .shb-bill .signature-line { width: 70px; border-bottom: 1px solid #5d4037; margin-bottom: 3px; margin-left: auto; }
                .shb-bill .corner-tl { position: absolute; top: 25px; left: 25px; font-size: 16px; font-weight: bold; color: #2e7d32; }
                .shb-bill .corner-tr { position: absolute; top: 25px; right: 25px; font-size: 16px; font-weight: bold; color: #e65100; }
                .shb-bill .corner-bl { position: absolute; bottom: 45px; left: 25px; font-size: 12px; font-weight: bold; color: #e65100; }
                .shb-bill .corner-br { position: absolute; bottom: 45px; right: 25px; font-size: 12px; font-weight: bold; color: #2e7d32; }
                .shb-bill .security-strip {
                    position: absolute;
                    left: 175px;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: repeating-linear-gradient(0deg, #ff9800, #ff9800 5px, #4caf50 5px, #4caf50 10px);
                    opacity: 0.6;
                }
                .shb-bill .fine-print {
                    position: absolute;
                    bottom: 55px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 6px;
                    color: #666;
                    letter-spacing: 0.5px;
                }
                .shb-bill .guilloche {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background:
                        radial-gradient(ellipse at 20% 50%, transparent 40%, rgba(46,125,50,0.03) 41%, transparent 42%),
                        radial-gradient(ellipse at 80% 50%, transparent 40%, rgba(230,81,0,0.03) 41%, transparent 42%),
                        repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(46,125,50,0.02) 10px, rgba(46,125,50,0.02) 11px);
                    pointer-events: none;
                }
                .shb-bill .side-langs-left {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%) rotate(-90deg);
                    font-size: 6px;
                    color: #666;
                    white-space: nowrap;
                    letter-spacing: 2px;
                }
                .shb-bill .side-langs-right {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%) rotate(90deg);
                    font-size: 6px;
                    color: #666;
                    white-space: nowrap;
                    letter-spacing: 2px;
                }
                .shb-bill .watermark-portrait {
                    position: absolute;
                    right: 95px;
                    top: 75px;
                    width: 45px;
                    height: 55px;
                    opacity: 0.12;
                    border-radius: 50%;
                    overflow: hidden;
                }
                .shb-bill .watermark-portrait img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(0.8); }
            `}</style>
            <div className="currency">
                <div className="guilloche" />
                <div className="border-pattern" />
                <div className="security-strip" />
                <div className="watermark">श₿</div>
                <div className="watermark-portrait">
                    <img src={watermarkImg} alt="watermark" />
                </div>
                <div className="side-langs-left">एक हज़ार शार्थोक बक्स • ONE THOUSAND SHARTHOKBUCKS</div>
                <div className="side-langs-right">LEGAL TENDER FOR ALL IMAGINARY DEBTS • काल्पनिक मुद्रा</div>
                <div className="corner-tl">₴1000</div>
                <div className="corner-tr">₹$1000</div>
                <div className="top-banner">
                    <div className="republic-text">UNITED REPUBLIC OF PRODUCTIVITY</div>
                    <div className="main-title">SHARTHOKBUCKS</div>
                    <div className="hindi-text">शार्थोक बक्स • भारत-अमेरिका संयुक्त बैंक</div>
                </div>
                <div className="left-section">
                    <div className="currency-symbol">₴₹$</div>
                    <div className="denomination-large">1000</div>
                    <div className="serial-left">SHB 420694200</div>
                </div>
                <div className="portrait-frame">
                    <img className="portrait-img" src={watermarkImg} alt="Sharthok" />
                    <div className="portrait-overlay" />
                    <div className="portrait-name">Sharthok The Visionary</div>
                </div>
                <div className="right-section">
                    <div className="emblem">
                        <span className="emblem-icon">🦚</span>
                    </div>
                    <div className="serial-right">JSK 800085000</div>
                </div>
                <div className="corner-bl">एक हज़ार</div>
                <div className="corner-br">$1000₹</div>
                <div className="fine-print">COUNTERFEITING IS PUNISHABLE BY AWKWARD MEETINGS WITH HR</div>
                <div className="bottom-section">
                    <div>
                        <div className="motto">&quot;IN SPREADSHEETS WE TRUST&quot;</div>
                        <div className="motto-hindi">सत्यमेव जयते... जब HR देख नहीं रहा</div>
                    </div>
                    <div className="denomination-words">ONE THOUSAND SHARTHOKBUCKS ONLY</div>
                    <div className="governor-sign">
                        <div className="signature-line" />
                        <div>Chief Productivity Officer</div>
                        <div style={{ fontStyle: 'italic' }}>Sharthok Reserve Bank</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
