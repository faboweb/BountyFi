# BountyFi Brand Assets - Playful Victory Edition

## Design Philosophy
**Playful but sophisticated** - Like Duolingo for adults. Celebrates winning and achievement with bold colors and energetic visuals, while maintaining professional credibility.

---

## Files Included

### App Icons
1. **app-icon-strike-target.svg** - Main app icon (square)
   - Admiral blue gradient background
   - Gold concentric target circles
   - White lightning bolt center
   - White ticket at bottom
   
2. **app-icon-strike-target-rounded.svg** - iOS version
   - Same design with 180px rounded corners
   - Ready for App Store submission

### Logos - Individual Concepts
3. **logo-trophy-ticket.svg** - Trophy emerging from blue ticket
   - Best for: Achievement-focused marketing
   - Emphasizes: Winning, rewards, prizes

4. **logo-target-strike.svg** - Concentric circles with lightning + tickets
   - Best for: Action-oriented campaigns
   - Emphasizes: Precision, hitting goals

5. **logo-hybrid-trophy-target.svg** - Combined elements (RECOMMENDED)
   - Trophy on blue ticket with target rings background
   - "WINNER" text on gold stub
   - Best for: Main brand usage
   - Emphasizes: All brand values (winning, precision, rewards)

6. **logo-when-winning.svg** - Vertical version of hybrid
   - Best for: Social media profiles, app stores, square spaces
   - Includes "PROOF TO EARN" tagline

---

## Color Palette

### Primary Colors
- **Admiral Blue (Dark)**: `#1E3A8A` - Authority, trust, depth
- **Admiral Blue (Bright)**: `#3B82F6` - Energy, action, sky
- **Admiral Blue (Light)**: `#60A5FA` - Highlights, accents

### Accent Colors
- **Winner Gold**: `#FBBF24` - Prizes, achievement, celebration
- **Deep Gold**: `#F59E0B` - Richness, value
- **Success Green**: `#10B981` - Approvals, positive actions
- **White**: `#FFFFFF` - Clean space, clarity

### Supporting Colors (UI)
- **Text Gray**: `#6B7280` - Secondary text, captions
- **Light Gray**: `#F9FAFB` - Backgrounds, cards
- **Navy Black**: `#1E293B` - Deep text, headers

### Gradient Formulas
```css
/* Primary Blue Gradient */
background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);

/* Gold Gradient */
background: linear-gradient(180deg, #FBBF24 0%, #F59E0B 50%, #FBBF24 100%);

/* Success Gradient */
background: linear-gradient(135deg, #3B82F6 0%, #10B981 100%);
```

---

## Logo Usage Guidelines

### Primary Logo (Hybrid)
- Use `logo-hybrid-trophy-target.svg` for most applications
- Minimum width: 250px
- Maintain aspect ratio (1400:400)
- Clear space: Equal to height of trophy on all sides

### Stacked Logo
- Use `logo-when-winning.svg` for square/vertical formats
- Minimum width: 150px
- Social media profile photos: Use stacked version

### Logo Variations

**On Light Backgrounds:**
- Full color version (default)

**On Dark Backgrounds:**
- Invert: White ticket, gold trophy, light blue rings
- Or use white outline version

**Monochrome (if required):**
- All admiral blue `#1E3A8A`
- Or all gold `#FBBF24`

---

## App Icon Specifications

### iOS Requirements
- Use `app-icon-strike-target-rounded.svg`
- Export sizes: 1024×1024, 180×180, 120×120, 87×87, 80×80, 60×60, 58×58, 40×40, 29×29, 20×20
- Rounded corners: 180px radius (on 1024px canvas)
- No transparency

### Android Requirements
- Use `app-icon-strike-target.svg` (square)
- Export sizes: 512×512, 192×192, 144×144, 96×96, 72×72, 48×48, 36×36
- Can include transparency
- Adaptive icon: Use target circles as background, lightning bolt as foreground

### Export Commands
```bash
# Using Inkscape
inkscape app-icon-strike-target.svg --export-png=icon-1024.png -w 1024 -h 1024
inkscape app-icon-strike-target.svg --export-png=icon-512.png -w 512 -h 512

# Using ImageMagick
convert -background none app-icon-strike-target-rounded.svg -resize 1024x1024 icon-ios-1024.png
```

---

## Typography

### Primary Font
**System Default** (Arial, Helvetica, sans-serif)
- Headings: ExtraBold (800), Uppercase, Letter-spacing: +16px
- Body: Regular (400)
- Buttons: Bold (700)

### Recommended Custom Fonts (if adding)
- **Fredoka One** - Playful, rounded, great for headings
- **Poppins Bold** - Modern, geometric, clean
- **Inter** - Versatile, readable, professional

