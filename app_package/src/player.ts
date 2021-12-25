import { ArcRotateCamera, KeyboardEventTypes, PointerEventTypes, Scene, Vector3 } from "@babylonjs/core";
import { Bullets } from "./bullets";
import { Tank } from "./tank";

const enum Command {
    Up,
    Down,
    Left,
    Right,
    Shoot,
    AutoShoot,
    AutoRotate,
}

const enum State {
    Keyboard = 0x1,
    Pointer = 0x2,
}

const KeyMapping: { [code: string]: number } = {
    "ArrowUp": Command.Up,
    "ArrowDown": Command.Down,
    "ArrowLeft": Command.Left,
    "ArrowRight": Command.Right,
    "KeyW": Command.Up,
    "KeyS": Command.Down,
    "KeyA": Command.Left,
    "KeyD": Command.Right,
    "Space": Command.Shoot,
    "KeyE": Command.AutoShoot,
    "KeyC": Command.AutoRotate,
};

export class Player {
    private readonly _tank: Tank;

    private readonly _commandState: { [command: number]: number } = {
        [Command.Up]: 0,
        [Command.Down]: 0,
        [Command.Left]: 0,
        [Command.Right]: 0,
        [Command.Shoot]: 0,
    };

    private _autoShoot = false;
    private _autoRotate = false;

    public constructor(scene: Scene, bullets: Bullets) {
        this._tank = new Tank("player", { barrelDiameter: 0.45, barrelLength: 0.75, reloadSpeed: 0.1, bulletSpeed: 5, movementSpeed: 5 }, bullets, scene);

        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.5, 10, Vector3.Zero(), scene);

        scene.onKeyboardObservable.add((data) => {
            if ((data.event as any).repeat) {
                return;
            }

            const command = KeyMapping[data.event.code];
            if (command !== undefined) {
                switch (command) {
                    case Command.AutoShoot: {
                        if (data.type === KeyboardEventTypes.KEYDOWN) {
                            this._autoShoot = !this._autoShoot;
                        }
                        break;
                    }
                    case Command.AutoRotate: {
                        if (data.type === KeyboardEventTypes.KEYDOWN) {
                            this._autoRotate = !this._autoRotate;
                        }
                        break;
                    }
                    default: {
                        if (data.type === KeyboardEventTypes.KEYDOWN) {
                            this._commandState[command] |= State.Keyboard;
                        } else {
                            this._commandState[command] &= ~State.Keyboard;
                        }
                    }
                }
            }
        });

        scene.onPointerObservable.add((data) => {
            if (!this._autoRotate) {
                const pickedPoint = data.pickInfo?.pickedPoint || scene.pick(data.event.offsetX, data.event.offsetY)?.pickedPoint;
                if (pickedPoint) {
                    this._tank.lookAt(pickedPoint);
                }
            }

            if (data.type === PointerEventTypes.POINTERDOWN && data.event.button === 0) {
                this._commandState[Command.Shoot] |= State.Pointer;
            } else if (data.type === PointerEventTypes.POINTERUP) {
                this._commandState[Command.Shoot] &= ~State.Pointer;
            }
        });

        scene.onBeforeRenderObservable.add(() => {
            const x = (this._commandState[Command.Left] ? -1 : 0) + (this._commandState[Command.Right] ? 1 : 0);
            const z = (this._commandState[Command.Up] ? 1 : 0) + (this._commandState[Command.Down] ? -1 : 0);
            this._tank.move(x, z);

            if (this._autoRotate) {
                this._tank.rotate(1);
            }

            if (this._autoShoot || this._commandState[Command.Shoot]) {
                this._tank.shoot();
            }

            camera.target.copyFrom(this._tank.position);
        });
    }
}