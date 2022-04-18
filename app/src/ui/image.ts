import { Observable } from "@babylonjs/core/Misc/observable";
import { DeepImmutable } from "@babylonjs/core/types";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "../worlds/world";
import { isHierarchyEnabled, KeyInfo, registerKeyboard, unregisterKeyboard } from "./common";

const CORNER_RADIUS = 15;

export interface ImageButtonProperties {
    width: number;
    height: number;
    backgroundColor: string;
    pressColor: string;
    hoverColor: string;
    keyInfo: KeyInfo;
    keyText: string;
}

export class ImageButton {
    private readonly _root: Button;

    public constructor(name: string, parent: Container, url: string, properties: DeepImmutable<ImageButtonProperties>, world: World) {
        this._root = Button.CreateImageOnlyButton(name, url);
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
            this.onClickObservable.notifyObservers(this);
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

        const observer = registerKeyboard(world, properties.keyInfo, undefined, () => {
            if (isHierarchyEnabled(this._root)) {
                this.onClickObservable.notifyObservers(this);
            }
        });

        this._root.onDisposeObservable.add(() => {
            unregisterKeyboard(world, observer);
        });
    }

    public readonly onClickObservable = new Observable<ImageButton>();
}
