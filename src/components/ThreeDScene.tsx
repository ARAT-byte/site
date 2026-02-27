"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Environment, Lightformer, Text3D } from "@react-three/drei";
import { useRef, useState, useMemo } from "react";
import * as THREE from "three";

function Logo() {
    const meshRef = useRef<THREE.Group>(null);

    // Subtle floating animation
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
        }
    });

    // Ensure we use a standard font like Helvetiker or Inter if available.
    // We'll use a widely available font URL from drei's examples or generate one.
    return (
        <group ref={meshRef} position={[0, 0, 0]}>
            <Center>
                <Text3D
                    font="https://threejs.org/examples/fonts/helvetiker_bold.typeface.json"
                    size={3.0} // Logo made smaller (from 5 to 3)
                    height={1.0}
                    curveSegments={32}
                    bevelEnabled
                    bevelThickness={0.1}
                    bevelSize={0.05}
                    bevelOffset={0}
                    bevelSegments={8}
                >
                    D
                    <meshStandardMaterial
                        color="#d4af37"
                        metalness={1}
                        roughness={0.15}
                        envMapIntensity={2}
                    />
                </Text3D>
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
  // Soft sand particle - increased opacity multiplier from 2.0 to 3.5
  gl_FragColor = vec4(uColor, vAlpha * (0.5 - dist) * 3.5);
}
`;

const vertexShader = `
uniform float uTime;
attribute float aRandom;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Base speed moving left to right
  float speed = 4.0 + aRandom * 2.0;
  
  // Continuous horizontal flow and wrap
  // Spawns back at -40, flows to +40
  pos.x += uTime * speed;
  pos.x = mod(pos.x + 40.0, 80.0) - 40.0;

  // Wavy horizontal bands
  pos.y += sin(pos.x * 0.2 + uTime * 0.5) * 1.5;

  // Obstruction logic around the central 'D' (at x=0, y=0)
  float distToCenter = length(pos.xy);
  float radius = 3.5; 
  
  // We want particles coming from the left (negative x) to pile up
  // and squeeze around the logo. 
  
  // Calculate if the particle is approaching the left face of the logo
  // It is directly in the path if its y is close to 0, and x is negative but close to origin.
  float inPath = smoothstep(radius*1.5, 0.0, abs(pos.y)); 
  float approaching = smoothstep(-radius - 8.0, -radius, pos.x) * (1.0 - step(0.0, pos.x));

  // Slow down the X movement heavily as they approach the center to simulate "pooling" up
  float obstructionSlowdown = inPath * approaching * smoothstep(0.0, radius + 2.0, distToCenter);
  // Just use a fixed spatial offset based on the slowdown, NO uTime!
  // This pushes them back slightly creating density without growing infinitely
  pos.x -= obstructionSlowdown * 3.0; 

  // Deflect particles heavily up or down to go around the logo
  if (distToCenter < radius) {
     float push = smoothstep(0.0, radius, radius - distToCenter);
     // Push out along the normal vector from the center
     vec2 normal = normalize(pos.xy);
     // Favor pushing up/down (y axis) more than backwards (x axis)
     pos.y += sign(pos.y + 0.001) * push * 3.5; 
     pos.x -= push * 2.0; 
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Perspective size scaling with randomness
  // Make particles slightly larger when they bunch up
  float sizeBoost = 1.0 + (obstructionSlowdown * 1.5);
  // Increased base size from 20.0 to 40.0 so they are more visible
  gl_PointSize = (40.0 / -mvPosition.z) * aRandom * sizeBoost;
  
  gl_Position = projectionMatrix * mvPosition;

  // Fade out smoothly at edges
  vAlpha = smoothstep(40.0, 30.0, abs(pos.x)) * 0.6;
}
`;

function DustParticles() {
    const count = 50000;

    const [positions, randoms] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const rnd = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            // Distribute across entire X width (-40 to 40)
            pos[i * 3] = (Math.random() - 0.5) * 80;     // x

            // Focus particles in tight horizontal bands near y=0
            let yRandom = Math.random() - 0.5;
            pos[i * 3 + 1] = Math.sign(yRandom) * Math.pow(Math.abs(yRandom), 1.5) * 20; // y

            pos[i * 3 + 2] = (Math.random() - 0.5) * 15; // z (depth)

            rnd[i] = Math.random() * 0.5 + 0.5; // Random size multiplier
        }
        return [pos, rnd];
    }, [count]);

    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
                <bufferAttribute
                    attach="attributes-aRandom"
                    args={[randoms, 1]}
                />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                uniforms={{
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color("#e2b97c") } // Sand color
                }}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
            />
        </points>
    );
}

export default function ThreeDScene() {
    return (
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
            {/* Lighting & Environment for the Chrome effect */}
            <color attach="background" args={["#000000"]} />

            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} />

            {/* Environment map is crucial for metallic reflections */}
            <Environment preset="city" background={false} />

            <Logo />
            <DustParticles />
        </Canvas>
    );
}
