import { Observable } from "@babylonjs/core/Misc/observable";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { decayScalar } from "../math";

export class Score {
    private _current = 0;
    private _target = 0;
    private _textBlock: TextBlock;

    public constructor(parent: Container) {
        this._textBlock = new TextBlock("score", this._getText());
        this._textBlock.fontSizeInPixels = 24;
        this._textBlock.color = "white";
        this._textBlock.shadowBlur = 5;
        this._textBlock.resizeToFit = true;
        parent.addControl(this._textBlock);
    }

    public get value(): number {
        return this._target;
    }

    public update(deltaTime: number): void {
        const before = Math.round(this._current);
        this._current = decayScalar(this._current, this._target, deltaTime, 5);
        const after = Math.round(this._current);
        if (before !== after) {
            this._textBlock.text = this._getText();
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

    private _getText(): string {
        return `Score: ${Math.round(this._current)}`;
    }
}
