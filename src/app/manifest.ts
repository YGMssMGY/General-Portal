import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "General Portal",
        short_name: "General Portal",
        description: "The self-hosted workspace OS",
        start_url: "/",
        display: "standalone",
        background_color: "#f4f4f4",
        theme_color: "#0f62fe",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
        categories: ["productivity", "business"],
    };
}
