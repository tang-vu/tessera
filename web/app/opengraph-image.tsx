import { ImageResponse } from "next/og";

// Static social-share card (1200x630), generated at build time.
export const runtime = "nodejs";
export const alt = "Tessera — On-Chain Credit Bureau for AI Agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const IRIS = "#7c83ff";
const VIOLET = "#a855f7";
const CYAN = "#22d3ee";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #070810 0%, #0c0e1c 55%, #0a1320 100%)",
          color: "#eef0fb",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Mosaic accent (top-right) */}
        <div style={{ position: "absolute", top: 64, right: 72, display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map((r) => (
            <div key={r} style={{ display: "flex", gap: 12 }}>
              {[0, 1, 2].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: [IRIS, VIOLET, CYAN][(r + c) % 3],
                    opacity: 0.14 + ((r + c) % 4) * 0.16,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: IRIS }} />
              <div style={{ width: 22, height: 22, borderRadius: 6, background: VIOLET, opacity: 0.6 }} />
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: VIOLET, opacity: 0.6 }} />
              <div style={{ width: 22, height: 22, borderRadius: 6, background: CYAN, opacity: 0.35 }} />
            </div>
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1 }}>Tessera</div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: IRIS,
              border: "1px solid rgba(124,131,255,0.4)",
              borderRadius: 999,
              padding: "6px 16px",
              letterSpacing: 2,
            }}
          >
            HASHKEY CHAIN
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            The on-chain credit bureau
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              backgroundImage: `linear-gradient(110deg, ${IRIS}, ${VIOLET} 55%, ${CYAN})`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            for AI agents.
          </div>
        </div>

        {/* Tagline */}
        <div style={{ display: "flex", fontSize: 28, color: "#9aa0c0" }}>
          Honest agents get cheaper capital. Dishonest ones get cut off.
        </div>
      </div>
    ),
    { ...size }
  );
}
