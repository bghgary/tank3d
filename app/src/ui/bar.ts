import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Observable } from "@babylonjs/core/Misc/observable";
import { DeepImmutable } from "@babylonjs/core/types";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "../worlds/world";
import { isHierarchyEnabled, KeyInfo, registerKeyboard } from "./common";

const CORNER_RADIUS = 15;
const BORDER = 3;

export interface BarProperties {
    maxValue: number;
    width: number;
    height: number;
    backgroundColor: string;
    barColor: string;
}

export interface BarButtonProperties extends BarProperties {
    pressColor: string;
    hoverColor: string;
    keyInfo: KeyInfo;
    keyText: string;
}

class BarBase<T extends Rectangle> {
    protected readonly _root: T;
    protected readonly _bar: Rectangle;
    protected readonly _text: TextBlock;
    private _value = 0;

    protected constructor(root: T, parent: Container, properties: DeepImmutable<BarProperties>) {
        this._root = root;
        this._root.widthInPixels = properties.width;
        this._root.heightInPixels = properties.height;
        this._root.cornerRadius = CORNER_RADIUS;
        this._root.thickness = 0;
        this._root.background = properties.backgroundColor;
        parent.addControl(this._root);

        this._bar = new Rectangle("bar");
        this._bar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._bar.widthInPixels = 0;
        this._bar.cornerRadius = CORNER_RADIUS;
        this._bar.thickness = BORDER * 2;
        this._bar.color = "#00000000";
        this._bar.background = properties.barColor;
        this._root.addControl(this._bar);

        this._text = new TextBlock("text");
        this._text.fontSizeInPixels = (properties.height - BORDER) * 0.7;
        this._text.color = "white";
        this._text.shadowBlur = 5;
        this._root.addControl(this._text);

        this.maxValue = properties.maxValue;
    }

    public readonly maxValue: number;

    public get value(): number {
        return this._value;
    }

    public set value(value: number) {
        if (this._value === value) {
            return;
        }

        this._value = Scalar.Clamp(value, 0, this.maxValue);
        this._bar.widthInPixels = this._root.widthInPixels * this._value / this.maxValue;
    }

    public get text(): string {
        return this._text.text;
    }

    public set text(value: string) {
        this._text.text = value;
    }
}

export class Bar extends BarBase<Rectangle> {
    public constructor(name: string, parent: Container, properties: DeepImmutable<BarProperties>) {
        super(new Rectangle(name), parent, properties);
    }
}

export class BarButton extends BarBase<Button> {
    public constructor(name: string, parent: Container, properties: DeepImmutable<BarButtonProperties>, world: World) {
        super(new Button(name), parent, properties);

        this._root.pointerEnterAnimation = () => this._root.background = properties.hoverColor;
        this._root.pointerOutAnimation = () => this._root.background = properties.backgroundColor;
        this._root.pointerDownAnimation = () => this._root.background = properties.pressColor;
        this._root.pointerUpAnimation = () => this._root.background = properties.backgroundColor;
        this._root.onPointerClickObservable.add(() => {
            this.onClickObservable.notifyObservers(this);
        });

        const key = new TextBlock("key", `[${properties.keyText}]`);
        key.resizeToFit = true;
        key.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        key.paddingRightInPixels = 5;
        key.fontSizeInPixels = this._text.fontSizeInPixels * 0.8;
        key.fontFamily = "monospace";
        key.color = "lightgray";
        key.shadowBlur = 4;
        this._root.addControl(key);

        registerKeyboard(world, properties.keyInfo, () => {
            if (isHierarchyEnabled(this._root)) {
                this.onClickObservable.notifyObservers(this);
            }
        });
    }

    public readonly onClickObservable = new Observable<BarButton>();
}
