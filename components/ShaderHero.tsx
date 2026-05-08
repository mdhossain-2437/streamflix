"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

// Awwwards-grade animated gradient + noise distortion shader.
// Renders a full-screen plane with a fragment shader that mixes warm/cool
// brand colors, a film-grain noise term, and slow time-based displacement.
const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uIntensity;
  varying vec2 vUv;

  // Simplex-style hash noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.05;
    vec2 q = vec2(fbm(p + t), fbm(p - t));
    vec2 r = vec2(fbm(p + 1.5 * q + vec2(1.7, 9.2) + 0.15 * uTime),
                  fbm(p + 1.5 * q + vec2(8.3, 2.8) + 0.13 * uTime));
    float f = fbm(p + r);

    // Punchier mix — start with deep red, lift to bright red where flow is strong.
    vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.6, f));
    col = mix(col, uColorC, smoothstep(0.35, 0.95, length(r) * 0.85));

    // soft radial light pool from top-right
    vec2 lc = vec2(0.8, 0.7);
    float light = smoothstep(1.3, 0.0, length(p - lc));
    col += light * vec3(0.18, 0.05, 0.06);

    // vignette
    float vig = smoothstep(1.6, 0.3, length(p));
    col *= mix(0.5, 1.0, vig);

    // film grain
    float grain = (hash(uv * uResolution + uTime) - 0.5) * 0.06;
    col += grain;

    col *= uIntensity;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface ShaderPlaneProps {
  intensity?: number;
}

function ShaderPlane({ intensity = 1.0 }: ShaderPlaneProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: new THREE.Color("#0b0c10") },
      uColorB: { value: new THREE.Color("#7c0a14") },
      uColorC: { value: new THREE.Color("#ff3344") },
      uIntensity: { value: intensity },
    }),
    [intensity],
  );

  useFrame(({ clock, size, viewport }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.elapsedTime;
    matRef.current.uniforms.uResolution.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
    );
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function ShaderHero({
  intensity = 1.0,
  className = "",
}: {
  intensity?: number;
  className?: string;
}) {
  // Detect WebGL synchronously so we don't render a transparent canvas first.
  const [supportsWebGL] = useState(detectWebGL);

  return (
    <div
      className={`absolute inset-0 ${className}`}
      aria-hidden="true"
    >
      {/* Always render a gradient backdrop — the shader sits on top when supported. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_30%,#ff3344_0%,#7c0a14_35%,#0b0c10_75%)]" />
      {supportsWebGL && (
        <div className="absolute inset-0">
          <Canvas
            orthographic
            camera={{ zoom: 1, position: [0, 0, 1] }}
            dpr={[1, 1.5]}
            gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
          >
            <ShaderPlane intensity={intensity} />
          </Canvas>
        </div>
      )}
    </div>
  );
}
