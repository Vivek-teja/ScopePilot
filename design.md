# ScopePilot — Comprehensive Frontend Design Specification (`design.md`)
**Artistic Architecture, Geometric System & Technical Specifications**  
*Document Version: 2.0 (Production Cyber-Geometric Standard)*  
*Source Reference: Production Implementation, `design.txt`, Architectural Sketches 1–4*

---

## 1. Executive Vision & Core Aesthetic

ScopePilot's interface is built on a **distinctive, high-contrast, cyber-geometric aesthetic**. The visual theme merges a pitch-black void canvas with razor-sharp white structural outlines, connected 45-degree chamfered octagonal containers, elongated hexagonal status badges, and surgical light/pastel purple focal points.

```
+---------------------------------------------------------------------------------+
|                               [ SCOPEPILOT ]                        [ ↺ Reset ] |
|                                                                                 |
|                        . - ~ ~ ~ ~ ~ ~ ~ ~ ~ - .                                |
|                    . '        TARAN THALLA       ' .                            |
|                  /                  ▼                \                          |
|                /       Workplace    |◊|   Projects     \                        |
|               ;   ===================================   ;                       |
|               |  (Overview) (Approved) (Milestones) (CR)|                       |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | /=======================================================================\ |  |
|  | ||                       OCTAGONAL CARD CONTAINER                      || |  |
|  | ||  [◊] ACTIVE BADGE (Pastel Purple)     [◊] COMPLETED (Black / White) || |  |
|  | ||                                                                     || |  |
|  | ||  (65%) Radial Gauge  ------>  Milestone Data Column                || |  |
|  | \\=======================================================================// |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

### Absolute Directives

1. **Absolute Zero Emojis**:
   - All emojis (`🧭`, `📅`, `📄`, `🏁`, `🔄`, `🤖`, `⚠️`, `🔍`, etc.) are completely prohibited across the entire application.
   - Replacements: Clean geometric iconography, diamond glyphs (`◊`), monospace brackets (`[ ↺ Reset ]`, `[ M1 ]`, `<4>`), or typography.
2. **Sharp Mathematical Polygons**:
   - Sketches may feature rough draft lines, but the production UI must **never** emulate roughness.
   - All lines, chamfers, borders, and SVGs are mathematically sharp, symmetric, and continuous.
   - In octagonal boxes, all lines end cleanly at their connection vertices with zero gaps and zero line overlaps.
3. **Void & Obsidian Contrast System**:
   - Canvas / Viewport: Pitch Black (`#000000`).
   - Semicircle Arch Nav Boundary: Pure Pitch Black (`#000000`, `stroke="none"`), blending invisibly into the canvas.
   - Standard Card Inner Surface: Deep Void Surface (`#0D0D12`).
   - Member Cards & Secondary Panels: Muted Charcoal Grey (`#1A1A24` to `#242432`).
4. **Light & Pastel Purple Accent Palette (No Dark Purples)**:
   - Deep/dark purples (e.g., `#6B21A8`, `#4A044E`) are strictly banned from all visible surfaces.
   - All accents use vivid pastel purple (`#C084FC`) and soft lavender (`#D8B4FE`) with gentle glowing drop shadows (`rgba(216, 180, 254, 0.55)`).
5. **Screen Real Estate & Density Optimization**:
   - Top semicircle navigation hub is anchored at top center with a 0-height floating header; screen flanks have `pointer-events: none` allowing clicks to pass through.
   - Card inner padding is compacted to `14px 18px`, eliminating wasteful blank space.
   - Card grids use multi-column auto-fill configurations to present maximum information density.

---

## 2. Color Palette & Design Tokens

Defined in `src/index.css`:

