# Deep Dark Mode Implementation TODO

- [x] Update `src/app/globals.css` with premium deep dark tokens
  - [x] Redefine `.dark` palette (background/card/popover/border/input/muted text)
  - [x] Add neon accent tokens (blue/green/orange + glow variants)
  - [x] Add reusable premium dark surface effect class (inner shadow + subtle glass)
  - [x] Add hover polish class (border clarification + soft glow)

- [x] Update `tailwind.config.ts` to map new tokens
  - [x] Add `accentBlue`, `accentGreen`, `accentOrange` color groups
  - [x] Add boxShadow presets for deep dark cards/glow

- [x] Validate token compatibility with shadcn variable-based color system
