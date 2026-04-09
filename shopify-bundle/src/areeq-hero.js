/**
 * areeq-hero.js
 * Plain Three.js rewrite of ThreeDScene.tsx — no React dependency.
 * Exposes a single function: AreeqHero.init(containerElement, logoUrl)
 *
 * Usage in Shopify:
 *   AreeqHero.init(document.getElementById('areeq-hero-container'), logoUrl);
 */

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ─── GLSL Shaders (identical to ThreeDScene.tsx) ─────────────────────────────

const vertexShader = /* glsl */`
uniform float uTime;
uniform sampler2D uCollisionMap;
uniform float uLogoRotY;
attribute float aRandom;
varying float vAlpha;

void main() {
  vec3 pos = position;

  float speed = 4.0 + aRandom * 2.0;
  pos.x += uTime * speed;
  pos.x = mod(pos.x + 40.0, 80.0) - 40.0;

  pos.y += sin(pos.x * 0.2 + uTime * 0.5) * 1.5;

  float spinCos = cos(uLogoRotY);
  vec2 uv = (pos.xy / 14.0) + 0.5;
  float safeCos = sign(spinCos) * max(abs(spinCos), 0.05);
  uv.x = ((uv.x - 0.5) / abs(safeCos)) + 0.5;

  float mask = 0.0;
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0 && spinCos > 0.0) {
    mask = texture2D(uCollisionMap, uv).r;
  }

  if (mask > 0.1 && abs(pos.z) < 2.0) {
    float texelSize = 1.0 / 256.0;
    float maskR = texture2D(uCollisionMap, uv + vec2(texelSize, 0.0)).r;
    float maskL = texture2D(uCollisionMap, uv - vec2(texelSize, 0.0)).r;
    float maskU = texture2D(uCollisionMap, uv + vec2(0.0, texelSize)).r;
    float maskD = texture2D(uCollisionMap, uv - vec2(0.0, texelSize)).r;

    vec2 normal = normalize(vec2(maskL - maskR, maskD - maskU));
    if (length(normal) < 0.1) normal = vec2(0.0, sign(pos.y + 0.001));

    float pushStrength = 4.5 * aRandom;
    pos.xy += normal * pushStrength;
    pos.x -= 1.0;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (40.0 / -mvPosition.z) * aRandom;
  gl_Position = projectionMatrix * mvPosition;

  vAlpha = smoothstep(40.0, 30.0, abs(pos.x)) * 0.6;
}
`;

const fragmentShader = /* glsl */`
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  gl_FragColor = vec4(uColor, vAlpha * (0.5 - dist) * 3.5);
}
`;

// ─── Build collision map texture from logo SVG ────────────────────────────────

function buildCollisionMap(logoUrl) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 512, 512);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl;
    img.onload = () => {
      ctx.filter = 'brightness(0) invert(1)';
      const size = 512 * 0.8;
      const offset = (512 - size) / 2;
      ctx.drawImage(img, offset, offset, size, size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = () => {
      // Fallback: blank texture so particles still render
      const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
      texture.needsUpdate = true;
      resolve(texture);
    };
  });
}

// ─── Build 3D SVG logo mesh ───────────────────────────────────────────────────

function buildLogoMesh(logoUrl) {
  return new Promise((resolve, reject) => {
    const loader = new SVGLoader();
    loader.load(
      logoUrl,
      (data) => {
        const group = new THREE.Group();
        const innerGroup = new THREE.Group();
        innerGroup.scale.set(0.006, -0.006, 0.006);

        const material = new THREE.MeshStandardMaterial({
          color: '#d4af37',
          metalness: 1,
          roughness: 0.15,
          envMapIntensity: 2,
        });

        data.paths.forEach((path) => {
          const shapes = SVGLoader.createShapes(path);
          shapes.forEach((shape) => {
            const geometry = new THREE.ExtrudeGeometry(shape, {
              depth: 100,
              bevelEnabled: true,
              bevelThickness: 8,
              bevelSize: 4,
              bevelSegments: 4,
            });
            const mesh = new THREE.Mesh(geometry, material);
            innerGroup.add(mesh);
          });
        });

        // Centre the SVG group
        const box = new THREE.Box3().setFromObject(innerGroup);
        const centre = new THREE.Vector3();
        box.getCenter(centre);
        innerGroup.position.sub(centre);

        group.add(innerGroup);
        resolve(group);
      },
      undefined,
      (err) => {
        console.error('[AreeqHero] SVGLoader failed:', err);
        reject(new Error('Failed to load logo SVG: ' + logoUrl));
      }
    );
  });
}

