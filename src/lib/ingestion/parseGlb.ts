import type { Point } from "@/lib/validator";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { pointCap } from "@/lib/perf";

/** Parse a GLB / GLTF and sample mesh vertex positions into a point cloud. */
export async function parseGlbFile(file: File, cap = pointCap(6000)): Promise<Point[]> {
  const buf = await file.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(buf, "");
  const collected: Point[] = [];

  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const geom = mesh.geometry as THREE.BufferGeometry;
      const pos = geom.getAttribute("position") as THREE.BufferAttribute | undefined;
      if (!pos) return;
      const v = new THREE.Vector3();
      const step = Math.max(1, Math.floor(pos.count / Math.max(1, cap - collected.length)));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i);
        v.applyMatrix4(mesh.matrixWorld);
        collected.push({ x: v.x, y: v.y, z: v.z });
        if (collected.length >= cap) return;
      }
    }
  });

  if (collected.length < 8) throw new Error("GLB contained no readable vertex positions");

  // Recenter on origin (x,z) and drop to y=0
  let cx = 0,
    cz = 0,
    minY = Infinity;
  for (const p of collected) {
    cx += p.x;
    cz += p.z;
    if (p.y < minY) minY = p.y;
  }
  cx /= collected.length;
  cz /= collected.length;
  for (const p of collected) {
    p.x -= cx;
    p.z -= cz;
    p.y -= minY;
  }
  return collected;
}
