import { ArcRotateCamera, KeyboardEventTypes, Scene } from "@babylonjs/core";
import { Tank } from "./tank";

const UP = 0;
const DOWN = 1;
const LEFT = 2;
const RIGHT = 3;

const keyMapping: { [code: string]: number } = {
    "ArrowUp": UP,
    "ArrowDown": DOWN,
    "ArrowLeft": LEFT,
    "ArrowRight": RIGHT,
    "KeyW": UP,
    "KeyS": DOWN,
    "KeyA": LEFT,
    "KeyD": RIGHT,
};

const speed = 0.1;

export class Player {
    private readonly _tank: Tank;

    private readonly _commandState: { [command: number]: boolean } = {
        [UP]: false,
        [DOWN]: false,
        [LEFT]: false,
        [RIGHT]: false,
    };

    public constructor(scene: Scene) {
        this._tank = new Tank("player", { barrelDiameter: 0.45, barrelLength: 0.75 }, scene);
        this._tank.position.y = 0.6;

        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.5, 10, this._tank.position, scene);

        scene.onKeyboardObservable.add((data) => {
            // ignore repeats
            if ((data.event as any).repeat) {
                return;
            }

            const command = keyMapping[data.event.code];
            if (command !== undefined) {
                this._commandState[command] = (data.type === KeyboardEventTypes.KEYDOWN);
                console.log(`${command} ${this._commandState[command]}`);
            }
        });

        scene.onPointerObservable.add((data) => {
            const pickedPoint = data.pickInfo?.pickedPoint || scene.pick(data.event.offsetX, data.event.offsetY)?.pickedPoint;
            if (pickedPoint) {
                pickedPoint.y = this._tank.position.y;
                this._tank.lookAt(pickedPoint);
            }
        });

        scene.onBeforeRenderObservable.add(() => {
            if (this._commandState[UP]) {
                this._tank.position.z += speed * scene.getAnimationRatio();
            }

            if (this._commandState[DOWN]) {
                this._tank.position.z -= speed * scene.getAnimationRatio();
            }

            if (this._commandState[LEFT]) {
                this._tank.position.x -= speed * scene.getAnimationRatio();
            }

            if (this._commandState[RIGHT]) {
                this._tank.position.x += speed * scene.getAnimationRatio();
            }
        });
    }
}