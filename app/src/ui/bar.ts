import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";

export interface BarProperties {
    readonly maxValue?: number;
    readonly width: number;
    readonly height: number;
    readonly cornerRadius: number;
    readonly border: number;
    readonly backgroundColor: string;
    readonly barColor: string;
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
        this._text.fontSize = (properties.height - properties.border) * 0.7;
        this._text.color = "white";
        this._text.shadowBlur = 5;
        this._root.addControl(this._text);

        const maxValue = properties.maxValue || 1;

        this._setBarWidth = (value) => {
            const barWidth = properties.width - 2 * properties.border;
            const width = barWidth * value / maxValue;
            this._bar.left = (width - barWidth) * 0.5;
            this._bar.widthInPixels = width;
        };

        this.maxValue = maxValue;
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
    public constructor(name: string, parent: Container, properties: BarProperties) {
        super(new Button(name), parent, properties);
        this._root.pointerEnterAnimation = () => {};
        this._root.pointerOutAnimation = () => {};
    }

    public get onPointerClickObservable() {
        return this._root.onPointerClickObservable;
    }

    public get isEnabled() {
        return this._root.isEnabled;
    }

    public set isEnabled(value) {
        this._root.isEnabled = value;
    }
}
