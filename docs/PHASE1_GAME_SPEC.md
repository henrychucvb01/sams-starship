# Sam's Starship — Phase 1 Implementation Specification

## Project
Standalone SLButter browser game starring the existing Sam mascot.
Production target: starship.slbutter.com.
Keep separate from the school SPARK application.
Working title: Sam's Starship.

## Confirmed rules
- Cooperative numerical deduction: match hidden numbered circuits across isolated spaceship rooms. Do not substitute a generic rotate-the-wires puzzle.
- Incorrect connection causes spaceship damage; losing all hull integrity loses the mission.
- Solo mode includes computer-controlled crewmates with their own hidden circuits and limited clue messages.
- Players cannot inspect other crew members' hidden circuit values.
- Emergency terminals permit a limited budget of numerical hints; no unrestricted communications.
- Correct matching circuits restore ship systems; mission wins after all required pairs are resolved.

## First playable vertical slice
1. Main menu: Solo Mission; Private Room and Public Match disabled and marked Coming Later.
2. Brief opening: ship attacked, crew isolated, critical systems offline.
3. Solo mission: Sam plus two AI crewmates; a seeded deck of paired numbers; assign each pair across distinct crew rooms. Never show AI private numbers directly to the player.
4. Display Sam's circuits, AI room silhouettes, ship hull integrity, restored circuit count, hint-energy budget, mission clock, and event log.
5. Allow player to select one of Sam's numbered circuits and attempt to match it to a particular hidden slot belonging to an AI crewmate.
6. Correct guess resolves both slots and increases restored circuit count. Incorrect guess reduces hull integrity and shows clear feedback without revealing the target's value.
7. Hint button consumes energy; AI returns truthful, useful, bounded numerical information (e.g. whether a selected slot is above/below a threshold). Hints must not leak the full hidden board.
8. AI crew takes simple deterministic turns using only information legitimately available to them; avoid omniscient play. Keep an explicit information state for each crewmate.
9. Victory and defeat screens with Restart and Return to Menu.
10. Responsive, accessible UI: keyboard/touch controls, no essential information conveyed by color alone, readable labels.

## Prototype defaults (adjustable after testing)
- 5-minute mission.
- 100 hull integrity; wrong connection costs 20.
- 3 initial hint-energy units.
- 6 matching pairs distributed across the three crew members.
- Seeded/replayable puzzle generator for testing.
These numbers are provisional tuning values, not previously approved design decisions.

## Engineering
- React + TypeScript + Vite for a lightweight Vercel-compatible static SPA.
- Separate pure game logic from UI and AI strategy; deterministic seeded tests.
- No backend, paid services, authentication, or realtime infrastructure for phase 1.
- No copyrighted Bomb Busters assets, names, UI layouts, or exact copied rulebook text.
- Pastel sci-fi placeholders until approved Sam mascot assets are available; do not invent a replacement mascot.
- Build and test locally before merging to main.
- Preserve main branch and open a PR for review.

## Later phases
- Private multiplayer rooms and realtime synchronization.
- Public matchmaking.
- Additional missions, story, visual polish, sound, rewards.
