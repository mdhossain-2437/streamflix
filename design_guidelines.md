# Streaming Platform Design Guidelines

## Design Approach

**Reference-Based Design:** Netflix, Amazon Prime Video, Disney+, HBO Max

**Core Principles:**
- Immersive, content-first experience with minimal UI friction
- Dark-themed interface that emphasizes video content
- Smooth, cinematic transitions and interactions
- Horizontal scrolling content carousels as primary navigation pattern

---

## Typography System

**Font Stack:** Inter (primary), SF Pro Display (headings)

**Hierarchy:**
- Hero Titles: 3xl-5xl, bold (56-72px desktop)
- Content Titles: xl-2xl, semibold (24-32px)
- Card Titles: base-lg, medium (16-20px)
- Body Text: sm-base, regular (14-16px)
- Metadata: xs-sm, regular (12-14px)

---

## Layout & Spacing

**Spacing Units:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Tight spacing: p-2, gap-2 (metadata, tags)
- Standard spacing: p-4, gap-4 (cards, buttons)
- Section spacing: py-12 to py-24 (content rows)
- Container padding: px-4 md:px-8 lg:px-16

**Grid System:**
- Content rows: Horizontal scroll, no wrapping
- Card widths: 240-280px (portrait), 400-480px (landscape)
- Listings grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5

---

## Component Library

### Navigation
- Sticky header with logo, primary nav links, search icon, profile avatar
- Transparent background on hero, solid on scroll
- Height: h-16 to h-20

### Content Cards
- Hover scale effect (scale-105)
- Rounded corners: rounded-md to rounded-lg
- Aspect ratios: 16:9 (landscape), 2:3 (portrait)
- Play button overlay on hover with blurred backdrop
- Progress bar at bottom for "Continue Watching"

### Hero Banner
- Full-width, h-screen or min-h-[600px]
- Large hero image with gradient overlay (top-to-transparent, bottom-to-solid)
- Title + description (max-w-2xl) positioned left-aligned
- Primary CTA: "Play" + Secondary CTA: "Add to Watchlist"
- Buttons with backdrop-blur-md backgrounds

### Content Rows
- Title + "See All" link
- Horizontal scroll container with gap-4
- 8-12 items visible per row on desktop
- Scroll snap for smooth navigation

### Video Player
- Full-screen black background
- Custom controls overlay (fade on inactivity)
- Bottom control bar: play/pause, progress bar, volume, settings (quality/subtitles), fullscreen
- Top overlay: back button, title, episode info
- Progress bar with thumbnail preview on hover

### Detail Pages
- Hero section: backdrop image (blur), poster on left, details on right
- Metadata: rating, year, duration, genre tags
- Action buttons row: Play (primary), Add to List, Share
- Tabs navigation: Overview, Episodes (series), Similar
- Cast grid: circular avatars with names
- Similar content: 4-6 cards grid

### Forms (Login/Signup)
- Centered card: max-w-md, p-8 to p-12
- Full-width inputs with bottom border focus state
- Large CTAs: w-full, py-3
- Divider with "OR" text
- Social login buttons below

### Profile Page
- Header with avatar, name, edit button
- Tab navigation: Account, Viewing Activity, Watchlist
- Settings sections with clear labels and toggle switches
- Watch history grid matching content cards

### Watchlist/Continue Watching
- Grid layout matching Movies/Series pages
- Remove button on card hover
- Progress indicator overlay for Continue Watching
- Empty state with illustration and CTA to browse

---

## Images Strategy

**Hero Images:**
- Home Page: Large cinematic backdrop from featured content (full-width, 70vh)
- Movie/Series Details: Backdrop image with gradient overlay
- Login/Signup: Optional branded background or solid dark

**Content Images:**
- All movie/series cards: High-quality poster/thumbnail images
- Cast section: Circular headshot photos
- Profile: User avatar (circular, upload capability)

**Image Treatment:**
- Lazy loading for all content images
- Blur-up loading technique
- Fallback placeholders with content type icons

---

## Screen-Specific Guidelines

**Home Page:**
- Full-width hero banner with featured content
- 6-8 horizontal scrolling content rows (Trending, Continue Watching, New Releases, genres)
- Each row shows 6-8 cards initially, scrollable for more

**Movies/Series Listing:**
- Filter sidebar (collapsible on mobile): genres, year, rating
- Sort dropdown: Popular, Recently Added, A-Z
- Grid display with pagination or infinite scroll
- 20-30 items per page

**Detail Pages:**
- Hero section takes 60% viewport height
- Trailer auto-play on hover (muted)
- Episode list (series): thumbnail, title, duration, description per episode
- Season selector dropdown

**Player Page:**
- Immersive full-screen experience
- Skip intro/credits buttons (context-aware)
- Next episode countdown overlay (series)
- Quality settings: Auto, 1080p, 720p, 480p

**Watchlist:**
- Same grid as Movies/Series pages
- Quick remove action on hover
- "Recently Added" sort by default

---

## Animation Guidelines

**Use Sparingly:**
- Card hover: scale-105, transition-transform duration-200
- Hero fade-in: opacity animation on load
- Content row scroll: smooth horizontal scroll behavior
- Player controls: fade in/out on mouse movement

**Avoid:**
- Page transition animations
- Excessive loading spinners
- Auto-play carousels on home page (except hero trailer)

---

**Accessibility:** Maintain WCAG AA standards, keyboard navigation for all interactive elements, focus indicators on all controls, subtitle/audio description support in player.