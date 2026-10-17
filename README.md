# One Last Flower, Just for You 🌸

A mobile garden game built around your original illustrations, with the new garden/cliff backgrounds and final dialogue flow. Runtime artwork is PNG. Characters and scenery are not drawn procedurally.

## Play

Install Node.js 24 or newer, run `npm start` in this folder, and open http://localhost:4173. Keep the server running. On the same Wi-Fi, a phone can use this computer’s local IP address with port 4173, if the firewall permits it.

For cloud deployment (Render, Railway, Fly.io, Docker Compose, or VPS), see [DEPLOYMENT.md](file:///c:/Users/NAMI/Downloads/new%20game/DEPLOYMENT.md). The app includes ready-to-use Dockerfile, docker-compose.yml, render.yaml, fly.toml, and railway.json.

Access the Admin & Player Insights Dashboard at http://localhost:4173/admin (default key: `love`, configurable via `ADMIN_KEY`).

## Controls and story

- Hold the arrows to walk and tap the up arrow to jump. Multi-touch works.
- Keyboard: arrows or A/D to walk; Space, Up, or W to jump; Escape to pause.
- Collect four flowers, including the original two raised-platform flowers. Continue to the cliff, fail the first jump, and succeed on the second.
- Dialogue uses your supplied final wording. Important story bubbles advance with Next. The fourth-flower message waits for Next. The existing fast jump and collection animation timings are retained.
- The love slider has six choices: 10/10, 20/10, 50/10, 100/10, 1000/10, and infinity. Only Submit answer shows its reaction. Try another number lets the player explore them.
- The playful Yes/No question is separate from the real meeting choice. Its No button uses a sad emoji and continues with Next. Not yet leads to a calm flower ending. Both endings finish with a wave and Play again.
- Music starts after interaction. Mute, pause, and automatic pause on switching away remain available.

Movement speed, gravity, collision logic, ordinary jump height, and the two special jump heights are unchanged. The four-flower hunt now spans 1,450 world units with nine platforms; the moving bridge carries the player and freezes when paused. Visual offsets align the existing world with the new backgrounds. The cliff uses the cliff already painted in your second background.

## Database and player data
 
The server creates `data/meeting-dates.sqlite` automatically. Set `GAME_DB_PATH` to choose another persistent location. Back up this file to preserve confirmed dates and player data.

When players interact with the game, the database records:
- **Player profile / session**: Player name (entered on title screen or "Cute Little Mouse"), session UUID, start & finish timestamps, play duration.
- **Milestones**: Flowers collected (0-4), special cliff flower bouquet, jump attempts.
- **Player choices**: Love rating selected (10/10 up to ∞), Secret Question response ("Yes ❤️" or "No 😢"), and Meeting Choice ("Choose a day ❤️" or "Not yet 🌸").
- **Confirmed dates**: Validated future date confirmed in the calendar, with idempotent retry deduplication.

To view saved player data and confirmed dates, open the Admin Dashboard at `/admin` and authenticate with `ADMIN_KEY` (default: `love`). You can view live statistics, inspect each player session, and export the data as CSV or JSON.

## Artwork and typography

All 54 source PNGs remain in the project root. `assets/manifest.json` records them and the extracted frames. There are 192 transparent animation frames, including 102 frames extracted from the newly supplied sheets. Only relevant expressions are shown; the Not yet ending never uses the sad or crying sheets. Thinking and shy scenes hold one consistent original pose with a gentle 4.5-second breathing cycle, rather than cycling through different expressions. Reduced-motion mode holds those poses still.

Flowers render from their visible source bounds at a uniform scale, preserving the original petal shapes and round centers. Transparent padding does not affect their size or ground position. The special flower uses the supplied detailed third flower; small sparkle accents sit outside its bloom instead of covering its petals.

Your original Start and Next lettering is preserved in the PNGs. The original meeting-choice lettering was used as a typography reference and remains unchanged in its source. The new flow requires different choice labels, so those labels use a separate illustrated blank PNG instead of covering the original captions.

Kalam Regular and Bold are self-hosted. They were selected by comparing Kalam, Caveat, and Patrick Hand with your Start, Next, and Meeting Choice images. This is a close visual match, not a claim that the original artist used Kalam. The SIL Open Font License and font credits are included in `assets/fonts/`. See `qa/visual-fix/font-comparison.png`.

Six additional UI PNGs were illustrated from the original button/card references: a blank button, slider rail, calendar selection tile, landscape panel, portrait panel, and slim banner. The slim banner is retained but unused in the final flow. All character frames, flowers, scenery, controls, hearts, and effects come from your original artwork. See `VISUAL-AUDIT.md` for the full audit and screenshots.

Canvas only composites the supplied PNG frames. CSS handles layout, typography, focus indicators, and interactions; it does not create substitute illustrations. The emojis expressly requested in the final dialogue are retained as text. Flower and heart symbols use original PNG cutouts with their original symbols preserved as accessible text.

Background music is your supplied `1018.mp3`, copied unchanged to `assets/audio/background-music.mp3`. It starts on Start, loops throughout the game, and respects mute, pause, and hidden-tab behavior. Replay returns to a silent title and the next Start restarts the track. The original synthesized collection and jump sound effects remain.

## Validation and development

`npm test` checks platform collisions, the stepped route at 30/60 fps, moving-bridge reachability across its cycle, rider carrying, prevention of ground shortcuts, two special jump heights, real future dates, replay state, database persistence after reopening, retry deduplication, and private-file access restrictions.

`qa/final-playthrough.cjs` plays the game with actual keyboard and button input twice, checks exact dialogue and all six reactions, both secret answers, both meeting endings, absence of the skip link, save failure/retry, pause, replay, and responsive layouts. `qa/touch.cjs` checks simultaneous touch movement/jump, release, and cancellation. `qa/music.cjs` verifies MP3 playback from Start, continuity across scenes, mute, pause/resume, replay, and audio range requests. These scripts use this workspace’s bundled Playwright path; adjust that import on another computer.

Reviewed in Edge/Chromium at 320×568, 390×844, 430×932, 450×800, and 1280×800. Physical phone and Safari testing was not performed.

To reproduce asset preparation, use Python with Pillow, NumPy, and SciPy, then run these in order: `tools/process_assets.py`, `tools/prepare_visual_assets.py`, and `tools/import_new_art.py`. The illustrated source atlases for the second step are retained in `qa/visual-fix/`. Asset preparation is not required to play.

The downloadable game archive includes the runtime, fonts and licenses, server, tests, and this README. Full source sheets and the screenshot audit stay in the workspace.