```css
:root {
  /* --- Void & Obsidian Palette --- */
  --bg-void:            #000000;  /* Viewport canvas (pure pitch black) */
  --bg-obsidian:        #08080C;  /* Innermost arch core and login surface */
  --bg-surface-dark:    #0D0D12;  /* Standard card / container inner surface */
  --bg-surface-grey:    #1A1A24;  /* Member cards, project overview panels */
  --bg-surface-lighter: #242432;  /* Elevated chips, subtle hover states */

  /* --- Structural Outlines --- */
  --border-white:       #FFFFFF;  /* Universal structural border lines (1px - 2px) */
  --border-muted:       rgba(255, 255, 255, 0.35);
  --border-dim:         rgba(255, 255, 255, 0.16);

  /* --- Electric Pastel Purple Accents (No Dark Purples) --- */
  --purple-vivid:       #C084FC;  /* Vivid light pastel purple (active borders, indicators) */
  --purple-light:       #D8B4FE;  /* Soft lavender (active text, badge fill, subtle glow) */
  --purple-glow-color:  #D8B4FE;
  --purple-glow:        rgba(216, 180, 254, 0.55);
  --purple-subtle-bg:   rgba(216, 180, 254, 0.18);

  /* --- Text Palette --- */
  --text-white:         #FFFFFF;  /* Primary headers, project names, white inputs */
  --text-purple-1:      #F3E8FF;  /* High-emphasis summaries and descriptions */
  --text-purple-2:      #D8B4FE;  /* Medium-emphasis metadata values */
  --text-purple-3:      #C084FC;  /* Accent labels and active highlights */
  --text-muted:         #A1A3B8;  /* Secondary descriptive copy */
  --text-dim:           #717388;  /* Timestamps, IDs, structural brackets */

  /* --- Input Surfaces --- */
  --input-bg-white:     #FFFFFF;  /* Solid white text inputs */
  --input-text-dark:    #000000;  /* Pure black text inside white inputs */

  /* --- Status Indicators --- */
  --green:              #4ADE80;  /* Success indicators */
  --yellow:             #FACC15;  /* Warnings and caution states */
  --red:                #F87171;  /* Rejections, errors, and critical alerts */
  --blue:               #60A5FA;  /* Informational tags */

  /* --- Spacing Scale --- */
  --space-1: 6px;   --space-2: 10px;  --space-3: 16px;
  --space-4: 20px;  --space-5: 26px;  --space-6: 32px;
  --space-8: 42px;  --space-10: 52px; --space-12: 64px;
}
```

---

## 3. Typography Architecture

### 3.1. Font Stacks

```css
--font-display: 'Virxen', 'Inter', system-ui, sans-serif;
--font-sans:    'Inter', system-ui, -apple-system, sans-serif;
--font-mono:    ui-monospace, Consolas, 'Cascadia Mono', monospace;
```

- **Virxen Display Font** (`/fonts/virxen/Virxen.ttf` & `VirxenOutline.ttf`):
  - Used for: Brand mark, screen titles, section headings, card titles, navigation sector labels, and primary buttons.
  - Characteristics: Bold, geometric, uppercase-styled silhouette with 0.05em–0.08em letter spacing.
- **Missing Glyph / Punctuation Handling**:
  - *Constraint*: Virxen lacks special characters, brackets, and punctuation (renders missing glyphs as blanks).
  - *Standard*: All mathematical symbols, currency symbols (`$`, `USD`), email characters (`@`), dates (`/`, `-`), and count brackets (`<4>`) are handled via the `.char-fallback` class or secondary font:
    ```css
    .char-fallback {
      font-family: var(--font-sans) !important;
      font-weight: 600;
    }
    ```

### 3.2. Sizing Hierarchy (Virxen vs. Non-Virxen)

| Level / Element | Font Family | Size | Line Height | Weight / Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| **H1 (Page Titles)** | Virxen | `3.0rem – 3.4rem` | `1.2` | `normal`, `letter-spacing: 0.05em` |
| **H2 (Section Titles)** | Virxen | `2.2rem – 2.3rem` | `1.3` | `normal`, `letter-spacing: 0.05em` |
| **H3 (Card / Tab Titles)** | Virxen | `1.6rem – 1.7rem` | `1.35` | `normal`, `letter-spacing: 0.05em` |
| **H4 (Sub-Section Titles)** | Virxen | `1.25rem – 1.35rem` | `1.4` | `normal`, `letter-spacing: 0.04em` |
| **Body Paragraphs (`p`)** | Inter | `0.85rem – 0.92rem` | `1.5` | `normal` (compact, legible) |
| **Section Subtitles** | Inter | `0.85rem – 0.88rem` | `1.4` | `color: var(--purple-light)` |
| **Metadata / Timestamps / IDs** | Monospace | `0.72rem – 0.82rem` | `1.3` | `font-weight: 700`, `letter-spacing: 0.06em` |
| **Input Labels** | Virxen | `0.88rem` (login: `1.35rem`) | `1.2` | `letter-spacing: 0.05em` |
| **Buttons** | Virxen | `0.82rem – 1.05rem` | `1.0` | `font-weight: 700`, `letter-spacing: 0.05em` |
| **Root Font Size** | — | `15px` | `1.5` | Base scaling reference |

---

## 4. Geometric Primitives & Component Language

### 4.1. Chamfered Octagonal Containers ("The Octagon Box")

All cards, modals, and detail containers utilize a **true connected 8-sided border** where diagonal edges cleanly intersect straight edges with zero gaps or line crossovers.

```
       14px                                      14px
     +-------==================================-------+
    /|                                                |\
14px |                                                | 14px
  |  |                                                |  |
  |  |                 CARD CONTENT                   |  |
  |  |                                                |  |
14px |                                                | 14px
    \|                                                |/
     +-------==================================-------+
       14px                                      14px
```

#### Dual-Layer CSS Clip-Path Implementation
To achieve a razor-sharp, uniform `1.5px` border around complex cut corners across all rendering engines, a dual-layer polygon architecture is used:

