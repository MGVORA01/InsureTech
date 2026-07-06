# Frontend Refactoring Plan

## Goals
- Improve structure and maintainability without changing business logic, routes, auth flow, state management, or UI behavior.
- Preserve existing functionality while creating a cleaner production-style architecture.

## Planned structure
- src/layouts for layout components
- src/routes for route guards
- src/services for API-oriented service modules
- src/config for shared HTTP configuration
- src/context for future shared context providers
- src/components/ui for reusable shared UI primitives
- src/constants and src/utils for shared constants/helpers

## Scope
- Introduce new folders and barrel files for cleaner imports
- Re-export existing modules from the new structure to avoid breakage
- Use existing UI components where possible and add lightweight shared primitives
- Fix current TypeScript issues uncovered during build verification

## Non-goals
- No changes to API payloads, auth behavior, routing semantics, or visible UI logic
