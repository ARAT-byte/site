"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Center, Environment, Lightformer, Text3D } from "@react-three/drei";
import { useRef, useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { SVGLoader } from 'three-stdlib';

function SvgLogo({ groupRef }: { groupRef: React.RefObject<THREE.Group> }) {
    const svg = useLoader(SVGLoader, '/logo.svg');
    const shapes = useMemo(() => svg.paths.flatMap((p: any) => p.toShapes(true)), [svg]);

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <Center>
                {/* Front SVG Logo */}
                <group scale={[0.004, -0.004, 0.004]} position={[0, 0, 0]}>
                    {shapes.map((shape: any, index: number) => (
                        <mesh key={`svg-${index}`}>
                            <extrudeGeometry
                                args={[shape, {
                                    depth: 100,
                                    bevelEnabled: true,
                                    bevelThickness: 8,
                                    bevelSize: 4,
                                    bevelSegments: 4
                                }]}
                            />
                            <meshStandardMaterial
                                color="#d4af37"
                                metalness={1}
                                roughness={0.15}
                                envMapIntensity={2}
                            />
                        </mesh>
                    ))}
                </group>
            </Center>
        </group>
    );
}

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  gl_FragColor = vec4(uColor, vAlpha * (0.5 - dist) * 3.5);
}
`;

const vertexShader = `
uniform float uTime;
uniform sampler2D uCollisionMap; // Front SVG Map
uniform float uLogoRotY;         // Current rotation of the 3D logo
attribute float aRandom;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Base speed moving left to right
  float speed = 4.0 + aRandom * 2.0;
  
  pos.x += uTime * speed;
  pos.x = mod(pos.x + 40.0, 80.0) - 40.0;

  // Wavy horizontal bands
  pos.y += sin(pos.x * 0.2 + uTime * 0.5) * 1.5;

  // ----------------------------------------------------
  // True 3D Dynamic Setup for Spinning Deflection
  // ----------------------------------------------------
  
  // Calculate the projected width based on rotation (cosine)
  float spinCos = cos(uLogoRotY);
  
  // Start with base UV mapping (same scale as before, roughly 14 units wide)
  vec2 uv = (pos.xy / 14.0) + 0.5;
  
  // Apply inverse projection to "squash" the UV space.
  float safeCos = sign(spinCos) * max(abs(spinCos), 0.05);
  uv.x = ((uv.x - 0.5) / abs(safeCos)) + 0.5;
  
  float mask = 0.0;
  
  // Only sample if the UV is physically within the 0-1 bounds 
  // and the front of the logo is facing the wind (spinCos > 0)
  // If the back is facing the wind, we don't have a collision mask, but it's okay since the text is gone
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0 && spinCos > 0.0) {
      mask = texture2D(uCollisionMap, uv).r;
  }
  
  // If we are hitting a stroke on the currently exposed face
  // We narrow the Z-depth so they only collide when passing through the center plane
  if (mask > 0.1 && abs(pos.z) < 2.0) {
      // Finite difference to find the normal of the stroke on the 2D projected mask
      float texelSize = 1.0 / 256.0; 
      float maskR = texture2D(uCollisionMap, uv + vec2(texelSize, 0.0)).r;
      float maskL = texture2D(uCollisionMap, uv - vec2(texelSize, 0.0)).r;
      float maskU = texture2D(uCollisionMap, uv + vec2(0.0, texelSize)).r;
      float maskD = texture2D(uCollisionMap, uv - vec2(0.0, texelSize)).r;
      
      vec2 normal = normalize(vec2(maskL - maskR, maskD - maskU));
      
      if (length(normal) < 0.1) normal = vec2(0.0, sign(pos.y + 0.001));
      
      // Aggressively push out of the stroke
      float pushStrength = 4.5 * aRandom;
      pos.xy += normal * pushStrength;
      
      // Slightly slow down x on hit
      pos.x -= 1.0;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (40.0 / -mvPosition.z) * aRandom;
  gl_Position = projectionMatrix * mvPosition;

  vAlpha = smoothstep(40.0, 30.0, abs(pos.x)) * 0.6;
}
`;

function DustParticles({
    collisionMap,
    logoRef
}: {
    collisionMap: THREE.Texture | null,
    logoRef: React.RefObject<THREE.Group>
}) {
    // Massively increased count for a denser sandstorm
    const count = 180000;

    const [positions, randoms] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const rnd = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 80;
            let yRandom = Math.random() - 0.5;
            // Slightly reduced power curve to concentrate more particles in the central flow band
            pos[i * 3 + 1] = Math.sign(yRandom) * Math.pow(Math.abs(yRandom), 1.2) * 25;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
            rnd[i] = Math.random() * 0.5 + 0.5;
        }
        return [pos, rnd];
    }, [count]);

    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

            // Pass the current rotation of the logo to the shader
            if (logoRef.current) {
                materialRef.current.uniforms.uLogoRotY.value = logoRef.current.rotation.y;
            }

            if (collisionMap) {
                materialRef.current.uniforms.uCollisionMap.value = collisionMap;
            }
        }
    });

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                uniforms={{
                    uTime: { value: 0 },
                    uLogoRotY: { value: 0 },
                    uColor: { value: new THREE.Color("#e2b97c") },
                    uCollisionMap: { value: new THREE.DataTexture(new Uint8Array([0]), 1, 1) }
                }}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
            />
        </points>
    );
}

function SceneContent({ collisionMap }: { collisionMap: THREE.Texture | null }) {
    // Main group ref that we will spin
    const rotatorRef = useRef<THREE.Group>(null);

    // Spin animation - now safely inside the Canvas context
    useFrame((state) => {
        if (rotatorRef.current) {
            // Slow continuous 360 spin
            rotatorRef.current.rotation.y = state.clock.elapsedTime * 0.4;
            // Retain the subtle bobbing
            rotatorRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
        }
    });

    return (
        <>
            <color attach="background" args={["#000000"]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <Environment preset="city" background={false} />

            <SvgLogo groupRef={rotatorRef as React.RefObject<THREE.Group>} />
            <DustParticles collisionMap={collisionMap} logoRef={rotatorRef as React.RefObject<THREE.Group>} />
        </>
    );
}

export default function ThreeDScene() {
    const [collisionMap, setCollisionMap] = useState<THREE.Texture | null>(null);

    // Generate the collision map exactly once when the component mounts on the client
    useEffect(() => {
        let isMounted = true;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 512;
        canvas.height = 512;

        const img = new Image();
        img.src = "/logo.svg";
        img.onload = () => {
            if (!isMounted) return; // Prevent state update if component unmounted while image was loading

            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.filter = "brightness(0) invert(1)";

            const size = Math.min(canvas.width, canvas.height) * 0.8;
            const x = (canvas.width - size) / 2;
            const y = (canvas.height - size) / 2;
            ctx.drawImage(img, x, y, size, size);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            setCollisionMap(texture);
        };

        // Cleanup function to prevent memory leaks and unmounted state updates
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            <SceneContent collisionMap={collisionMap} />
        </Canvas>
    );
}
