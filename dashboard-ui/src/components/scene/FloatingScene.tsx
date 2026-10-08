import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useDashboardStore } from '@/store/dashboardStore';

function FloatingOrb() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 0.15;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.2) * 0.1;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref} position={[2.5, 0.5, -3]}>
        <icosahedronGeometry args={[1.1, 2]} />
        <MeshDistortMaterial
          color="#6366f1"
          emissive="#312e81"
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.85}
          distort={0.22}
          speed={1.5}
          transparent
          opacity={0.55}
        />
      </mesh>
    </Float>
  );
}

function ParticleField({ count = 400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12 - 4;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#a5b4fc" transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

function NeuralNetwork() {
  const group = useRef<THREE.Group>(null!);
  const nodes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        pos: [
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 5,
          -6 - Math.random() * 4,
        ] as [number, number, number],
        phase: Math.random() * Math.PI * 2,
      })),
    []
  );

  useFrame(({ clock }) => {
    group.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.05;
  });

  return (
    <group ref={group}>
      {nodes.map((n, i) =>
        nodes.slice(i + 1, i + 4).map((target, j) => {
          const start = new THREE.Vector3(...n.pos);
          const end = new THREE.Vector3(...target.pos);
          const mid = start.clone().lerp(end, 0.5);
          mid.z -= 0.3;
          const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
          const points = curve.getPoints(12);
          return (
            <line key={`${i}-${j}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#6366f1" transparent opacity={0.12} />
            </line>
          );
        })
      )}
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#4338ca"
            emissiveIntensity={0.6}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent() {
  const particles = useDashboardStore((s) => s.particles);
  const neuralNet = useDashboardStore((s) => s.neuralNet);
  const reduced = useDashboardStore((s) => s.reducedMotion);

  return (
    <>
      <color attach="background" args={['#070708']} />
      <fog attach="fog" args={['#070708', 8, 22]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 2]} intensity={0.5} color="#e0e7ff" />
      <pointLight position={[-3, 2, 1]} intensity={0.4} color="#6366f1" />
      {!reduced && <FloatingOrb />}
      {!reduced && particles && <ParticleField count={350} />}
      {!reduced && neuralNet && <NeuralNetwork />}
      <Stars radius={40} depth={30} count={800} factor={2} saturation={0} fade speed={0.4} />
    </>
  );
}

export function FloatingScene() {
  const reduced = useDashboardStore((s) => s.reducedMotion);

  if (reduced) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, var(--accent-soft), transparent 70%), var(--bg)',
        }}
      />
    );
  }

  return (
    <div aria-hidden className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'var(--bg)' }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
