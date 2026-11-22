import { ImageResponse } from "next/og";

export const alt = "General Portal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "80px",
                backgroundColor: "#161616",
                color: "#f4f4f4",
            }}
        >
            <div style={{ display: "flex", fontSize: 108, fontWeight: 700, lineHeight: 1.1 }}>
                General Portal
            </div>
            <div
                style={{
                    display: "flex",
                    width: 120,
                    height: 8,
                    marginTop: 36,
                    backgroundColor: "#0f62fe",
                }}
            />
            <div style={{ display: "flex", fontSize: 40, marginTop: 36, color: "#a8a8a8" }}>
                The self-hosted workspace OS
            </div>
        </div>,
        { ...size },
    );
}