1. **Outer Border Shell (`.card`)**:
   ```css
   .card {
     position: relative;
     background-color: var(--border-white); /* 1.5px white border frame */
     padding: 1.5px;
     clip-path: polygon(
       14px 0%, calc(100% - 14px) 0%,
       100% 14px, 100% calc(100% - 14px),
       calc(100% - 14px) 100%, 14px 100%,
       0% calc(100% - 14px), 0% 14px
     );
     display: flex;
     box-sizing: border-box;
     transition: background-color 0.15s ease, filter 0.15s ease, transform 0.1s ease;
   }
   ```
2. **Inner Content Shell (`.cardInner`)**:
   ```css
   .cardInner {
     width: 100%;
     height: 100%;
     padding: 14px 18px; /* Compact padding eliminates unnecessary blank space */
     background-color: var(--bg-surface-dark); /* or var(--bg-surface-grey) */
     clip-path: polygon(
       13.4px 0%, calc(100% - 13.4px) 0%,
       100% 13.4px, 100% calc(100% - 13.4px),
       calc(100% - 13.4px) 100%, 13.4px 100%,
       0% calc(100% - 13.4px), 0% 13.4px
     );
     box-sizing: border-box;
     display: flex;
     flex-direction: column;
   }
   ```
3. **Interactive Hover State**:
   ```css
   .cardClickable:hover {
     background-color: var(--purple-light);
     filter: drop-shadow(0 0 12px var(--purple-glow));
     transform: translateY(-1px);
   }
   ```
4. **Login Screen Variant**:
   - Outer chamfer: `60px 0%` (mobile: `36px 0%`).
   - Inner chamfer: `58.6px 0%` (mobile: `34.6px 0%`).
   - Inner padding: `56px 60px` (mobile: `34px 26px`).
   - Surface: Deep Obsidian (`#09090E`).

---

### 4.2. Elongated Hexagonal Status Badges & Filters

Status indicators and toolbar filter buttons use an elongated hexagonal silhouette with fully enclosed outlines on all 6 facets.

```
       8%                                        92%
       +==========================================+
      /                                            \
 1.5% |                    ◊ ACTIVE                | 98.5%
      \                                            /
       +==========================================+
       8%                                        92%
```

#### SVG Polygon Geometry
```jsx
<svg viewBox="0 0 100 100" preserveAspectRatio="none">
  <polygon
    points="8,1.5 92,1.5 98.5,50 92,98.5 8,98.5 1.5,50"
    vectorEffect="non-scaling-stroke"
    className={styles.badgeHexPolygon}
  />
</svg>
```

#### Halved Outline Stroke & 3-Tier Status Color Specification
Stroke thickness is exactly halved to `0.75px` (`0.8px` for completed) to prevent heavy borders:

| Status Group | Status Keys | Background Fill | Stroke Outline | Text Color |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Active** | `active`, `in_progress` | `#D8B4FE` (Soft Pastel Lavender) | `#D8B4FE` (`0.75px`) | `#000000` (Pure Black) |
| **Tier 2: Paused / Pending** | `paused`, `pending`, `under_review` | `#FFFFFF` (Pure Solid White) | `#FFFFFF` (`0.75px`) | `#000000` (Pure Black) |
| **Tier 3: Completed / Approved** | `completed`, `accepted`, `approved`, `archived`, `draft` | `#000000` (Pitch Black) | `#FFFFFF` (`0.8px` on all sides) | `#FFFFFF` (Pure White) |
| **Critical / Alert** | `rejected`, `blocked` | `#000000` (Pitch Black) | `#F87171` (`0.75px`) | `#F87171` (Crimson) |

---

### 4.3. The "Proceed" Diamond Action Button

As specified in Reference Drawing 1 for the login screen:

```
                     /\
                    /  \
                   /    \
                  / +--+ \
                 /  |PRO| \   <--- White outer diamond (170px x 85px)
                /   |CEED \        Perpetual floating black inner box
                \   +--+  /        Crisp white Virxen text inside
                 \       /
                  \     /
                   \   /
                    \/
```

1. **Outer Diamond Shell**:
   - Dimensions: `width: 170px; height: 85px;`
   - Shape: `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);`
   - Fill: Solid White (`#FFFFFF`).
2. **Inner Selection Box**:
   - Independent perpetual black rectangular box (`#000000`).
   - Padding: `3px 8px`. Centered inside the diamond, never touching the diamond borders.
3. **Typography**:
   - Label: `"PROCEED"` in crisp white (`#FFFFFF`), Virxen display font, `1.05rem`, `letter-spacing: 0.08em`.
4. **Hover State**:
   - `transform: scale(1.06);` with smooth transition (`0.15s ease`).

---

### 4.4. Circular Milestone Progress Gauge

Replaces horizontal progress bars on milestone cards (Reference Drawing 4):

```
         . --- .
       /   65%   \    [ M1 ]
      |  (====)   |
       \         /
         ' --- '
```

