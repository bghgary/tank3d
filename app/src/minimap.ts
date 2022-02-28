import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { World } from "./worlds/world";

const SIZE = 200;

export class Minimap {
    public static readonly LayerMask = 0x10000000;

    private _camera: Camera;

    public constructor(world: World) {
        const root = new TransformNode("minimap", world.scene);

        const camera = new FreeCamera("camera", new Vector3(0, 100, 0), world.scene);
        camera.rotation.x = Math.PI / 2;
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        camera.orthoBottom = -world.size * 0.5;
        camera.orthoTop = world.size * 0.5;
        camera.orthoLeft = -world.size * 0.5;
        camera.orthoRight = world.size * 0.5;
        camera.layerMask = Minimap.LayerMask;
        camera.parent = root;

        const light = new DirectionalLight("light", new Vector3(0, -1, 0), world.scene);
        light.specular.set(0, 0, 0);
        light.includeOnlyWithLayerMask = Minimap.LayerMask;
        light.parent = root;

        this._camera = camera;
        world.scene.activeCameras!.push(this._camera);
    }

    public update(): void {
        // REVIEW: Is there an event on engine for when size changes?
        const engine = this._camera.getEngine();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const viewport = this._camera.viewport;
        viewport.x = 1 - (SIZE + 10) / width;
        viewport.y = 10 / height;
        viewport.width = SIZE / width;
        viewport.height = SIZE / height;
    }
}