### Text Styles
```css
/* Main Heading */
font-family: Arial, Helvetica, sans-serif;
font-weight: 800;
font-size: 120px;
letter-spacing: 16px;
color: #1E3A8A;

/* Tagline */
font-family: Arial, Helvetica, sans-serif;
font-weight: 600;
font-size: 28px;
letter-spacing: 4px;
color: #6B7280;

/* Button Text */
font-family: Arial, Helvetica, sans-serif;
font-weight: 700;
font-size: 18px;
text-transform: uppercase;
letter-spacing: 2px;
```

---

## Visual Style Guide

### Ticket Design Elements
- Rounded corners (8-12px radius)
- Perforated edges (circular dots)
- Dotted center line (dashed stroke)
- 3D depth (subtle drop shadow)

### Icons & Illustrations
- Bold outlines (4-6px stroke)
- Rounded corners on all shapes
- Limited color palette (2-3 colors max)
- Playful but not cartoonish
- Geometric shapes preferred

### Effects & Animations
- **Glow:** Soft gaussian blur, 6-8px
- **Shadow:** Subtle, colored tints (blue/gold), not pure black
- **Gradients:** Smooth transitions, 2-3 color stops
- **Animations:** Bouncy, spring physics, celebratory

### Celebration Moments
- **Confetti:** Gold, blue, green circles
- **Sparkles:** Small star shapes, white/gold
- **Lightning:** Quick flash, white with blue outline
- **Trophy pop:** Scale up + rotate slightly

---

## UI Component Examples

### Button Styles

**Primary Button:**
```
Background: Linear gradient #3B82F6 → #1E3A8A
Text: White, bold, uppercase
Border: None
Padding: 16px 32px
Border-radius: 12px
Shadow: 0 4px 12px rgba(30, 58, 138, 0.3)
Hover: Lift 2px, increase shadow
```

**Secondary Button:**
```
Background: Transparent
Text: #1E3A8A, bold, uppercase
Border: 3px solid #3B82F6
Padding: 14px 32px
Border-radius: 12px
Hover: Fill with #3B82F6, text to white
```

**Success Button:**
```
Background: #10B981
Text: White, bold
Border-radius: 12px
Icon: Checkmark or trophy
```

### Card Styles
```
Background: White
Border: 2px solid #E5E7EB
Border-radius: 16px
Padding: 24px
Shadow: 0 2px 8px rgba(0,0,0,0.05)
Hover: Shadow increases, slight lift
```

### Badge/Ticket Component
```
Background: Gold gradient
Text: Admiral blue, bold
Border-radius: 8px
Icon: Small ticket icon
Padding: 8px 16px
```

---

## Don'ts

❌ Don't use purple (we're admiral blue, not purple)  
❌ Don't make corners sharp (always rounded)  
❌ Don't use pure black (use navy `#1E293B`)  
❌ Don't make it too childish (avoid primary colors like red/yellow together)  
❌ Don't stretch or distort logos  
❌ Don't place logos on busy backgrounds  
❌ Don't add drop shadows to logos (built-in only)  
❌ Don't use more than 3 colors in one graphic  

---

## Expo Configuration

### app.json
```json
{
  "expo": {
    "name": "BountyFi",
    "slug": "bountyfi",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#1E3A8A",
      "resizeMode": "contain"
    },
    "ios": {
      "icon": "./assets/icon-rounded.png",
      "bundleIdentifier": "com.bountyfi.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1E3A8A"
      },
      "package": "com.bountyfi.app"
    }
  }
}
```

### Required Asset Exports
```
/assets
  /icon.png (1024×1024) - Use app-icon-strike-target.svg
  /icon-rounded.png (1024×1024) - Use app-icon-strike-target-rounded.svg
  /adaptive-icon.png (1024×1024) - Lightning bolt only (transparent bg)
  /splash.png (2048×2048) - Logo on admiral blue background
  /logo-horizontal.png - Use logo-hybrid-trophy-target.svg
  /logo-stacked.png - Use logo-when-winning.svg
```

---

## Design Inspiration References

### Similar Vibes (Study These)
- **Duolingo**: Playful animations, achievement celebrations
- **Robinhood**: Bold colors, confetti moments
- **Strava**: Activity badges, competitive leaderboards
- **Cash App**: Simple icons, bold gradients
- **Twitch**: Energy, live engagement

### What Makes BountyFi Different
- More sophisticated than Duolingo (adult audience)
- More celebratory than Robinhood (winning focus)
- More community than Strava (validation system)
- More tangible than Cash App (real-world tasks)

---

## Quick Start Checklist

Before building your app:
- [ ] Export all icon sizes from SVGs
- [ ] Create splash screen (logo centered on admiral blue)
- [ ] Set up color constants in theme file
- [ ] Install gradient library (react-native-linear-gradient)
- [ ] Choose 1-2 custom fonts (optional)
- [ ] Create component library for buttons/cards
- [ ] Test icons on iOS and Android devices

---

## Contact & Usage

These brand assets are proprietary to BountyFi.

For questions or custom variations:
- Email: brand@bountyfi.com (placeholder)
- Design system: Figma link (when created)

© 2025 BountyFi. All rights reserved.

---

**Now go build something that feels like winning! 🏆**
