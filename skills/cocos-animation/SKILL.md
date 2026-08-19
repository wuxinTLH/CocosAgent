---
name: cocos-animation
description: Analyze and optimize Cocos Creator AnimationClip assets, extract state candidates through project-local OCR, and generate public-API animation state controllers.
---

# Cocos Animation

Use this Skill for Cocos Creator 3D animation analysis, state flow design, and controller generation.

## Scope

- Access is restricted to the current Cocos project root.
- `.anim` and AnimationController resources are editor-managed. This Skill reads existing `.anim` JSON but does not synthesize or mutate private resource schemas.
- Controller generation emits TypeScript using public Cocos APIs: `Animation`, `@ccclass`, `@property`, and `Animation.crossFade`.

## Workflow

1. Use `animation analyze <clip.anim>` to inspect duration, sampling, tracks, and events.
2. Use `animation optimize <clip.anim>` to receive non-destructive recommendations.
3. Use `animation ocr --image <screen.png>` to extract state candidates from an editor or gameplay screenshot.
4. Define states and transitions, for example `idle -> run -> jump`.
5. Generate a controller in `full-access` mode with `animation controller` or MCP `animation_create_controller`.

## MCP Tools

- `animation_analyze`
- `animation_optimize`
- `animation_ocr_states`
- `animation_create_controller`

## State Definition

```json
{
  "initial": "idle",
  "states": ["idle", "run", "jump"],
  "transitions": [
    { "from": "idle", "to": "run", "trigger": "move" },
    { "from": "run", "to": "jump", "trigger": "jump" },
    { "from": "jump", "to": "idle", "trigger": "land" }
  ]
}
```

Only `animation_create_controller` writes files and therefore requires `full-access`. All other operations are read-only within the project sandbox.