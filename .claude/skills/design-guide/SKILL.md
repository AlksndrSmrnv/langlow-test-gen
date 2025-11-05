---
name: design-guide
description: Modern UI design standards and principles. Use when creating or modifying any user interface elements including HTML/CSS, React components, web applications, dashboards, or any visual UI work. Ensures consistent, professional, minimal design aesthetic.
---

# Design Guide

Apply these design principles to all UI work to ensure modern, professional interfaces.

## Core Design Principles

### Clean and Minimal
- Generous whitespace - let elements breathe
- Avoid cluttered layouts
- Remove unnecessary elements
- Focus on content hierarchy

### Color Palette
- Base: Grays and off-whites (e.g., #F9FAFB, #F3F4F6, #E5E7EB, #9CA3AF, #6B7280, #374151)
- ONE accent color used sparingly for CTAs and important elements
- NEVER use generic purple/blue gradients
- Avoid rainbow gradients and multi-color schemes

### Spacing System
Use 8px grid system exclusively:
- 8px, 16px, 24px, 32px, 48px, 64px
- Apply consistently to padding, margins, gaps
- Maintains visual rhythm and alignment

### Typography
- Minimum 16px for body text
- Clear hierarchy: headings significantly larger than body
- Maximum 2 fonts (one for headings, one for body)
- Line height: 1.5-1.6 for body text
- Adequate letter spacing for readability

### Visual Effects
- Subtle shadows: `box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)`
- Avoid heavy or overdone shadows
- Rounded corners: 4px-8px for most elements (not everything needs rounding)
- Use depth sparingly and purposefully

### Interactive States
Always define clear states:
- Hover: subtle color change or shadow increase
- Active: slight scale or darker shade
- Disabled: reduced opacity (0.5-0.6) with cursor: not-allowed
- Focus: visible outline for accessibility

### Mobile-First Approach
- Design for mobile screens first
- Use responsive breakpoints: 640px, 768px, 1024px, 1280px
- Test touch target sizes (minimum 44px)
- Stack elements vertically on small screens

## Component Guidelines

### Buttons
```css
/* Good example */
.button {
  padding: 12px 24px;
  border-radius: 6px;
  background: #374151;
  color: white;
  border: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  transition: all 0.2s;
}

.button:hover {
  background: #1F2937;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

Avoid:
- Gradient backgrounds
- Multiple colors on single button
- Excessive shadows or glows

### Cards
- Clean borders (1px solid #E5E7EB) OR subtle shadow - not both
- Padding: 24px or 32px
- Background: white or very light gray
- Rounded corners: 8px

```css
/* Good example - border version */
.card {
  padding: 24px;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}

/* Good example - shadow version */
.card-shadow {
  padding: 24px;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-radius: 8px;
}
```

### Forms
- Labels above inputs, not placeholder-only
- Input padding: 12px 16px
- Clear error states (red border + error message below)
- Consistent spacing between fields: 24px
- Group related fields visually

```css
.input {
  padding: 12px 16px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 16px;
}

.input:focus {
  outline: none;
  border-color: #3B82F6; /* accent color */
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.input.error {
  border-color: #EF4444;
}
```

### Layout
- Max content width: 1200px-1400px for readability
- Sidebar: 240px-280px
- Grid gaps: 24px or 32px
- Section spacing: 48px or 64px

## Anti-Patterns to Avoid

### DON'T
- Tiny text below 14px (except captions at 13px minimum)
- Inconsistent spacing (mixing random values like 13px, 27px, 41px)
- Every element a different color
- Heavy drop shadows or glows
- Over-rounded corners (30px+ border-radius on small elements)
- Gradient backgrounds unless subtle and purposeful
- Centered text for long paragraphs
- Low contrast text (ensure WCAG AA: 4.5:1 for normal text)

### DO
- Test on multiple screen sizes
- Use semantic HTML elements
- Ensure keyboard navigation works
- Maintain consistent visual weight
- Keep hover/active states subtle but noticeable
- Use loading states for async operations
- Provide clear visual feedback for user actions

## Recommended Color Palettes

### Neutral Base (use for most UI)
```
Gray 50:  #F9FAFB
Gray 100: #F3F4F6
Gray 200: #E5E7EB
Gray 300: #D1D5DB
Gray 400: #9CA3AF
Gray 500: #6B7280
Gray 600: #4B5563
Gray 700: #374151
Gray 800: #1F2937
Gray 900: #111827
```

### Accent Color Options (pick ONE)
- Blue: #3B82F6
- Green: #10B981
- Red: #EF4444
- Orange: #F59E0B
- Teal: #14B8A6

Use accent color for:
- Primary CTAs
- Links
- Active states
- Important notifications

## Quick Checklist

Before finalizing any UI, verify:
- [ ] Spacing uses 8px increments
- [ ] Text is 16px minimum for body
- [ ] Only one accent color used
- [ ] Clear hover/active/disabled states
- [ ] No gradients (unless specifically requested)
- [ ] Shadows are subtle
- [ ] Works on mobile (320px+)
- [ ] Good color contrast for accessibility
- [ ] Consistent component styling throughout
