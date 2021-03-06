import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Minimap } from "./minimap";

const CAPTURE_POSITION_Y = 1000;

export async function captureScreenshotAsync(node: TransformNode, width: number, height: number): Promise<string> {
    node.position.y += CAPTURE_POSITION_Y;

    const scene = node.getScene();

    const camera = new ArcRotateCamera("screenshot", -Math.PI / 2.5, Math.PI / 3.5, 3.25, new Vector3(0, CAPTURE_POSITION_Y, 0), scene, false);
    scene.activeCameras!.push(camera);
    scene.render();

    const texture = new RenderTargetTexture("screenshot", { width, height }, scene, false, false);
    texture.clearColor = new Color4(0, 0, 0, 0);
    texture.renderList = node.getChildMeshes(false, (mesh) => (mesh as AbstractMesh).layerMask !== Minimap.LayerMask);
    if (node instanceof AbstractMesh) {
        texture.renderList.push(node);
    }

    texture.render(true);

    camera.dispose();

    const pixels = await texture.readPixels()!;

    texture.dispose();

    return await Tools.DumpDataAsync(width, height, pixels, "image/png", undefined, true) as string;
}
