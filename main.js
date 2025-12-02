import Lenis from './lenis-lite.js';
import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';

const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const geometry = new THREE.PlaneGeometry(2, 2);

const uniforms = {
  tDiffuse: { value: null },
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  uAberration: { value: 1.2 },
  uDistortion: { value: 0.9 },
  uBloom: { value: 0.45 },
  uNoise: { value: 0.025 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uAberration;
    uniform float uDistortion;
    uniform float uBloom;
    uniform float uNoise;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    vec2 barrelDistortion(vec2 coord, float amt) {
      vec2 cc = coord - 0.5;
      float dist = dot(cc, cc);
      return coord + cc * dist * amt;
    }

    void main() {
      vec2 uv = vUv;
      float vignette = 1.0 - smoothstep(0.45, 0.9, distance(uv, vec2(0.5)));

      // Animate slight swirl for coma-like distortion.
      float angle = (uv.y - 0.5) * 0.32 + sin(uTime * 0.15) * 0.08;
      mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      vec2 centered = uv - 0.5;
      vec2 distorted = rot * centered;
      uv = barrelDistortion(distorted + 0.5, 0.18 * uDistortion);

      vec2 aberrationOffset = (uv - 0.5) * 0.02 * uAberration;
      vec4 color;
      color.r = texture2D(tDiffuse, uv + aberrationOffset).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - aberrationOffset).b;
      color.a = 1.0;

      // Simple bloom/halation: sample blurred offsets.
      vec4 bloom = vec4(0.0);
      float radius = 0.002 + 0.003 * sin(uTime * 0.2);
      bloom += texture2D(tDiffuse, uv + vec2(radius, 0.0));
      bloom += texture2D(tDiffuse, uv - vec2(radius, 0.0));
      bloom += texture2D(tDiffuse, uv + vec2(0.0, radius));
      bloom += texture2D(tDiffuse, uv - vec2(0.0, radius));
      bloom *= 0.25;

      float noise = (rand(uv * uResolution + uTime) - 0.5) * uNoise;

      vec3 finalColor = mix(color.rgb, bloom.rgb, uBloom);
      finalColor += noise;
      finalColor *= vignette;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  transparent: true,
});

const quad = new THREE.Mesh(geometry, material);
scene.add(quad);

let captureCanvas = null;
let captureTexture = null;
let needsCapture = true;
let captureTimeout;
let isCapturing = false;

function capture() {
  if (captureTimeout) {
    clearTimeout(captureTimeout);
  }

  captureTimeout = setTimeout(async () => {
    if (isCapturing) return;
    isCapturing = true;

    try {
      captureCanvas = await html2canvas(document.body, {
        backgroundColor: null,
        useCORS: true,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: window.innerHeight,
        ignoreElements: (el) => el.id === 'webgl',
      });

      if (!captureTexture) {
        captureTexture = new THREE.CanvasTexture(captureCanvas);
        captureTexture.minFilter = THREE.LinearFilter;
        captureTexture.magFilter = THREE.LinearFilter;
        uniforms.tDiffuse.value = captureTexture;
      } else {
        captureTexture.image = captureCanvas;
      }

      captureTexture.needsUpdate = true;
      needsCapture = false;
    } catch (error) {
      console.error('Capture failed', error);
    } finally {
      isCapturing = false;
    }
  }, 80);
}

const lenis = new Lenis({
  smoothWheel: true,
  smoothTouch: false,
  lerp: 0.08,
});

lenis.on('scroll', () => {
  needsCapture = true;
});

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  needsCapture = true;
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

window.addEventListener('load', () => {
  needsCapture = true;
});

let lastTime = 0;

function animate(time) {
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  lenis.raf(time);

  uniforms.uTime.value += delta;

  if (needsCapture) {
    capture();
  }

  if (captureTexture) {
    captureTexture.needsUpdate = true;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

capture();
requestAnimationFrame(animate);
