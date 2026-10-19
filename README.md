# MAX-FPS // Bodycam Protocol

A self-contained, mobile-first browser FPS prototype inspired by the body-camera presentation and close-quarters tension of Reissad Studio's **Bodycam**. It is an original, local single-player training simulation—not a Bodycam recreation, multiplayer service, or 1:1 firearm simulator.

## Run it

```bash
npm install
npm run dev
```

Open Vite's address in a modern desktop or mobile browser. For a production build:

```bash
npm run build
npm run preview
```

The renderer and in-game interface use **Babylon.js and Babylon GUI**. There are no downloaded game assets, remote runtime services, or external texture/audio files: the warehouse, operators, weapons, UI, and sound effects are generated in the project. The build targets browsers with WebGL support (WebGL 2 recommended). GitHub Actions builds and deploys GitHub Pages on pushes to `main`; the Vite build uses `/MAX-FPS/` as its Pages base path.

## Play

Choose **Deploy to Sector** to enter the warehouse live-fire drill. Clear escalating, repeatable enemy waves while preserving health and armor. Each cleared wave supplies a small amount of armor, health, reserve ammunition, and one frag (up to the carry limit). The after-action report appears when the operator is down; use **Redeploy** to start a fresh run.

### Desktop controls

| Action | Input |
| --- | --- |
| Move | `W A S D` |
| Look | Mouse (Deploy requests pointer lock; free-look fallback is supported) |
| Fire | Hold left mouse button |
| Aim down sights | Hold right mouse button |
| Sprint | Hold `Shift` while moving |
| Crouch | `C` |
| Reload | `R` |
| Select weapon | `1`–`8` or mouse wheel |
| Frag grenade | `Q` |
| Weapon light | `F` |
| Armory / loadout | `Tab` while in a run, or the Armory menu |
| Pause / resume | `Esc` or `P` |

### Touch controls

All in-game HUD and touch controls are drawn with Babylon GUI on the game canvas. Drag the lower-left virtual stick to move and drag an open area on the right to look. Hold **FIRE** to shoot; tap the compact actions to aim, sprint, crouch, reload, swap weapons, throw a frag, toggle the light, or pause. Semi-automatic weapons fire once per press; automatic weapons fire while held. Controls adapt to portrait and landscape layouts, with reduced render resolution and shadow-map size on touch devices.

## Weapons and systems

Eight original fictionalized weapons cover carbine, compact pistol, pump shotgun, marksman rifle, submachine gun, battle rifle, bolt-action rifle, and light machine gun roles. Each has its own magazine, reserve, fire cadence, spread, recoil, damage profile, and effective range. Head and body hits have different damage. The pump shotgun reloads one shell at a time and can be interrupted; the bolt rifle has a slower manual-action cadence; other weapons use timed magazine reloads.

The armory supports per-weapon optic, muzzle, and underbarrel choices. Reflex, 2×, and iron sights change the ADS view; suppressors trade some range and damage for quieter reports; compensators and vertical grips reduce recoil; a laser attachment adds a visible designator. Loadouts and settings are saved locally when browser storage is available.

Other implemented mechanics include a procedurally modelled warehouse with collision and shot blocking, enemy line-of-sight fire, armor/health damage, crouch and sprint movement, a real spot-lit weapon light, grenade trajectory/bounce/blast damage, per-wave resupply, synthesized weapon/reload/footstep/ambient audio, a subtle hit-confirmation reticle, body-camera sway, and a restrained lens overlay. Audio starts after the user's Deploy gesture to comply with mobile browser policies.

## Bodycam research notes

Research was based primarily on Reissad Studio's Steam listing and official Steam announcements, checked on 18 October 2026:

- *Bodycam* is made and published by **Reissad Studio** and entered Steam Early Access on **7 June 2024**. The listing describes a tactical multiplayer FPS with a true body-camera view, built in Unreal Engine 5.
- The Steam page pitches close-quarters combat, photoreal maps, teamwork, and competitive, casual, and co-op play. Its advertised mode list includes **Wingman**, **Body Bomb**, **Team Deathmatch**, **Deathmatch**, **Hardpoint**, **Gun Game**, and **Zombies**. Official v0.8 notes describe mode changes—Wingman becoming the default competitive mode and Body Bomb being removed—so store copy and the live rotation can diverge.
- The studio markets a physically connected first-person body/weapon presentation (“True Body”), and says it studied real footage, camera motion, optics, compression, exposure, and sound behavior. It also deliberately advertises no crosshair, ammo counter, or traditional HUD, alongside extensive weapon customization.
- Reissad Studio's September 2026 **Locked & Loaded** announcement calls out the Trenches map, loadouts, rebuilt weapon animations and sound design, and quality-of-life work. The update notes describe roughly **400 attachments** whose gameplay effects include ADS/swap/reload speed, recoil, spread, and visual kick. Its launch materials also covered a more structured kit system and new tactical gadgets; earlier official updates added experiences such as Zombie Village and CQB Powergun.
- This prototype takes those ideas as inspiration—camera motion, restrained presentation, tactile reload choices, loud/quiet weapon tradeoffs—but does not reuse Bodycam branding, maps, assets, code, or weapon models, and does not attempt to reproduce its complete catalogue.

Sources:

- [Bodycam — official Steam store page](https://store.steampowered.com/app/2406770/Bodycam/)
- [Bodycam — official Steam announcements](https://steamcommunity.com/app/2406770/announcements/)

## Implementation notes

- **Engine:** Babylon.js with modular imports and Babylon GUI; no Three.js/HTML HUD dependencies. Vite serves the local web build.
- **Rendering:** WebGL with an adaptive hardware scale, one main shadow-casting light, a small mobile light budget, simplified mobile shadows, instanced warehouse details, procedural surface textures, and low-poly generated models.
- **Audio:** Web Audio API synthesis—filtered noise, transient oscillators, low-end thumps, short slapback, footsteps, and room tone. No external sound files.
- **Mobile:** canvas-native Babylon GUI joystick/action controls, touch look, responsive portrait/landscape positioning, reduced pixel ratio on touch hardware, optional vibration, and gesture-gated audio startup.
- **Scope:** This is a local single-player prototype. Enemies are scripted targets; it has no network play, full ballistic/penetration simulation, authored motion capture, or the fidelity/content scale of a commercial Unreal Engine production.
