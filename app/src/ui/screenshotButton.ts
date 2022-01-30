import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Image } from "@babylonjs/gui/2D/controls/image";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { World } from "../world";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Observable } from "@babylonjs/core/Misc/observable";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { isHierarchyEnabled } from "./common";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";

const CORNER_RADIUS = 15;

export interface ScreenshotButtonProperties {
    readonly width: number;
    readonly height: number;
    readonly backgroundColor: string;
    readonly pressColor: string;
    readonly hoverColor: string;
    readonly keyCode: string;
    readonly keyText: string;
}

export class ScreenshotButton {
    private readonly _root: Button;

    public constructor(name: string, parent: Container, node: TransformNode, properties: ScreenshotButtonProperties, world: World) {
        this._root = new Button(name);
        this._root.widthInPixels = properties.width;
        this._root.heightInPixels = properties.height;
        this._root.cornerRadius = CORNER_RADIUS;
        this._root.thickness = 0;
        this._root.background = properties.backgroundColor;
        this._root.pointerEnterAnimation = () => this._root.background = properties.hoverColor;
        this._root.pointerOutAnimation = () => this._root.background = properties.backgroundColor;
        this._root.pointerDownAnimation = () => this._root.background = properties.pressColor;
        this._root.pointerUpAnimation = () => this._root.background = properties.backgroundColor;
        this._root.onPointerClickObservable.add(() => {
            this.onPressObservable.notifyObservers(this);
        });
        parent.addControl(this._root);

        const key = new TextBlock("key", `[Shift+${properties.keyText}]`);
        key.resizeToFit = true;
        key.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        key.paddingBottomInPixels = 5;
        key.fontSizeInPixels = 12;
        key.fontFamily = "monospace";
        key.color = "lightgray";
        key.shadowBlur = 4;
        this._root.addControl(key);

        this._captureImageAsync(node, properties.width * 2, properties.height * 2).then((data) => {
            const image = new Image("screenshot", data);
            image.stretch = Image.STRETCH_FILL;
            this._root.addControl(image);
        });

        world.scene.onKeyboardObservable.add((data) => {
            if ((data.event as any).repeat || world.paused) {
                return;
            }

            if (!data.event.ctrlKey && data.event.shiftKey && !data.event.altKey && data.event.code === properties.keyCode && isHierarchyEnabled(this._root)) {
                if (data.type === KeyboardEventTypes.KEYDOWN) {
                    this._root.pointerDownAnimation();
                } else {
                    this._root.pointerUpAnimation();
                    this.onPressObservable.notifyObservers(this);
                }
            }
        });
    }

    public readonly onPressObservable = new Observable<ScreenshotButton>();

    private async _captureImageAsync(node: TransformNode, width: number, height: number): Promise<string> {
        Quaternion.RotationYawPitchRollToRef(Math.PI * 0.6, 0, 0, node.rotationQuaternion!);

        const scene = node.getScene();
        await scene.whenReadyAsync();

        const camera = new ArcRotateCamera("screenshot", -Math.PI / 2, Math.PI / 3.5, 3, new Vector3(0, -0.15, 0), scene, false);
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
        node.dispose();

        return result;
    }
}
