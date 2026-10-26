# Sam's Starship — Phase 1 Implementation Specification

## Project
Standalone SLButter browser game starring the existing Sam mascot.
Production target: starship.slbutter.com.
Keep separate from the school SPARK application.
Working title: Sam's Starship.

## Confirmed rules
- Each mission uses exactly ONE puzzle type: either hidden-number matching OR numerical sequences. Never require both puzzle types simultaneously in the same mission.\n- Puzzle type and difficulty are independent: each mission can be Easy, Medium, or Hard regardless of its puzzle type.\n- Mission examples: Restore the Lights (matching), Repair Navigation (sequences), Restart the Engines (matching), Restore Communications (sequences).
- Incorrect connection causes spaceship damage; losing all hull integrity loses the mission.
- Solo mode includes computer-controlled crewmates with their own hidden circuits and limited clue messages.
- Players cannot inspect other crew members' hidden circuit values.
- Emergency terminals permit a limited budget of numerical hints; no unrestricted communications.
- Correct matching circuits restore ship systems; mission wins after all required pairs are resolved.

## First playable vertical slice
1. Main menu: Solo Mission; Private Room and Public Match disabled and marked Coming Later. Solo Mission leads to mission selection, then Easy / Medium / Hard difficulty selection.
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
- Mission selection chooses a single puzzle type; difficulty selector independently offers Easy / Medium / Hard. First playable slice: one matching mission on Easy, with architecture ready for sequence missions and all difficulties.\n- 5-minute mission.
- 100 hull integrity; wrong connection costs 20.
- 3 initial hint-energy units on Easy; difficulty may tune circuit count, clue complexity, hint budget, and damage (playtest before finalizing).
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
