import { ArcRotateCamera, KeyboardEventTypes, PointerEventTypes, Scene, Vector3 } from "@babylonjs/core";
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
        this._tank = new Tank("player", { moveSpeed: 0.08, barrelDiameter: 0.45, barrelLength: 0.75, bulletRepeatRate: 500, bulletSpeed: 0.1 }, bullets, scene);

        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.5, 10, Vector3.Zero(), scene);

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
            const x = (this._commandState[LEFT] ? -1 : 0) + (this._commandState[RIGHT] ? 1 : 0);
            const z = (this._commandState[UP] ? 1 : 0) + (this._commandState[DOWN] ? -1 : 0);
            const lengthSquared = x * x + z * z;
            if (lengthSquared > 0) {
                const oneOverLength = 1 / Math.sqrt(lengthSquared);
                this._tank.move(x * oneOverLength, 0, z * oneOverLength); 
            }

            if (this._commandState[SHOOT]) {
                this._tank.shoot();
            }

            camera.target.copyFrom(this._tank.position);
        });
    }
}