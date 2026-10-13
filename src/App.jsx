import React from 'react';
import './App.css';

function App() {
  return (
    <div className="overlay-wrapper">
      <div className="overlay-header">
        <div className="corner-decor top-left"></div>
        <div className="corner-decor top-right"></div>
        <div className="corner-decor bottom-left"></div>
        <div className="corner-decor bottom-right"></div>

        {/* ================= الفريق الأول (يسار) ================= */}
        <div className="team-container team-left">
          <div className="team-header">
            <div className="team-logo-placeholder">
              <span className="logo-text">RED</span>
            </div>
            <div className="team-info-block">
              <h2 className="team-title">NCSU RED</h2>
              <span className="first-pick-badge">1st Pick</span>
            </div>
          </div>

          <div className="team-content">
            <div className="picks-group">
              <span className="section-label">PICKS</span>
              <div className="slots-row">
                <div className="slot pick-slot">PICK 1</div>
                <div className="slot pick-slot">PICK 2</div>
                <div className="slot pick-slot">PICK 3</div>
                <div className="slot pick-slot">PICK 4</div>
                <div className="slot pick-slot">PICK 5</div>
                
                <div className="stack-container">
                  <div className="bans-on-top">
                    <div className="slot mini-ban">BAN</div>
                    <div className="slot mini-ban">BAN</div>
                  </div>
                  <div className="slot pick-slot special-6">PICK 6</div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ================= المنتصف: الشعار والنتيجة ================= */}
        <div className="match-center">
          <div className="branding">
            {/* الشعار الحقيقي المستورد من مجلد public */}
            <img src="/logo.png" alt="Deadlock AR Logo" className="official-logo" />
          </div>
          <div className="score-board">
            <span className="score-num">0</span>
            <span className="diamond-accent">✦</span>
            <span className="score-num">0</span>
          </div>
          <span className="match-type">BO1 • MATCH 1</span>
        </div>

        {/* ================= الفريق الثاني (يمين) ================= */}
        <div className="team-container team-right">
          <div className="team-header">
            <div className="team-info-block text-right">
              <h2 className="team-title">KANSAS</h2>
            </div>
            <div className="team-logo-placeholder">
              <span className="logo-text">KAN</span>
            </div>
          </div>

          <div className="team-content">
            <div className="picks-group">
              <span className="section-label">PICKS</span>
              <div className="slots-row">
                
                <div className="stack-container">
                  <div className="bans-on-top">
                    <div className="slot mini-ban">BAN</div>
                    <div className="slot mini-ban">BAN</div>
                  </div>
                  <div className="slot pick-slot special-6">PICK 6</div>
                </div>

                <div className="slot pick-slot">PICK 5</div>
                <div className="slot pick-slot">PICK 4</div>
                <div className="slot pick-slot">PICK 3</div>
                <div className="slot pick-slot">PICK 2</div>
                <div className="slot pick-slot">PICK 1</div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;