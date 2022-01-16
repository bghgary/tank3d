import { Control } from "@babylonjs/gui/2D/controls/control";
import { Score } from "./score";
import { World } from "../world";
import { Bar } from "./bar";
import { Observable } from "@babylonjs/core/Misc/observable";

const LevelScore = [
    0,
    3,
    6,
    10,
    20,
    30,
    45,
    60,
    75,
    95,
    115,
    135,
    160,
    200,
    245,
    295,
    355,
    415,
    480,
    560,
    680
];

function computeLevel(score: number): number {
    for (let level = 1; level < LevelScore.length; ++level) {
        if (score <= LevelScore[level]) {
            return level;
        }
    }

    return LevelScore.length - 1;
}

export class Level {
    private readonly _bar: Bar;
    private _currentValue = 0;
    private _targetValue = 0;
    private _currentLevel = 1;
    private _targetLevel = 1;

    public constructor(world: World, score: Score) {
        this._bar = new Bar("level", world.uiContainer, {
            width: 400,
            height: 28,
            cornerRadius: 15,
            border: 3,
            backgroundColor: "#1111117F",
            barColor: "#FFFF007F",
        });

        this._bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._bar.top = -36;

        this._updateValue();
        this._updateText();

        score.onChangedObservable.add((score) => {
            const level = computeLevel(score);
            if (this._targetLevel !== level) {
                this._targetLevel = level;
                this.onChangedObservable.notifyObservers(this._targetLevel);
            }

            if (this._targetLevel < this._currentLevel) {
                this._currentValue = 0;
                this._currentLevel = this._targetLevel;
                this._updateText();
            }

            const min = LevelScore[this._targetLevel - 1];
            const max = LevelScore[this._targetLevel];
            this._targetValue = Math.min((score - min) / (max - min), 1);
        });
    }

    public update(deltaTime: number): void {
        const decayFactor = Math.exp(-deltaTime * 5);
        const previousBar = this._currentValue;
        const targetBar = (this._currentLevel < this._targetLevel ? 1 : this._targetValue);
        this._currentValue = targetBar - (targetBar - this._currentValue) * decayFactor;
        if (targetBar - this._currentValue < 0.001) {
            this._currentValue = targetBar;
            if (this._currentValue === 1 && this._currentLevel < this._targetLevel) {
                this._currentValue = 0;
                this._currentLevel = this._targetLevel;
                this._updateText();
            }
        }
        if (this._currentValue !== previousBar) {
            this._updateValue();
        }
    }

    public onChangedObservable = new Observable<number>();

    private _updateValue(): void {
        this._bar.value = this._currentValue;
    }

    private _updateText(): void {
        this._bar.text = `Level ${this._currentLevel}`;
    }
}
