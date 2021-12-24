import { ArcRotateCamera, KeyboardEventTypes, PointerEventTypes, Scene } from "@babylonjs/core";
import { Bullets } from "./bullets";
import { Tank } from "./tank";

const UP = 0;
const DOWN = 1;
const LEFT = 2;
const RIGHT = 3;
const SHOOT = 4;

const STATE_KEYBOARD = 0x1;
const STATE_POINTER = 0x2;

const keyMapping: { [code: string]: number } = {
    "ArrowUp": UP,
    "ArrowDown": DOWN,
    "ArrowLeft": LEFT,
    "ArrowRight": RIGHT,
    "KeyW": UP,
    "KeyS": DOWN,
    "KeyA": LEFT,
    "KeyD": RIGHT,
    "Space": SHOOT,
};

export class Player {
    private readonly _tank: Tank;

    private readonly _commandState: { [command: number]: number } = {
        [UP]: 0,
        [DOWN]: 0,
        [LEFT]: 0,
        [RIGHT]: 0,
        [SHOOT]: 0,
    };

    public constructor(scene: Scene, bullets: Bullets) {
        this._tank = new Tank("player", { moveSpeed: 0.02, barrelDiameter: 0.45, barrelLength: 0.75, bulletRepeatRate: 500, bulletSpeed: 0.05 }, bullets, scene);
        this._tank.position.y = 0.6;

        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.5, 10, this._tank.position, scene);

        scene.onKeyboardObservable.add((data) => {
            if ((data.event as any).repeat) {
                return;
            }

            const command = keyMapping[data.event.code];
            if (command !== undefined) {
                if (data.type === KeyboardEventTypes.KEYDOWN) {
                    this._commandState[command] |= STATE_KEYBOARD;
                } else {
                    this._commandState[command] &= ~STATE_KEYBOARD;
                }
                // console.log(`${command} ${this._commandState[command]}`);
            }
        });

        scene.onPointerObservable.add((data) => {
            const pickedPoint = data.pickInfo?.pickedPoint || scene.pick(data.event.offsetX, data.event.offsetY)?.pickedPoint;
            if (pickedPoint) {
                pickedPoint.y = this._tank.position.y;
                this._tank.lookAt(pickedPoint);
            }

            if (data.type === PointerEventTypes.POINTERDOWN) {
                this._commandState[SHOOT] |= STATE_POINTER;
            } else if (data.type === PointerEventTypes.POINTERUP) {
                this._commandState[SHOOT] &= ~STATE_POINTER;
            }

            //console.log(`pointer: ${data.type} ${this._commandState[SHOOT]}`);
        });

        scene.onBeforeRenderObservable.add(() => {
            if (this._commandState[UP]) {
                this._tank.moveUp();
            }

            if (this._commandState[DOWN]) {
                this._tank.moveDown();
            }

            if (this._commandState[LEFT]) {
                this._tank.moveLeft();
            }

            if (this._commandState[RIGHT]) {
                this._tank.moveRight();
            }

            if (this._commandState[SHOOT]) {
                this._tank.shoot();
            }
        });
    }
}