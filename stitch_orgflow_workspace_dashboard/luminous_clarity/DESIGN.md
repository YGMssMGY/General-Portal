---
name: Luminous Clarity
colors:
    surface: "#f5faf8"
    surface-dim: "#d6dbd9"
    surface-bright: "#f5faf8"
    surface-container-lowest: "#ffffff"
    surface-container-low: "#f0f5f2"
    surface-container: "#eaefed"
    surface-container-high: "#e4e9e7"
    surface-container-highest: "#dee4e1"
    on-surface: "#171d1c"
    on-surface-variant: "#3d4947"
    inverse-surface: "#2c3130"
    inverse-on-surface: "#edf2f0"
    outline: "#6d7a77"
    outline-variant: "#bcc9c6"
    surface-tint: "#006a61"
    primary: "#00685f"
    on-primary: "#ffffff"
    primary-container: "#008378"
    on-primary-container: "#f4fffc"
    inverse-primary: "#6bd8cb"
    secondary: "#4b41e1"
    on-secondary: "#ffffff"
    secondary-container: "#645efb"
    on-secondary-container: "#fffbff"
    tertiary: "#924628"
    on-tertiary: "#ffffff"
    tertiary-container: "#b05e3d"
    on-tertiary-container: "#fffbff"
    error: "#ba1a1a"
    on-error: "#ffffff"
    error-container: "#ffdad6"
    on-error-container: "#93000a"
    primary-fixed: "#89f5e7"
    primary-fixed-dim: "#6bd8cb"
    on-primary-fixed: "#00201d"
    on-primary-fixed-variant: "#005049"
    secondary-fixed: "#e2dfff"
    secondary-fixed-dim: "#c3c0ff"
    on-secondary-fixed: "#0f0069"
    on-secondary-fixed-variant: "#3323cc"
    tertiary-fixed: "#ffdbce"
    tertiary-fixed-dim: "#ffb59a"
    on-tertiary-fixed: "#370e00"
    on-tertiary-fixed-variant: "#773215"
    background: "#f5faf8"
    on-background: "#171d1c"
    surface-variant: "#dee4e1"
typography:
    display-xl:
        fontFamily: Plus Jakarta Sans
        fontSize: 36px
        fontWeight: "700"
        lineHeight: 44px
        letterSpacing: -0.02em
    headline-lg:
        fontFamily: Plus Jakarta Sans
        fontSize: 24px
        fontWeight: "600"
        lineHeight: 32px
        letterSpacing: -0.01em
    headline-md:
        fontFamily: Plus Jakarta Sans
        fontSize: 20px
        fontWeight: "600"
        lineHeight: 28px
    body-lg:
        fontFamily: Inter
        fontSize: 16px
        fontWeight: "400"
        lineHeight: 24px
    body-md:
        fontFamily: Inter
        fontSize: 14px
        fontWeight: "400"
        lineHeight: 20px
    label-md:
        fontFamily: Inter
        fontSize: 14px
        fontWeight: "500"
        lineHeight: 20px
    label-sm:
        fontFamily: Inter
        fontSize: 12px
        fontWeight: "600"
        lineHeight: 16px
rounded:
    sm: 0.25rem
    DEFAULT: 0.5rem
    md: 0.75rem
    lg: 1rem
    xl: 1.5rem
    full: 9999px
spacing:
    unit: 8px
    container-margin: 24px
    gutter: 24px
    sidebar-width: 280px
    topbar-height: 64px
    card-padding: 20px
---

## Brand & Style

The visual identity of this design system centers on clarity, efficiency, and professional reliability. It is designed for high-productivity environments where data density must be balanced with visual breathing room. The style follows a **Corporate / Modern** aesthetic, utilizing a restrained color palette and precise geometry to instill a sense of calm and control.

The interface prioritizes "Content over Chrome," using subtle borders and tonal shifts rather than heavy shadows or decorative elements. The goal is to evoke an emotional response of organized confidence, positioning the platform as a sophisticated tool for modern enterprises.

## Colors

The palette is anchored by a sophisticated Teal primary and Indigo secondary, providing a vibrant but grounded interactive layer.

- **Backgrounds:** A soft Slate tint (#F8FAFC) is used for the application canvas to reduce eye strain, while white (#FFFFFF) is reserved for interactive cards and containers.
- **Neutrals:** We utilize the Slate gray scale to define hierarchy in text and UI borders.
- **Semantics:** High-saturation tones for Success, Warning, and Danger ensure critical system states are immediately recognizable against the neutral workspace.

## Typography

This design system uses a dual-font strategy to balance character with utility. **Plus Jakarta Sans** is used for headlines to provide a modern, slightly rounded executive feel. **Inter** is the workhorse for all UI elements, body text, and data points, chosen for its exceptional legibility and neutral tone.

Line heights are generous to ensure readability in data-heavy views. Label styles use a medium weight to differentiate themselves from standard body text without requiring a larger font size.

## Layout & Spacing

The layout utilizes a **fixed-fluid hybrid model**. The sidebar remains at a fixed 280px width to maintain consistent navigation, while the main content area utilizes a fluid 12-column grid.

A strict 8px spacing rhythm ensures vertical alignment across all components. Margins for the primary workspace are set to 24px to provide a substantial buffer from the screen edges, reinforcing the clean, uncluttered aesthetic.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Low-Contrast Outlines**. Depth is primarily communicated through the contrast between the #F8FAFC background and #FFFFFF cards.

To provide extra dimension for floating elements (menus, modals):

- **Level 1 (Cards):** 1px solid border (#E2E8F0), no shadow.
- **Level 2 (Dropdowns/Popovers):** 1px solid border (#E2E8F0) + soft ambient shadow (0px 4px 12px rgba(15, 23, 42, 0.05)).
- **Level 3 (Modals):** 1px solid border (#E2E8F0) + diffused shadow (0px 20px 40px rgba(15, 23, 42, 0.1)).

## Shapes

The shape language is consistently **Rounded**, using an 8px base radius for standard components like buttons and input fields. Larger containers, such as dashboard cards, utilize a 12px radius to appear softer and more approachable. Selection indicators and tags use a fully pill-shaped radius to distinguish them from structural containers.

## Components

### Sidebar Navigation

The sidebar uses a dark-on-light approach. Icons are 20px, Slate #64748B, transitioning to the primary Teal color upon selection. Active states use a subtle Teal background tint (5% opacity) and a 3px vertical "indicator bar" on the left edge.

### Status Badges

Badges are high-contrast. They utilize a saturated background color with white text for maximum visibility in data tables (e.g., a "Completed" badge uses a solid #10B981 background).

### Data Tables

Tables are designed for high density. They feature a #F8FAFC header row with uppercase labels. Rows are separated by 1px horizontal borders (#E2E8F0) with no vertical lines. Hover states trigger a subtle #F1F5F9 row highlight.

### Buttons

- **Primary:** Solid #0D9488 with white text.
- **Secondary:** White background with #E2E8F0 border and #0F172A text.
- **Tertiary:** Ghost style, appearing only as text until hover.

### Input Fields

Inputs use a white background, 1px #E2E8F0 border, and 8px rounded corners. The focus state uses a 2px Teal ring with 20% opacity.
