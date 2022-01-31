import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";

const CAPTURE_POSITION_Y = 1000;

export async function captureScreenshotAsync(node: TransformNode, width: number, height: number): Promise<string> {
    node.position.y = CAPTURE_POSITION_Y;
    Quaternion.RotationYawPitchRollToRef(Math.PI * 0.6, 0, 0, node.rotationQuaternion!);

    const scene = node.getScene();
    await scene.whenReadyAsync();

    const camera = new ArcRotateCamera("screenshot", -Math.PI / 2, Math.PI / 3.5, 3, new Vector3(0, CAPTURE_POSITION_Y - 0.15, 0), scene, false);
    scene.activeCamera = camera;
    scene.render();

    const texture = new RenderTargetTexture("screenshot", { width, height }, scene, false, false);
    texture.clearColor = new Color4(0, 0, 0, 0);
    texture.renderList = node.getChildMeshes();
    texture.render(true);

    const pixels = await texture.readPixels()!;
    const result = await Tools.DumpDataAsync(width, height, pixels, "image/png", undefined, true) as string;

    texture.dispose();
    camera.dispose();

    return result;
}
