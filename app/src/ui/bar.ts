import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "../world";

export interface BarProperties {
    readonly maxValue: number;
    readonly width: number;
    readonly height: number;
    readonly cornerRadius: number;
    readonly border: number;
    readonly backgroundColor: string;
    readonly barColor: string;
}

export interface BarButtonProperties extends BarProperties {
    readonly pressColor: string;
    readonly hoverColor: string;
    readonly keyCode: string;
    readonly keyText: string;
}

class BarBase<T extends Rectangle> {
    protected readonly _root: T;
    protected readonly _bar: Rectangle;
    protected readonly _text: TextBlock;
    private readonly _setBarWidth: (value: number) => void;
    private _value = 0;

    protected constructor(root: T, parent: Container, properties: BarProperties) {
        this._root = root;
        this._root.widthInPixels = properties.width;
        this._root.heightInPixels = properties.height;
        this._root.cornerRadius = properties.cornerRadius;
        this._root.thickness = 0;
        this._root.background = properties.backgroundColor;
        parent.addControl(this._root);

        this._bar = new Rectangle("bar");
        this._bar.widthInPixels = 0;
        this._bar.heightInPixels = properties.height - 2 * properties.border;
        this._bar.cornerRadius = properties.cornerRadius - properties.border;
        this._bar.thickness = 0;
        this._bar.background = properties.barColor;
        this._root.addControl(this._bar);

        this._text = new TextBlock("text");
        this._text.fontSizeInPixels = (properties.height - properties.border) * 0.7;
        this._text.color = "white";
        this._text.shadowBlur = 5;
        this._root.addControl(this._text);

        this._setBarWidth = (value) => {
            const barWidth = properties.width - 2 * properties.border;
            const width = barWidth * value / properties.maxValue;
            this._bar.left = (width - barWidth) * 0.5;
            this._bar.widthInPixels = width;
        };

        this.maxValue = properties.maxValue;
    }

    public get top() { return this._root.top; }
    public set top(value) { this._root.top = value; }

    public get left() { return this._root.left; }
    public set left(value) { this._root.left = value; }

    public get verticalAlignment() { return this._root.verticalAlignment; }
    public set verticalAlignment(value) { this._root.verticalAlignment = value; }

    public get horizontalAlignment() { return this._root.horizontalAlignment; }
    public set horizontalAlignment(value) { this._root.horizontalAlignment = value; }

    public readonly maxValue: number;

    public get value(): number {
        return this._value;
    }

    public set value(value: number) {
        if (this._value === value) {
            return;
        }

        this._value = Scalar.Clamp(value, 0, this.maxValue);
        this._setBarWidth(this._value);
    }

    public get text(): string {
        return this._text.text;
    }

    public set text(value: string) {
        this._text.text = value;
    }
}

export class Bar extends BarBase<Rectangle> {
    public constructor(name: string, parent: Container, properties: BarProperties) {
        super(new Rectangle(name), parent, properties);
    }
}

export class BarButton extends BarBase<Button> {
    public constructor(name: string, parent: Container, properties: BarButtonProperties, world: World) {
        super(new Button(name), parent, properties);

        this._root.onPointerClickObservable.add(() => {
            this.onPressObservable.notifyObservers(this);
        });

        this._root.pointerEnterAnimation = () => this._root.background = properties.hoverColor;
        this._root.pointerOutAnimation = () => this._root.background = properties.backgroundColor;
        this._root.pointerDownAnimation = () => this._root.background = properties.pressColor;
        this._root.pointerUpAnimation = () => this._root.background = properties.backgroundColor;

        // HACK: bug in button code
        parent.onDirtyObservable.add(() => {
            if (!parent.isEnabled) {
                this._root.pointerOutAnimation();
            }
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

        world.scene.onKeyboardObservable.add((data) => {
            if ((data.event as any).repeat || world.paused) {
                return;
            }

            if (data.event.code === properties.keyCode && parent.isEnabled) {
                if (data.type === KeyboardEventTypes.KEYDOWN) {
                    this._root.pointerDownAnimation();
                } else {
                    this._root.pointerUpAnimation();
                    this.onPressObservable.notifyObservers(this);
                }
            }
        });
    }

    public readonly onPressObservable = new Observable<BarButton>();
}
