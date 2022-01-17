import { Observable } from "@babylonjs/core/Misc/observable";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Bar } from "./bar";
import { Score } from "./score";
import { World } from "../world";

// Computed using https://jsfiddle.net/z7e1k38s/6/
const LevelScore = [
    0,
    3,
    8,
    19,
    35,
    55,
    79,
    107,
    140,
    176,
    216,
    259,
    306,
    357,
    410,
    468,
    528,
    592,
    660,
    731,
    805,
    883,
    964,
    1048,
    1136,
    1228,
    1323,
    1423,
    1526,
    1633,
    1744,
    1859,
    1979,
    2103,
    2232,
    2366,
    2506,
    2651,
    2801,
    2958,
    3121,
    3291,
    3469,
    3654,
    3849,
    4052,
    4266,
    4492,
    4731,
    4984,
    5254,
    5543,
    5856,
    6195,
    6569,
    6987,
    7467,
    8039,
    8776,
    10000,
];

function computeLevel(score: number): number {
    for (let level = 1; level < LevelScore.length; ++level) {
        if (score < LevelScore[level]) {
            return level;
        }
    }

    return LevelScore.length;
}

export class Level {
    private readonly _bar: Bar;
    private _currentValue = 0;
    private _targetValue = 0;
    private _currentLevel = 1;
    private _targetLevel = 1;

    public constructor(world: World, score: Score) {
        this._bar = new Bar("level", world.uiContainer, {
            maxValue: 1,
            width: 400,
            height: 28,
            cornerRadius: 15,
            border: 3,
            backgroundColor: "#0F0F0F7F",
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

            if (this._targetLevel < LevelScore.length) {
                const min = LevelScore[this._targetLevel - 1];
                const max = LevelScore[this._targetLevel];
                this._targetValue = Math.min((score - min) / (max - min), 1);
            } else {
                this._targetValue = 1;
            }
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
