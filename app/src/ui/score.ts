import { Observable } from "@babylonjs/core/Misc/observable";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { World } from "../world";

export class Score {
    private _current = 0;
    private _target = 0;
    private _textBlock: TextBlock;

    public constructor(world: World) {
        this._textBlock = new TextBlock("score", this._text);
        this._textBlock.fontSize = 24;
        this._textBlock.color = "white";
        this._textBlock.shadowBlur = 5;
        this._textBlock.resizeToFit = true;
        this._textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._textBlock.top = -72;
        world.uiContainer.addControl(this._textBlock);
    }

    public update(deltaTime: number): void {
        const decayFactor = Math.exp(-deltaTime * 5);
        const before = Math.round(this._current);
        this._current = this._target - (this._target - this._current) * decayFactor;
        const after = Math.round(this._current);
        if (before !== after) {
            this._textBlock.text = this._text;
        }
    }

    public add(value: number): void {
        this._target += value;
        this.onChangedObservable.notifyObservers(this._target);
    }

    public multiply(value: number): void {
        this._target = Math.round(this._target * value);
        this.onChangedObservable.notifyObservers(this._target);
    }

    public readonly onChangedObservable = new Observable<number>();

    private get _text(): string {
        return `Score: ${Math.round(this._current)}`;
    }
}
