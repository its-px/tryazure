# Animation Steps Playbook

A modern, minimal, high-quality approach to animating step-based UI (onboarding, checkout, wizard flows) without breaking existing behavior.

## 1) Design Intent First

Before writing animation code, lock these decisions:

- Motion style: calm, precise, low-noise.
- Duration scale:
  - Micro interactions: 120-180ms
  - Step transitions: 220-320ms
  - Entering large sections: 300-420ms
- Easing:
  - Standard: cubic-bezier(0.22, 1, 0.36, 1)
  - Exit: cubic-bezier(0.4, 0, 1, 1)
- Animation budget: only animate opacity + transform unless there is a clear reason.

Why this matters:

- Keeps UI feeling premium and consistent.
- Reduces risk of layout jank and regressions.

## 2) Safe Technical Rules

Use these as non-negotiable constraints:

- Do not change business logic while adding animations.
- Do not rename existing props, routes, or state keys.
- Avoid animating width, height, top, left for core transitions.
- Prefer translateY, scale, opacity.
- Keep all animations behind a single reusable wrapper.
- Respect reduced motion.

## 3) Motion Tokens (Single Source of Truth)

Create shared motion tokens once and reuse everywhere.

Suggested token set:

- --motion-fast: 160ms
- --motion-base: 260ms
- --motion-slow: 360ms
- --ease-standard: cubic-bezier(0.22, 1, 0.36, 1)
- --ease-exit: cubic-bezier(0.4, 0, 1, 1)
- --step-shift: 12px

This prevents random timing across pages.

## 4) Recommended Step Animation Pattern

For step-based screens, use this structure:

- Current step exits with subtle fade + upward shift.
- Next step enters with fade + downward-to-neutral shift.
- Keep overlap short to feel fluid.

Visual formula:

- Exit: opacity 1 -> 0, translateY(0 -> -8px), 180-220ms
- Enter: opacity 0 -> 1, translateY(12px -> 0), 240-320ms

## 5) Accessibility and Reliability

Always include:

- prefers-reduced-motion handling.
- Focus management after step change (focus heading or first field).
- No animation that hides validation errors or toast alerts.
- Keyboard navigation remains unchanged.

Reduced motion policy:

- Keep content transition instant or <= 80ms opacity only.

## 6) Performance Guardrails

- Use will-change only on active animated elements.
- Avoid animating large parent containers and full-page wrappers together.
- Keep shadows/filters static during transition when possible.
- Test on low-power mobile once before shipping.

## 7) Production Workflow (No Breakage)

1. Create a dedicated branch for animation work.
2. Add motion tokens only.
3. Animate one step container in one route.
4. Run lint + typecheck.
5. Manually test core path (next, back, validation, submit).
6. Commit.
7. Repeat for the next flow.

## 8) AI Prompt You Can Reuse

Use this prompt when asking AI to implement the animation:

Add minimal, premium step transition animation to this component only.
Constraints:

- Keep all business logic and TypeScript types unchanged.
- Animate only opacity and transform.
- Enter: 260ms, Exit: 200ms.
- Use easing cubic-bezier(0.22, 1, 0.36, 1).
- Add prefers-reduced-motion support.
- Preserve keyboard/focus behavior.
- Return a minimal patch only, no unrelated refactors.

## 9) Visual Quality Checklist

Before merge:

- Motion feels intentional, not flashy.
- Timing is consistent with tokens.
- No stutter when rapidly switching steps.
- Errors/messages stay readable while animating.
- Mobile interaction feels as good as desktop.

## 10) If You Use Framer Motion

Use one shared variant object for all step containers. Keep transitions short and predictable.

Suggested variant behavior:

- initial: opacity 0, y 12
- animate: opacity 1, y 0
- exit: opacity 0, y -8
- transition: base easing and duration tokens

Do not mix multiple competing animation libraries in the same flow.

## 11) Animate Top-Level Page Switches (Booking, Info, QR, Account)

Use the same motion language for top-level panel switches, not only wizard steps.

In this project, page rendering is controlled by currentPage with values:

- booking
- info
- qr
- account

Goal:

- Every time one of these panels gets rendered, it should animate in.
- The previous panel should animate out.
- Keep transitions subtle and consistent with step motion.

Recommended behavior:

- Enter: opacity 0 -> 1 and y 12 -> 0
- Exit: opacity 1 -> 0 and y 0 -> -8
- Duration: 240-320ms
- Easing: cubic-bezier(0.22, 1, 0.36, 1)

Implementation pattern (Framer Motion):

```tsx
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const prefersReducedMotion = useReducedMotion();

const pageVariants = {
  initial: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: prefersReducedMotion ? 0 : -8 },
};

const pageTransition = {
  duration: prefersReducedMotion ? 0.08 : 0.28,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={currentPage}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    style={{ willChange: prefersReducedMotion ? "auto" : "transform, opacity" }}
  >
    {renderPage()}
  </motion.div>
</AnimatePresence>
```

Important:

- Use key={currentPage} so each panel mount/unmount triggers animation.
- Keep this wrapper at the page-content level only (not around Hero).
- Do not add nested heavy animations inside each page unless necessary.

## 12) Optional Directional Page Motion

If you want directional feel (for example booking -> info -> qr -> account), define a page order map and derive direction:

```tsx
const pageOrder = { booking: 0, info: 1, qr: 2, account: 3 } as const;
```

Then set direction by comparing previous and current index, exactly like step direction.

Use this only if it feels natural. If navigation is non-linear, non-directional motion is usually cleaner.

## 13) Testing Checklist for Page Render Animation

- Switch rapidly between booking/info/qr/account.
- Confirm no flicker and no layout jump.
- Confirm LoginModal still appears immediately when needed.
- Confirm Hero remains stable and does not re-animate on every switch.
- Confirm reduced motion behavior works.

---

If you want, the next step is to apply this page-transition wrapper directly in UserPanel so every top-level panel render is animated with the same visual language as step transitions.
