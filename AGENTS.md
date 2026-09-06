# UX/UI Principles

The following principles must be enforced in all frontend layout, CSS, and component generation:

1. **MINIMALISM & COGNITIVE ERGONOMICS**
   - Eliminate all unnecessary visual noise, borders, and decorative elements. Use whitespace fundamentally to group related items.
   - Implement a strictly monochromatic base palette (slate/gray scales) with a single, muted accent color for primary actions.
   - Prioritize content over chrome. The journaling text and AI conversation must be the focal point.

2. **TYPOGRAPHY & READABILITY**
   - Use a clean, highly legible system sans-serif font stack. Do not use serif fonts unless explicitly requested.
   - Enforce optimal reading widths for text (60-80 characters per line, e.g., `max-w-prose` or `max-w-2xl`).
   - Use distinct typographic hierarchy: subtle contrast for metadata, high contrast for primary text.

3. **FLUID INTERACTION & STATE FEEDBACK**
   - Implement optimistic UI updates for all user actions (messages, task completions).
   - Provide subtle, non-blocking loading states (skeleton loaders, muted pulsing text) instead of heavy blocking spinners.
   - Never use disruptive modal popups (`alert`, `confirm`) for standard errors. Route network or API errors to inline toast notifications.

4. **STRUCTURAL LAYOUT & RESPONSIVENESS**
   - Design a fluid, mobile-first grid.
   - Ensure the UI allows for a "zen mode" where sidebars and panels are fully collapsible.
   - Ensure smooth CSS transitions (e.g., `transition-all duration-200 ease-in-out`) for panels and state changes.

5. **ACCESSIBILITY (a11y)**
   - Guarantee fully keyboard-navigable interfaces.
   - Maintain WCAG AA compliance for text contrast.
   - Include descriptive `aria-label` attributes on all icon-only buttons.
