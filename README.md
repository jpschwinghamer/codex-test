# Cinematic WebGL Lens Demo

A minimal, static HTML page that uses Three.js shaders to simulate looking at the content through imperfect cinema glass. The DOM remains fully interactive and scrollable while a WebGL canvas applies chromatic aberration, coma-like distortion, bloom/halation, and animated noise. Smooth scrolling is handled by a lightweight Lenis-inspired helper bundled locally to avoid cross-origin issues.

## Running locally

1. Serve the folder with a simple static server so module imports and html2canvas work reliably and without CORS errors:
   ```bash
   python -m http.server 8000
   ```
2. Visit http://localhost:8000 in your browser. The DOM remains interactive while the Three.js overlay renders the cinematic effect.

## How it works

- `html2canvas` captures the current viewport so the DOM can remain untouched.
- The capture is fed into a full-screen quad in Three.js.
- A fragment shader applies barrel distortion, per-channel offsets, bloom, vignette, and animated noise for a cinematic feel.
- A built-in Lenis-like helper provides eased scrolling so the capture refreshes smoothly while you move through the page—no external CDN needed.
