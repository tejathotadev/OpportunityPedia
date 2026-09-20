# Hyperframes Composition Brief: OpportunityPedia

## Objective
Create a short launch-style brag video for OpportunityPedia (OpportunityX).

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 15-25 seconds (flex to voiceover; target ~22–24s)

## Source Material
- Project root: OpportunityPedia/
- Primary files read: marketing Hero/Problem/HowItWorks/FinalCta, site.ts, styles/index.css, USER_GUIDE.md, README.md
- Product name: OpportunityPedia
- Tagline / strongest claim: We make opportunity easier to see.
- Key UI or visual moment to recreate: Overview **Run** + hot opportunity cards + Discover/Prioritize/Act
- Copy that must appear verbatim:
  - We make opportunity easier to see.
  - Discover. Prioritize. Act.
  - OpportunityPedia

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium product film
- Interpretation: restraint, slow reveals, one claim per scene, elegant mixed-case type
- Angle: Fragmented opportunity → Radar → hot signals → act together
- Hook: Tagline at full scale on paper
- Outro / punchline: Forest CTA field with product name + tagline
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Purple gradients / glow spam

## Visual Identity
- Background: `#f7f7f2`
- Text: `#111827`
- Accent: `#12372a` / `#21805d` / Very Hot `#d9432f`
- Display font: Georgia (Instrument Serif stand-in if local font unavailable)
- Body font: system-ui / Inter stand-in
- Visual references from the project: paper canvas, forest CTA, signal green, editorial labels

## Storyboard
1. Hook — 5s — tagline on paper
2. Radar — 6s — Run control + scan claim
3. Signals — 7s — Discover/Prioritize/Act + hot cards
4. Outro — 5s — forest brand close

## Audio
- Audio role: warm corporate bed with sparse professional accents
- Audio arc: soft open → duck under VO → gentle lift on product moments → fade under logo
- Music: happy-beats-business-moves-vol-10-by-ende-dot-app.mp3
- Music treatment: volume ~0.14 under VO; fade out last 1.5s
- Music cue guidance: bundled preset for vol-10; optional locks ~5.19 / 11.47 / 18.55
- Audio-reactive treatment: subtle card/glow presence with RMS if extraction available; else skip
- Audio-coupled moments:
  - Scene 2 — simulated Run tap
  - Scene 3 — sequential stage reveals
  - Scene 4 — final logo
- SFX selection guidance: soft interface drops/clicks; low HF risk
- SFX analysis guidance: brag skill `assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes implementation
- Voiceover: Kokoro `af_heart` → `assets/voiceover.wav`; music ducks to 0.12–0.15
- Audio files: copy music (+ selected SFX) into composition/assets/

## Hyperframes Instructions
Follow hyperframes-core / animation / creative / keyframes / cli. Do not enter generic promo interview. Show real product copy. Readable text. 15–25s. Run `hyperframes check` before render.