// ─── Generate procedural env map ─────────────────────────────────────────────
// Removed in favor of RoomEnvironment for realistic metallic reflections.

// ─── Build dust particle system ───────────────────────────────────────────────

function buildDustParticles(collisionMap) {
  const count = 180000;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    const yr = Math.random() - 0.5;
    positions[i * 3 + 1] = Math.sign(yr) * Math.pow(Math.abs(yr), 1.2) * 25;
    positions[i * 3 + 2] = (Math.random() - 1.0) * 12;
    randoms[i] = Math.random() * 0.5 + 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLogoRotY: { value: 0 },
      uColor: { value: new THREE.Color('#e2b97c') },
      uCollisionMap: { value: collisionMap },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

// ─── Main init function ───────────────────────────────────────────────────────

export async function init(container, logoUrl) {
  if (!container) {
    console.error('[AreeqHero] Container element not found.');
    return;
  }

  // ── Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000);
  container.appendChild(renderer.domElement);

  // ── Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 15);

  // ── Procedural env map
  try {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
  } catch (err) {
    console.error('[AreeqHero] Env map generation failed:', err);
  }

  // ── Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const keyLight = new THREE.DirectionalLight(0xffe0a0, 1.2);
  keyLight.position.set(0, 8, 14);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xd4941a, 1.0);
  rimLight.position.set(10, 4, -6);
  scene.add(rimLight);

  // ── Spinner group (holds logo + dust)
  const spinnerGroup = new THREE.Group();
  scene.add(spinnerGroup);
  let dustParticles = null;

  // ── Animation loop — starts immediately to prevent black screen lockups
  const clock = new THREE.Clock();
  let animationId;

  function animate() {
    animationId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    spinnerGroup.rotation.y = elapsed * 0.4;
    spinnerGroup.position.y = Math.sin(elapsed * 0.5) * 0.2;

    if (dustParticles) {
      dustParticles.material.uniforms.uTime.value = elapsed;
      dustParticles.material.uniforms.uLogoRotY.value = spinnerGroup.rotation.y;
    }

    renderer.render(scene, camera);
  }
  animate();

  // ── Load assets async
  Promise.all([
    buildCollisionMap(logoUrl),
    buildLogoMesh(logoUrl),
  ]).then(([collisionMap, logoGroup]) => {
    spinnerGroup.add(logoGroup);
    dustParticles = buildDustParticles(collisionMap);
    scene.add(dustParticles);
  }).catch(err => {
    console.error('[AreeqHero] Asset loading failed:', err);
    // Render error visibly to DOM for debugging
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:absolute; top:50%; left:20px; color:red; font-family:monospace; z-index:9999; background:rgba(0,0,0,0.8); padding:1rem; border:1px solid red;';
    errDiv.textContent = '3D Render Error: ' + err.message;
    container.appendChild(errDiv);
  });

  // ── Resize handler
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    
    // Pull camera back on mobile screens so everything fits on the narrower width
    if (w < 768) {
      camera.position.z = 25;
    } else {
      camera.position.z = 15;
    }
    
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  onResize(); // Set initial camera distance

  // Return a cleanup function (handy if Shopify ever SPAs)
  return function destroy() {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };
}