1. **Dimensions**: `size={48}` and `strokeWidth={3}` (scaled to prevent any label clipping).
2. **Track Circle**: Clean circular track in deep obsidian (`var(--bg-obsidian)`).
3. **Active Indicator**:
   - Stroke: Electric Vivid Purple (`var(--purple-vivid)`).
   - Cap: `stroke-linecap: round`.
   - SVG Transform: `rotate(-90deg)` to begin tracing clockwise from top (12 o'clock).
   - Circumference formula: \( C = 2 \times \pi \times \frac{48 - 3}{2} \approx 141.37\text{px} \).
   - Offset: \( \text{strokeDashoffset} = C - \left(\frac{\text{progress}}{100} \times C\right) \).
4. **Centered Typography**:
   - Percentage number: `0.78rem`, `font-weight: 700`, `font-family: var(--font-sans)`, color `#FFFFFF`.
   - Percentage symbol (`%`): `0.55rem`, color `var(--purple-light)`, positioned alongside the number with zero clipping into the ring circumference.
5. **Layout Placement**: Aligned on the left in `.gaugeColumn` along with order tag `[ M{order} ]`. Milestone title, description, and deliverables stack to the right.

---

## 5. The Persistent Semicircle Navigation Arch ("TopArchNav")

The navigation hub is anchored at top center across all application screens (except login).

```
                                    (0,0) Center Peak
                                      400,0
                    . - ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ - .
                . '                                       ' .
            . '            +---------------------+            ' .
          /                |     TARAN THALLA    |                \
        /                  |          ▼          |                  \
       ;   [Circle 1]      +---------------------+      [Circle 1]   ;
      /   (R=115)                                        (R=115)      \
     |                                                                 |
     |   [Circle 2]   Workplace             Projects    [Circle 2]     |
     |   (R=155)         \                     /        (R=155)        |
     |                    ` - - - - [◊] - - - '                        |
     |                           (400, 155)                            |
    =====================================================================
    ||   [Circle 3]  (R=215 Unbroken Ring)                         ||
    ||   [Circle 4]  (R=255 Outer Arc: 4 Tabs)                     ||
    ||   Overview   |   Approved Scope   |   Milestones   |  Change Reqs||
    =====================================================================
```

### 5.1. Viewport Sizing & The 100% Static Circle Guarantee

- **Universal Fixed SVG Coordinate Space**: `viewBox="0 0 800 300"` with `preserveAspectRatio="xMidYMin slice"`.
- **Max Width**: Strictly locked to `max-width: 680px` for both Workspace and Project Detail modes.
- **Heights**:
  - Workspace / Projects Mode (2 circles): `height: 170px`, `aspect-ratio: 800 / 200`.
  - Project Detail Mode (4 circles): `height: 255px`, `aspect-ratio: 800 / 300`.
- **Mechanism**: Because the SVG width, viewBox, and origin `(400, 0)` are mathematically identical across all pages, **Circles 1 & 2 never change physical size, diameter, or position when switching between 2-circle and 4-circle modes.**

### 5.2. Boundary & Floating Architecture
- **Header Placement**: `position: sticky; top: 0; z-index: 200; pointer-events: none;`.
- **Pass-Through Flanks**: The left and right empty viewport space has `pointer-events: none`, allowing clicks to reach underlying buttons or content.
- **Pitch Black Boundary**: The semicircle background boundary is filled with pure black (`fill="#000000"`, `stroke="none"`), completely invisible against the black canvas.

---

### 5.3. Concentric Rings Coordinate System

| Ring Element | Radius | SVG Path / Points | Visual Appearance |
| :--- | :--- | :--- | :--- |
| **Inner Wheel Black Fill** | `R=200` | `M 200 0 A 200 200 0 0,0 600 0 Z` | Pure pitch black (`#000000`), no stroke |
| **Circle 1 (Profile Core)** | `R=115` | `M 285 0 A 115 115 0 0,0 515 0` | Fill `#0D0D14`, stroke `#FFFFFF` (`2px`), NO top horizontal line |
| **Circle 2 (Left Arc)** | `R=155` | `M 245.1 5.4 A 155 155 0 0,0 383.8 154.1` | Workplace navigation; stroke `#FFFFFF` (`2px`), active `var(--purple-vivid)` (`3.5px`) with glow |
| **Circle 2 (Right Arc)** | `R=155` | `M 416.2 154.1 A 155 155 0 0,0 554.9 5.4` | Projects navigation; stroke `#FFFFFF` (`2px`), active `var(--purple-vivid)` (`3.5px`) with glow |
| **Dividing Diamond** | `(400, 155)` | `polygon points="400,143 407,155 400,167 393,155"` | Solid white fill `#FFFFFF`, chevrons on sides, strictly NO vertical line through center |
| **Circle 2 Curved Text** | `R=180` | Guides: `#textpath-workplace`, `#textpath-projects` | OUTSIDE of outline; font size `22px` Virxen, white default, purple when active/hovered |
| **Outer Annular Black Fill** | `R=200` to `300`| `M 100 0 A 300 300 0 0,0 700 0 L 600 0 A 200 200 0 0,1 200 0 Z` | Pitch black background expanding with Circles 3 & 4 |
| **Circle 3 (Concentric Ring)**| `R=215` | `M 185 0 A 215 215 0 0,0 615 0` | Unbroken concentric arc; stroke `#FFFFFF` (`2px`) |
| **Circle 4 (Outer 4 Tabs)** | `R=255` | 4 arc segments: Overview, Scope, Milestones, Changes | Segment stroke `#FFFFFF` (`2px`), active `var(--purple-vivid)` (`3.5px`) with glow |
| **Circle 4 Curved Text** | `R=280` | Guides: `#textpath-overview`, `#textpath-scope`, etc. | OUTSIDE of outline; font size `19px` Virxen, white default, purple when active/hovered |

---

### 5.4. Circles 3 & 4 Outer Emergence Animation

When entering a project screen, Circles 1 and 2 remain static while Circles 3 and 4 emerge smoothly:

```css
.outerCirclesGroup {
  transform-box: view-box;
  transform-origin: 400px 0px;
  animation: outerCirclesEmerge 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes outerCirclesEmerge {
  0% {
    opacity: 0;
    transform: scale(0.72);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

### 5.5. Radial Dividers & Glow Filter

- **Line 1 (135°)**: `x1="230.3" y1="169.7" x2="209.1" y2="190.9"`
  - Turns pastel purple (`var(--purple-vivid)`) when `Overview` is active or hovered.
- **Line 2 (90°)**: Strictly vertical `x1="400" y1="240" x2="400" y2="270"`
  - *Fix for line disappearance*: Uses `filterUnits="userSpaceOnUse"` on `<filter id="purpleGlow">`:
    ```xml
    <filter id="purpleGlow" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="310">
      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#d8b4fe" floodOpacity="0.95" />
    </filter>
    ```
    This prevents zero-width vertical elements from collapsing the SVG filter boundary.
  - Turns pastel purple when `Approved Scope` is active or hovered.
- **Line 3 (45°)**: `x1="569.7" y1="169.7" x2="590.9" y2="190.9"`
  - Turns pastel purple when `Milestones` is active or hovered.

---

### 5.6. Dedicated Annular Sector Clickboxes & Hover Rules

The clickable areas are bounded by mathematical annular sectors matching user specifications:

1. **Workplace Sector**: Annular sector between `R=115` and `R=200` (or `R=215` in project mode) on the left side:
   - `d="M 285 0 L 185 0 A 215 215 0 0,0 400 215 L 400 115 A 115 115 0 0,1 285 0 Z"`
2. **Projects Sector**: Annular sector between `R=115` and `R=200` (or `R=215`) on the right side:
   - `d="M 400 115 L 400 215 A 215 215 0 0,0 615 0 L 515 0 A 115 115 0 0,1 400 115 Z"`
3. **Outer Tabs Sectors (R=215 to R=300)**:
   - `Overview`: `180°` to `135°`
   - `Approved Scope`: `135°` to `90°`
   - `Milestones`: `90°` to `45°`
   - `Change Requests`: `45°` to `0°`
4. **Hover Behavior Rule**:
   - Sector click targets have `fill: transparent;`.
   - On hover, the section background does **not** fill with purple.
   - Only the boundary outline, curved text, and divider line light up in pastel purple (`#D8B4FE`) with drop shadow glow.

---

### 5.7. Profile Core & Dropdown

- **Isolated Clickbox**: Centered inside Circle 1 (`top: 36px; left: 50%`). Clicking is restricted strictly to the user's name and the inverted purple triangle glyph (`polygon points="0,0 22,0 11,7"`).
- **Profile Name**: `1.45rem`, Virxen, `var(--purple-vivid)`.
- **Dropdown Animation**:
  - `top: 48px; width: 260px;`
  - Deep surface background (`#0D0D12`), `1.5px` solid white border.
  - Emergence animation:
    ```css
    @keyframes dropdownEmerge {
      from { opacity: 0; transform: translateY(-8px) scaleY(0.92); }
      to   { opacity: 1; transform: translateY(0) scaleY(1); }
    }
    ```
  - Options: Role display tag `[ freelancer ]`, demo persona switcher with active purple glow, reset demo data button, and logout button with diamond `Log out ◊`.

---

## 6. Page-by-Page Specifications & Layouts

### 6.1. Login & Demo Entry Screen (`/`)
*Reference: Architectural Drawing 1*

```
+---------------------------------------------------------------------------------+
| [▲]                                                                         [▲] |
|   \\=======================================================================//   |
|    ||                             Log•n                                   ||    |
|    ||                         [Scope Pilot]                               ||    |
|    ||                                                                     ||    |
|    ||  Username:                                                          ||    |
|    ||  [================================================================] ||    |
|    ||                                                                     ||    |
|    ||  Password:                                                          ||    |
|    ||  [================================================================] ||    |
|    ||                                                                     ||    |
|    ||              [ Taran Thalla ]       [ Kenji Watanabe ]              ||    |
|    ||                (Freelancer)              (Client)                   ||    |
|    ||                                                                     ||    |
|    ||                              /\                                     ||    |
|    ||                             /  \                                    ||    |
|    ||                            / +--+ \                                 ||    |
|    ||                           /  |PRO| \                                ||    |
|    ||                           \  |CEED /                                ||    |
|    ||                            \ +--+ /                                 ||    |
|    ||                             \    /                                  ||    |
|    ||                              \/                                     ||    |
|   //=======================================================================\\   |
| [▲]                                                                         [▲] |
+---------------------------------------------------------------------------------+
```

1. **Card Frame**:
   - Viewport: Pure pitch black (`#000000`).
   - Central octagonal container with `60px` cut corners (`.octCard`), solid white frame (`padding: 2px`), deep obsidian interior (`#09090E`).
   - Dimensions: `max-width: 660px; padding: 56px 60px;`.
2. **Corner Elements**:
   - 45-degree diagonal white parallel lines outside each of the 4 cut corners.
   - Dual-triangle corner gems: White wireframe triangle containing an inner filled purple triangle gem (`points="12,12 28,12 20,26"` with `fill="var(--purple-vivid)"`).
3. **Typography & Title**:
   - `"Login"` in Virxen font (`4.2rem`).
   - The dot on the letter **"i"** is explicitly a vibrant purple dot (`12px` circle with `box-shadow: 0 0 12px var(--purple-vivid)`).
4. **Input Fields**:
   - `Username:` and `Password:` labels in white Virxen font (`1.35rem`).
   - Solid white rectangular input fields (`height: 52px; background: #FFFFFF; color: #000000; font-size: 1.25rem; font-weight: 500;`).
5. **Demo Persona Switcher**:
   - Two selectable rectangular cards: `Taran Thalla (freelancer)` and `Kenji Watanabe (client)`.
   - Selected persona lights up with `rgba(216, 180, 254, 0.22)` background, purple border, and glowing shadow.
6. **Action Button**:
   - Diamond Proceed Button (`170px x 85px`) with floating inner black box enclosing white uppercase `"PROCEED"` text.

---

### 6.2. Workspace Page (`/workspace`)
*Reference: Architectural Drawing 2*

```
+---------------------------------------------------------------------------------+
|                                 (TopArchNav)                                    |
|                              Workplace Active                                   |
|                                                                                 |
|  Taran Creative Studios                                                         |
|  Boutique full-stack engineering consultancy.                                   |
|  SLUG: [ taran-studios ]          CREATED: 2024-01-15                           |
|  -----------------------------------------------------------------------------  |
|                                                                                 |
|  Workspace members <4>                                                          |
|  ==================== (Purple underline)                                       |
|                                                                                 |
|  +-------------------+  +-------------------+  +-------------------+            |
|  | (TT) Taran Thalla |  | (KW) Kenji Watana |  | (AR) Alex Rivera  |  ... (Grid)|
|  |      [OWNER]      |  |      [CLIENT]     |  |      [COLLAB]     |            |
|  +-------------------+  +-------------------+  +-------------------+            |
|                                                                                 |
|  Your Access                                                                    |
|  +---------------------------------------------------------------------------+  |
|  | /=======================================================================\ |  |
|  | || IDENTITY: Taran Thalla    ROLE: Owner    WORKSPACE: taran-studios    || |  |
|  | || ◊ Full administrative control across proposals and deliverables.    || |  |
|  | \\=======================================================================// |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

1. **Persistent TopArchNav**: Workspace quarter arc illuminated in purple.
2. **Workspace Header Block**:
   - Title: `"Taran Creative Studios"` in Virxen (`3.4rem`).
   - Description: Subdued purple (`0.92rem`).
   - Meta Row: Slug code chip `[ taran-studios ]` and creation date.
3. **Workspace Members Section**:
   - Title: `"Workspace members <4>"`:
     - Member count bracket `<4>` uses `--font-sans` fallback.
     - Purple underline: `height: 3px; background: var(--purple-vivid); box-shadow: 0 0 10px var(--purple-glow); max-width: 380px;`.
   - Multi-Column Grid:
     - `grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px;`.
     - Compact octagonal member cards (`padding: 10px 14px; background: var(--bg-surface-grey)`).
     - Circular avatar (`50px` diameter, `2px` white border, obsidian fill) with user initials in `var(--purple-light)`.
     - User name in white Virxen (`1.15rem`) and role badge in elongated hexagon.
4. **"Your Access" Panel**:
   - Chamfered octagonal card with grey interior (`#1A1A24`), displaying identity, role, permissions, and session status.

---

### 6.3. Projects Directory Page (`/projects`)
*Reference: Architectural Drawing 3*

```
+---------------------------------------------------------------------------------+
|                                 (TopArchNav)                                    |
|                               Projects Active                                   |
|                                                                                 |
|  PROJECTS                                                                 <2>   |
|  -----------------------------------------------------------------------------  |
|                                                                                 |
|  [ Search by name, summary, or tag...          ]  [ALL] [ACTIVE] [PAUSED] [COMP]|
|                                                                                 |
|  +------------------------------------+  +------------------------------------+ |
|  | /================================\ |  | /================================\ | |
|  | || NovaPay Mobile Checkout       || |  | || CloudSync Dashboard          || | |
|  | || [◊ ACTIVE]                    || |  | || [◊ COMPLETED]                || | |
|  | || Summary description...        || |  | || Summary description...        || | |
|  | || TIMELINE: 2024-02-01 - 2024...|| |  | || TIMELINE: 2023-11-01 - 2024...|| | |
|  | || [fintech] [mobile] [react]    || |  | || [saas] [analytics] [aws]     || | |
|  | \\================================// |  | \\================================// | |
|  +------------------------------------+  +------------------------------------+ |
+---------------------------------------------------------------------------------+
```

1. **Persistent TopArchNav**: Right quarter arc `"Projects"` illuminated in purple.
2. **Page Header**: Title `"Projects"` in Virxen (`3.0rem`) with count badge `<2>`.
3. **Toolbar (Search & Filters)**:
   - **Solid White Search Input**:
     - `height: 52px; background: #FFFFFF; color: #000000; font-size: 1.2rem; font-weight: 600; border: 2px solid #FFFFFF;`.
     - Focus: `box-shadow: 0 0 16px var(--purple-glow);`.
     - Zero emojis (no magnifying glass).
   - **Elongated Hexagonal Filter Buttons**:
     - Filter options: `All`, `Active`, `Paused`, `Completed`.
     - Height: `38px; padding: 0 18px; stroke-width: 0.75px;`.
     - Exact active states:
       - `All`: White fill, white stroke, black text.
       - `Active`: Soft purple fill (`#D8B4FE`), stroke `#D8B4FE`, black text.
       - `Paused`: White fill, white stroke, black text.
       - `Completed`: Black fill, white stroke (`0.8px`), white text.
4. **Projects Grid**:
   - `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px;`.
   - Compact chamfered cards (`padding: 12px 14px; gap: 8px;`).
   - Project name in Virxen (`1.35rem`, white).
   - Summary copy in pastel purple (`--text-purple-1`, `0.85rem`).
   - Metadata row with mono labels (`0.75rem`) and values in `--text-purple-2`.
   - Category tags in purple tint pills (`--purple-subtle-bg`, `0.72rem`).

---

### 6.4. Specific Project Details & Section Tabs (`/projects/:projectId`)
*Reference: Architectural Drawing 4*

When entering a project, the top arch navigation expands to display Circles 3 and 4 with the 4 tabs:
1. `Overview`
2. `Approved Scope`
3. `Milestones`
4. `Change Requests`

#### Tab 1: Overview
- Octagonal chamfered container with grey interior (`#1A1A24`).
- Project summary and parameters: Project ID, Client, Freelancer, Start/End Dates, Total Budget, Currency, Scope Version.
- Key-Value grid with Virxen labels (`0.82rem`) and white values (`0.88rem`).

#### Tab 2: Approved Scope
- Displays the approved baseline proposal.
- Approved deliverables checklist: Each deliverable has a sharp white or purple diamond check glyph (`◊`).
- Revision counter: Formatted with diamond count tags `<used / allowed>`.
- Secondary cards for superseded/historical proposals.

#### Tab 3: Milestones & Deliverables
```
+---------------------------------------------------------------------------------+
|  +---------------------------------------------------------------------------+  |
|  | /=======================================================================\ |  |
|  | || (65%) [ M1 ]  Core API & Payment Gateway                [◊ ACTIVE]  || |  |
|  | ||               Deliver end-to-end payment processing...              || |  |
|  | ||               DUE: 2024-03-15    COMPLETED: —                       || |  |
|  | ||                                                                     || |  |
|  | || DELIVERABLES:                                                       || |  |
|  | || +-----------------------+   +-----------------------+               || |  |
|  | || | /===================\ |   | /===================\ |               || |  |
|  | || | || Stripe Webhook  || |   | || OAuth Flow      || |  ... (Grid)   || |  |
|  | || | || [◊ ACCEPTED]    || |   | || [◊ IN PROGRESS] || |               || |  |
|  | || | || [EVIDENCE]      || |   | || [EVIDENCE]      || |               || |  |
|  | || | \\===================// |   | \\===================// |               || |  |
|  | || +-----------------------+   +-----------------------+               || |  |
|  | \\=======================================================================// |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```
- Milestone Cards in octagonal chamfered geometry (`padding: 14px 18px`).
- **Left Column (`.gaugeColumn`)**:
  - Circular progress gauge: `size={48}`, `strokeWidth={3}`.
  - Centered number: `0.78rem` white, symbol `%` `0.55rem` lavender. Zero clipping.
  - Milestone order tag: `[ M{order} ]` in `var(--purple-light)`.
- **Right Column (`.msInfoColumn`)**:
  - Milestone title in Virxen (`1.35rem`, white).
  - Description in `--text-purple-1` (`0.85rem`).
  - Status badge in elongated hexagon.
  - Dates row in monospace (`0.78rem`).
- **Deliverables Section**:
  - Grid: `grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px;`.
  - Deliverable cards: Chamfered octagonal containers (`padding: 10px 12px; clip-path: 8px cut corners;`).
  - Acceptance status badge in elongated hexagon.
  - Evidence link styled as monospace button (`[EVIDENCE]`).

#### Tab 4: Change Requests
- Header: Title `"Change Requests"` in Virxen (`2.3rem`), count badge, purple underline (`3px`), and `+ New Request` action button.
- Multi-Column Grid:
  - `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;`.
  - Compact cards (`padding: 12px 16px;`).
  - Header: Change Request ID (`[CR-001]`), title (`1.25rem`), and priority/status badges.
  - Summary copy in pastel purple (`0.85rem`).
- **Change Request Review Screen (`/projects/:projectId/changes/:crId`)**:
  - Side-by-side comparison in dual chamfered octagonal panels:
    - Left Panel: Approved Scope baseline.
    - Right Panel: Newly requested modifications.
  - Impact indicators: Schedule impact, effort delta, cost delta.
  - AI Impact Analysis Banner: Distinct futuristic border with explicit disclaimer:
    `"AI analysis is not connected yet — values shown are demo estimates."`
    (Guarantees zero fake AI assertions).
  - Human Decision Controls: Diamond action buttons for approval/rejection (`[Approve]`, `[Reject]`).

---

## 7. Responsive Breakpoints & Accessibility

### 7.1. Viewport Breakpoints
- **Desktop (`>= 1024px`)**: Full multi-column grids (up to 4 columns for deliverables, 3 columns for projects and members), centered `680px` arch nav.
- **Tablet (`768px – 1023px`)**: 2-column member and project grids, arch nav scales responsively via SVG viewBox preservation.
- **Mobile (`< 768px`)**:
  - 1-column stacked cards.
  - Login card chamfer reduces from `60px` to `36px`; inner padding reduces from `56px 60px` to `34px 26px`.
  - Arch nav SVG preserves aspect ratio (`xMidYMin slice`) keeping the active sector centered.

### 7.2. Accessibility & Interaction
- **Keyboard Focus**:
  ```css
  :focus-visible {
    outline: 2px solid var(--purple-light);
    outline-offset: 3px;
  }
  ```
- **Semantic ARIA**:
  - `role="progressbar"` on CircularProgress with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
  - `aria-expanded` and `aria-label` on profile and outer sector triggers.
  - `role="alert"` on error and critical warning states.

---

## 8. Verification & Test Matrix

| Component / Subsystem | Verification Criteria | Status |
| :--- | :--- | :--- |
| **Zero Emojis** | No unicode emojis in DOM, styles, mocks, or logs. | Verified (100% compliant) |
| **Static Circles 1 & 2** | Radii R=115 & R=155 do not alter size/position when Circles 3 & 4 appear. | Verified via constant `0 0 800 300` viewBox |
| **Outer Circles Animation** | Circles 3 & 4 animate via `.outerCirclesEmerge` (scale 0.72 -> 1.0) on project select. | Verified |
| **Octagon Connected Lines** | Outer chamfer 14px / inner 13.4px touch seamlessly with no cross-overs or gaps. | Verified across all octagonal cards |
| **Hexagon Badge Outlines** | 0.75px stroke width with side angled lines rendered on all sides. | Verified via SVG polygon |
| **Status Badge Colors** | Active: soft purple/black text; Paused: white/black text; Completed: black/white outline/white text. | Verified per `design.txt` specs |
| **Milestone Radial Gauge** | Size 48px, stroke 3px, percentage text 0.78rem, % symbol 0.55rem with zero clipping. | Verified |
| **Non-Virxen Text Sizing** | Body 0.85–0.92rem, metadata 0.72–0.82rem; Virxen headings prominent. | Verified |
| **Sector Click Targets** | Annular polygons; outline & text light up on hover, background remains transparent. | Verified |
| **Vertical Divider Line** | 90° radial divider visible and glows purple via `userSpaceOnUse` filter. | Verified |
| **Proceed Button** | Diamond shape with floating inner black box and white uppercase text. | Verified |
