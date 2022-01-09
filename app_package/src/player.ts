import "@babylonjs/core/Culling/ray";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Bullet, Bullets } from "./bullets";
import { Crashers } from "./crashers";
import { Entity, EntityType } from "./entity";
import { Message } from "./message";
import { Score } from "./score";
import { Shapes } from "./shapes";
import { Tank } from "./tank";
import { World } from "./world";

const AUTO_ROTATE_SPEED = 1;
const CAMERA_ALPHA = -Math.PI / 2;
const CAMERA_BETA = Math.PI / 3.5;
const CAMERA_RADIUS = 15;

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
    private readonly _world: World;
    private readonly _tank: Tank;
    private readonly _score: Score;
    private readonly _camera: ArcRotateCamera;
    private readonly _commandState = new Map<Command, State>();

    private _autoShoot = false;
    private _autoRotate = false;

    public constructor(world: World, bullets: Bullets, shapes: Shapes, crashers: Crashers) {
        this._world = world;

        const node = world.sources.createStarterTank(undefined, "player");
        const properties = { reloadTime: 0.5, bulletSpeed: 5, movementSpeed: 5 };
        this._tank = new Tank("Player", node, properties, world, bullets);

        this._score = new Score(world);

        this._camera = new ArcRotateCamera("camera", CAMERA_ALPHA, CAMERA_BETA, CAMERA_RADIUS, Vector3.Zero(), world.scene);
        this._camera.lowerRadiusLimit = 2;

        world.scene.onKeyboardObservable.add((data) => {
            if ((data.event as any).repeat || world.paused) {
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
                        let state = this._commandState.get(command) || State.None;
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

        world.scene.onPointerObservable.add((data) => {
            if (world.paused) {
                return;
            }

            if (!this._autoRotate) {
                const pickedPoint = data.pickInfo?.pickedPoint || world.scene.pick(data.event.offsetX, data.event.offsetY)?.pickedPoint;
                if (pickedPoint) {
                    this._tank.lookAt(pickedPoint);
                }
            }

            if (data.event.button === 0) {
                let state = this._commandState.get(Command.Shoot) || State.None;
                if (data.type === PointerEventTypes.POINTERDOWN) {
                    state |= State.Pointer;
                } else if (data.type === PointerEventTypes.POINTERUP) {
                    state &= ~State.Pointer;
                }
                this._commandState.set(Command.Shoot, state);
            }
        });

        world.onPausedStateChangedObservable.add((paused) => {
            if (paused) {
                this._camera.attachControl();
            } else {
                this._camera.detachControl();
                this._camera.target.copyFrom(this._tank.position);
                this._camera.alpha = CAMERA_ALPHA;
                this._camera.beta = CAMERA_BETA;
                this._camera.radius = CAMERA_RADIUS;

                this._commandState.clear();
            }
        });

        const handleEntityDestroyed = (target: { points: number }, other: Entity): void => {
            switch (other.type) {
                case EntityType.Bullet: {
                    const bullet = other as Bullet;
                    if (bullet.owner === this._tank) {
                        this._score.add(target.points);
                    }
                    break;
                }
                case EntityType.Tank: {
                    if (other === this._tank) {
                        this._score.add(target.points);
                    }
                    break;
                }
            }
        };

        shapes.onShapeDestroyedObservable.add(({shape, other}) => handleEntityDestroyed(shape, other));
        crashers.onCrasherDestroyedObservable.add(({crasher, other}) => handleEntityDestroyed(crasher, other));
    }

    public get position(): Vector3 {
        return this._tank.position;
    }

    public update(deltaTime: number): void {
        if (this._autoRotate) {
            this._tank.rotate(AUTO_ROTATE_SPEED * deltaTime);
        }

        const x = (this._commandState.get(Command.Left) ? -1 : 0) + (this._commandState.get(Command.Right) ? 1 : 0);
        const z = (this._commandState.get(Command.Up) ? 1 : 0) + (this._commandState.get(Command.Down) ? -1 : 0);
        const shoot = this._autoShoot || !!this._commandState.get(Command.Shoot);
        this._tank.update(deltaTime, x, z, shoot, this._world.size + 10, this._onTankDestroyed.bind(this));

        this._score.update(deltaTime);

        this._camera.target.copyFrom(this._tank.position);
    }

    private _onTankDestroyed(entity: Entity): void {
        const message = new Message(this._world);
        message.show(`You were killed by a ${entity.displayName}.`, () => {
            this._tank.reset();
            this._score.multiply(0.5);

            const limit = this._world.size * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            this._tank.position.set(x, 0, z);
            this._tank.velocity.set(0, 0, 0);
        });
    }
}
