"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type OrbitNode = {
  label: string;
  radius: number;
  speed: number;
  phase: number;
  height: number;
  mesh: THREE.Mesh;
  line: THREE.Line;
  sprite: THREE.Sprite;
};

const platformNodes = [
  { label: "Instagram", radius: 2.1, speed: 0.62, phase: 0, height: 0.15 },
  { label: "LinkedIn", radius: 2.7, speed: 0.44, phase: 1.2, height: -0.2 },
  { label: "TikTok", radius: 3.2, speed: 0.5, phase: 2.2, height: 0.25 },
  { label: "YouTube", radius: 3.7, speed: 0.34, phase: 3.3, height: -0.1 },
  { label: "X", radius: 2.45, speed: 0.7, phase: 4.4, height: 0.38 },
  { label: "Calendar", radius: 3.45, speed: 0.38, phase: 5.1, height: -0.34 }
];

function createLabelSprite(label: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(0, 0, 0, 0.58)";
    context.strokeStyle = "rgba(255, 255, 255, 0.18)";
    context.lineWidth = 2;
    context.roundRect(8, 12, 240, 44, 10);
    context.fill();
    context.stroke();
    context.fillStyle = "#ffffff";
    context.font = "600 24px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 128, 34, 208);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.34, 1);
  return sprite;
}

function createOrbitRing(radius: number, opacity: number): THREE.LineLoop {
  const points: THREE.Vector3[] = [];

  for (let index = 0; index < 128; index++) {
    const angle = (index / 128) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius * 0.56
      )
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xec002f,
    transparent: true,
    opacity
  });

  const ring = new THREE.LineLoop(geometry, material);
  ring.rotation.x = -0.22;
  return ring;
}

function createConnectionLine(): THREE.Line {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(6), 3)
  );

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22
  });

  return new THREE.Line(geometry, material);
}

function updateConnection(line: THREE.Line, position: THREE.Vector3): void {
  const attribute = line.geometry.getAttribute(
    "position"
  ) as THREE.BufferAttribute;

  attribute.setXYZ(0, 0, 0, 0);
  attribute.setXYZ(1, position.x, position.y, position.z);
  attribute.needsUpdate = true;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }

  if ("map" in material && material.map instanceof THREE.Texture) {
    material.map.dispose();
  }

  material.dispose();
}

export function AiSocialOrbit() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const container = mount;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.18, 7.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "ai-orbit-canvas";
    renderer.domElement.setAttribute(
      "aria-label",
      "Animated 3D network of brand memory, social channels, content generation, scheduling, and analytics"
    );
    renderer.domElement.setAttribute("role", "img");
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight = new THREE.PointLight(0xec002f, 5.5, 10);
    keyLight.position.set(-2.5, 2.4, 4.2);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x2563eb, 3.2, 11);
    rimLight.position.set(3.2, -1.8, 3.6);
    scene.add(rimLight);

    const coreGeometry = new THREE.IcosahedronGeometry(0.84, 4);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xec002f,
      emissive: 0x7a0018,
      roughness: 0.28,
      metalness: 0.42
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 2),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        wireframe: true
      })
    );
    group.add(wire);

    [2.1, 2.7, 3.25, 3.75].forEach((radius, index) => {
      group.add(createOrbitRing(radius, 0.16 - index * 0.022));
    });

    const particlePositions = new Float32Array(210 * 3);
    for (let index = 0; index < particlePositions.length; index += 3) {
      const radius = 2.4 + Math.random() * 2.6;
      const angle = Math.random() * Math.PI * 2;
      particlePositions[index] = Math.cos(angle) * radius;
      particlePositions[index + 1] = (Math.random() - 0.5) * 2.8;
      particlePositions[index + 2] = Math.sin(angle) * radius;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.018,
        transparent: true,
        opacity: 0.5
      })
    );
    group.add(particles);

    const nodes: OrbitNode[] = platformNodes.map((node, index) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + (index % 2) * 0.03, 24, 24),
        new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? 0xffffff : 0x2563eb,
          emissive: index % 2 === 0 ? 0x3a3a3a : 0x061b65,
          roughness: 0.36,
          metalness: 0.2
        })
      );
      const line = createConnectionLine();
      const sprite = createLabelSprite(node.label);

      group.add(line);
      group.add(mesh);
      group.add(sprite);

      return {
        ...node,
        mesh,
        line,
        sprite
      };
    });

    function setNodePositions(elapsed: number): void {
      nodes.forEach((node) => {
        const angle = node.phase + elapsed * node.speed;
        const position = new THREE.Vector3(
          Math.cos(angle) * node.radius,
          Math.sin(angle * 1.65) * 0.28 + node.height,
          Math.sin(angle) * node.radius * 0.56
        );

        node.mesh.position.copy(position);
        node.sprite.position.set(position.x, position.y + 0.36, position.z);
        updateConnection(node.line, position);
      });
    }

    function resize(): void {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    }

    let animationFrame = 0;
    const clock = new THREE.Clock();

    function animate(): void {
      const elapsed = clock.getElapsedTime();
      setNodePositions(reduceMotion ? 0.8 : elapsed);

      if (!reduceMotion) {
        group.rotation.y = Math.sin(elapsed * 0.2) * 0.18;
        core.rotation.y = elapsed * 0.32;
        core.rotation.x = elapsed * 0.18;
        wire.rotation.y = -elapsed * 0.18;
        particles.rotation.y = elapsed * 0.05;
      }

      renderer.render(scene, camera);

      if (!reduceMotion) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    }

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);

      scene.traverse((object) => {
        const candidate = object as THREE.Object3D & {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
        };

        candidate.geometry?.dispose();
        if (candidate.material) {
          disposeMaterial(candidate.material);
        }
      });

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="ai-orbit-scene" ref={mountRef} aria-hidden="false">
      <div className="ai-orbit-readout" aria-hidden="true">
        <span>Brand Memory Core</span>
        <span>Trend Signals</span>
        <span>Publishing Loop</span>
      </div>
    </div>
  );
}
