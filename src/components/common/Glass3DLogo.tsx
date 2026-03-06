import React from 'react';
import { View } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { Colors } from '../../constants/theme';

interface Glass3DLogoProps {
  type: 'seo' | 'ads' | 'ai' | 'social';
  size?: number;
}

/**
 * High-Performance 3D Glass Logo Renderer
 * Uses native THREE.js with expo-gl directly to avoid expo-three bundling issues.
 */
export const Glass3DLogo = ({ type, size = 60 }: Glass3DLogoProps) => {
  const onContextCreate = async (gl: any) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    
    // 1. Create Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientWidth: width,
        clientHeight: height,
      } as any,
      context: gl,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);

    // 2. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3;

    // 3. Geometry based on type
    let geometry;
    if (type === 'ai') {
      geometry = new THREE.IcosahedronGeometry(1, 1);
    } else if (type === 'ads') {
      geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16);
    } else {
      geometry = new THREE.OctahedronGeometry(1, 0);
    }

    // 4. Material (Glass effect)
    const color = type === 'seo' ? Colors.success : 
                 type === 'ads' ? Colors.accent : 
                 type === 'ai' ? Colors.secondary : Colors.info;

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // 6. Animation Loop
    const render = () => {
      requestAnimationFrame(render);
      mesh.rotation.y += 0.01;
      mesh.rotation.x += 0.005;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={{ width: size, height: size }}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
};

export default Glass3DLogo;

export default Glass3DLogo;
