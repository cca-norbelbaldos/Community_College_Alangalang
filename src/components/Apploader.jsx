import React from "react";

/**
 * AppLoader
 * Minimal, completely transparent overlay containing only the swinging golden bell.
 */
export default function AppLoader() {
  return (
    <div className="al-root">
      <style>{`
        .al-root {
          --gold: #e8b339;
          --gold-soft: #fff1c9;
          --gold-deep: #b9821e;

          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          min-height: 100vh;
          background: rgba(0, 0, 0, 0); /* 100% transparent background */
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 9999; /* Keeps the bell resting on top of content */
          pointer-events: none; /* Prevents the invisible container from blocking clicks */
        }

        .al-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ---------- Bell mark ---------- */
        .al-bell-wrap {
          position: relative;
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .al-ring-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 1.5px solid var(--gold);
          opacity: 0;
          animation: al-pulse 1.8s ease-out infinite;
        }
        .al-ring-pulse.delay {
          animation-delay: 0.9s;
        }

        @keyframes al-pulse {
          0%   { transform: scale(0.55); opacity: 0.55; }
          70%  { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1.15); opacity: 0; }
        }

        .al-bell-svg {
          position: relative;
          z-index: 2;
          width: 56px;
          height: 56px;
          transform-origin: 50% 12%;
          animation: al-swing 1.8s cubic-bezier(.45,0,.55,1) infinite;
          filter: drop-shadow(0 6px 14px rgba(232,179,57,0.35));
        }

        @keyframes al-swing {
          0%   { transform: rotate(0deg); }
          12%  { transform: rotate(-16deg); }
          24%  { transform: rotate(12deg); }
          36%  { transform: rotate(-9deg); }
          48%  { transform: rotate(6deg); }
          60%  { transform: rotate(-3deg); }
          72%  { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }

        .al-clapper {
          transform-origin: 50% 0%;
          animation: al-clap 1.8s cubic-bezier(.45,0,.55,1) infinite;
        }
        @keyframes al-clap {
          0%   { transform: rotate(0deg); }
          12%  { transform: rotate(10deg); }
          24%  { transform: rotate(-8deg); }
          36%  { transform: rotate(6deg); }
          48%  { transform: rotate(-4deg); }
          60%  { transform: rotate(2deg); }
          72%  { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .al-bell-svg, .al-clapper, .al-ring-pulse {
            animation: none !important;
          }
        }
      `}</style>

      <div className="al-stage">
        <div className="al-bell-wrap">
          <div className="al-ring-pulse" />
          <div className="al-ring-pulse delay" />

          <svg
            className="al-bell-svg"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff1c9" />
                <stop offset="55%" stopColor="#e8b339" />
                <stop offset="100%" stopColor="#b9821e" />
              </linearGradient>
            </defs>

            {/* hanger loop */}
            <circle cx="32" cy="8" r="3.4" stroke="#e8b339" strokeWidth="2.4" />

            {/* bell body */}
            <path
              d="M32 13
                 C 20 13, 16 24, 16 34
                 C 16 40, 13 43, 10.5 46
                 C 9.5 47.3, 10.2 49, 12 49
                 L 52 49
                 C 53.8 49, 54.5 47.3, 53.5 46
                 C 51 43, 48 40, 48 34
                 C 48 24, 44 13, 32 13 Z"
              fill="url(#bellGrad)"
              stroke="#8c5e10"
              strokeWidth="1"
            />

            {/* base rim */}
            <rect x="9" y="49" width="46" height="5" rx="2.5" fill="#d49a26" stroke="#8c5e10" strokeWidth="1" />

            {/* clapper */}
            <g className="al-clapper" transform="translate(32,49)">
              <line x1="0" y1="0" x2="0" y2="9" stroke="#8c5e10" strokeWidth="2" strokeLinecap="round" />
              <circle cx="0" cy="11" r="3.2" fill="#fff1c9" stroke="#b9821e" strokeWidth="1.2" />
            </g>

            {/* shine */}
            <path
              d="M22 20 C 20 26, 19 33, 19 38"
              stroke="#fff6dc"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}