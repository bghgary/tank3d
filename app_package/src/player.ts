import { ArcRotateCamera, KeyboardEventTypes, PointerEventTypes, Vector3 } from "@babylonjs/core";
import { Tank } from "./tank";
import { World } from "./world";

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
    None = 0x0,
    Keyboard = 0x1,
    Pointer = 0x2,
}

const KeyMapping = new Map([
    ["ArrowUp", Command.Up],
    ["ArrowDown", Command.Down],
    ["ArrowLeft", Command.Left],
    ["ArrowRight", Command.Right],
    ["KeyW", Command.Up],
    ["KeyS", Command.Down],
    ["KeyA", Command.Left],
    ["KeyD", Command.Right],
    ["Space", Command.Shoot],
    ["KeyE", Command.AutoShoot],
    ["KeyC", Command.AutoRotate],
]);

export class Player {
    private readonly _tank: Tank;
    private readonly _commandState = new Map<Command, State>();

    private _autoShoot = false;
    private _autoRotate = false;

    public constructor(world: World) {
        this._tank = new Tank("player", { barrelDiameter: 0.45, barrelLength: 0.75, reloadSpeed: 0.5, bulletSpeed: 5, movementSpeed: 5 }, world);

        const scene = world.scene;
        const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3.5, 15, Vector3.Zero(), scene);

        scene.onKeyboardObservable.add((data) => {
            if ((data.event as any).repeat) {
                return;
            }

            const command = KeyMapping.get(data.event.code);
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
                        let state = this._commandState.get(command) ?? State.None;
                        if (data.type === KeyboardEventTypes.KEYDOWN) {
                            state |= State.Keyboard;
                        } else {
                            state &= ~State.Keyboard;
                        }
                        this._commandState.set(command, state);
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

            if (data.event.button === 0) {
                let state = this._commandState.get(Command.Shoot) ?? State.None;
                if (data.type === PointerEventTypes.POINTERDOWN) {
                    state |= State.Pointer;
                } else if (data.type === PointerEventTypes.POINTERUP) {
                    state &= ~State.Pointer;
                }
                this._commandState.set(Command.Shoot, state);
            }
        });

        scene.onBeforeRenderObservable.add(() => {
            const x = (this._commandState.get(Command.Left) ? -1 : 0) + (this._commandState.get(Command.Right) ? 1 : 0);
            const z = (this._commandState.get(Command.Up) ? 1 : 0) + (this._commandState.get(Command.Down) ? -1 : 0);
            this._tank.move(x, z);

            if (this._autoRotate) {
                this._tank.rotate(1);
            }

            if (this._autoShoot || this._commandState.get(Command.Shoot)) {
                this._tank.shoot();
            }

            camera.target.copyFrom(this._tank.position);
        });
    }
}