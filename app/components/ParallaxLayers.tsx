'use client';

import { useEffect, useState } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

import { SPHERE_RADIUS, TEXTURE_FG_SRC, TEXTURE_MG_SRC } from '@/lib/pano';

function prepLayer(tex: THREE.Texture, gl: THREE.WebGLRenderer) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.offset.x = 1;
  tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
}

/**
 * Transparent FG/MG equirect plates on slightly nearer spheres —
 * subtle parallax as the camera looks around (krpano multi-layer feel).
 */
export default function ParallaxLayers({ enabled = true }: { enabled?: boolean }) {
  const { gl } = useThree();
  const [ready, setReady] = useState(false);
  const mg = useTexture(TEXTURE_MG_SRC);
  const fg = useTexture(TEXTURE_FG_SRC);

  useEffect(() => {
    prepLayer(mg, gl);
    prepLayer(fg, gl);
    setReady(true);
  }, [mg, fg, gl]);

  if (!enabled || !ready) return null;

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 1.8, 64, 48]} />
        <meshBasicMaterial
          map={mg}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 4.2, 64, 48]} />
        <meshBasicMaterial
          map={fg}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}
