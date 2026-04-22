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

---

If you want, the next step is to apply this playbook to one real component (for example your step/wizard screen) and generate a safe, minimal patch.