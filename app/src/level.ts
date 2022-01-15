import { Control } from "@babylonjs/gui/2D/controls/control";
import { Rectangle } from "@babylonjs/gui/2D/controls/rectangle";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";
import { Score } from "./score";
import { World } from "./world";

const BORDER = 3;
const WIDTH = 400;
const HEIGHT = 28;
const CORNER_RADIUS = 15;
const INNER_WIDTH = WIDTH - 2 * BORDER;
const INNER_HEIGHT = HEIGHT - 2 * BORDER;
const INNER_CORNER_RADIUS = 15 - BORDER;

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

export class Level {
    private _currentBar = 0;
    private _targetBar = 0;
    private _currentLevel = 1;
    private _targetLevel = 1;
    private _bar: Rectangle;
    private _level: TextBlock;

    public constructor(world: World, score: Score) {
        const level = new Rectangle("level");
        level.width = `${WIDTH}px`;
        level.height = `${HEIGHT}px`;
        level.cornerRadius = CORNER_RADIUS;
        level.thickness = 0;
        level.background = "#22222288";
        level.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        level.top = -36;
        world.uiTexture.addControl(level);

        this._bar = new Rectangle("bar");
        this._bar.height = `${INNER_HEIGHT}px`;
        this._bar.cornerRadius = INNER_CORNER_RADIUS;
        this._bar.thickness = 0;
        this._bar.background = "#888800";
        level.addControl(this._bar);

        this._level = new TextBlock("text");
        this._level.fontSize = `${INNER_HEIGHT - 2}px`;
        this._level.color = "white";
        this._level.outlineWidth = 3;
        this._level.outlineColor = "black";
        this._level.resizeToFit = true;
        level.addControl(this._level);

        this._updateBar();
        this._updateLevel();

        score.onChangedObservable.add((score) => {
            for (this._targetLevel = 1; this._targetLevel < LevelScore.length; ++this._targetLevel) {
                if (score <= LevelScore[this._targetLevel]) {
                    break;
                }
            }

            if (this._targetLevel === LevelScore.length) {
                this._targetBar = 1;
                this._targetLevel = LevelScore.length - 1;
            } else if (this._targetLevel < this._currentLevel) {
                this._currentBar = 0;
                this._currentLevel = this._targetLevel;
                this._updateLevel();
            } else {
                const min = LevelScore[this._targetLevel - 1];
                const max = LevelScore[this._targetLevel];
                this._targetBar = (score - min) / (max - min);
            }
        });
    }

    public update(deltaTime: number): void {
        const decayFactor = Math.exp(-deltaTime * 5);
        if (this._currentLevel < this._targetLevel) {
            this._currentBar = Math.min(this._currentBar + (1 - decayFactor), 1);
            this._updateBar();
            if (this._currentBar === 1) {
                this._currentBar = 0;
                this._currentLevel = this._targetLevel;
                this._updateLevel();
            }
        } else {
            this._currentBar = this._targetBar - (this._targetBar - this._currentBar) * decayFactor;
            if (this._targetBar - this._currentBar < 0.001) {
                this._currentBar = this._targetBar;
            }
            this._updateBar();
        }
    }

    private _updateBar(): void {
        const width = INNER_WIDTH * this._currentBar;
        this._bar.left = `-${(INNER_WIDTH - width) * 0.5}`;
        this._bar.width = `${width}px`;
    }

    private _updateLevel(): void {
        this._level.text = `Level ${this._currentLevel}`;
    }
}
