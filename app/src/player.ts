import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/core/Culling/ray";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observable } from "@babylonjs/core/Misc/observable";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel";
import { Entity } from "./entity";
import { EvolutionNode, EvolutionRootNode } from "./evolutions";
import { decayScalar, decayVector3ToRef, TmpVector3 } from "./math";
import { Message } from "./message";
import { PlayerTank } from "./tanks/playerTank";
import { Evolutions } from "./ui/evolutions";
import { Level } from "./ui/level";
import { Score } from "./ui/score";
import { Upgrades, UpgradeType } from "./ui/upgrades";
import { World } from "./worlds/world";

declare const DEV_BUILD: boolean;

const CAMERA_ALPHA = -Math.PI / 2;
const CAMERA_BETA = Math.PI / 3.5;
const CAMERA_RADIUS = 15;

const enum Command {
    Up,
    Down,
    Left,
    Right,
    Shoot,
    Secondary,
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
    ["ShiftLeft", Command.Secondary],
    ["ShiftRight", Command.Secondary],
]);

export class Player {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _score: Score;
    private readonly _level: Level;
    private readonly _upgrades: Upgrades;
    private readonly _evolutions: Evolutions;
    private readonly _camera: ArcRotateCamera;
    private readonly _commandState = new Map<Command, State>();

    private _tank: PlayerTank;

    public constructor(world: World) {
        this._world = world;

        this._root = new TransformNode("player", this._world.scene);

        const node = EvolutionRootNode.Tank.Create(this._world.sources, this._root);
        this._tank = new EvolutionRootNode.Tank(this._world, node);

        const limit = world.size * 0.25;
        this._tank.position.x = Scalar.RandomRange(-limit, limit);
        this._tank.position.z = Scalar.RandomRange(-limit, limit);

        const bottomPanel = new StackPanel("bottomPanel");
        bottomPanel.adaptWidthToChildren = true;
        bottomPanel.spacing = 10;
        bottomPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        bottomPanel.topInPixels = -36;
        this._world.uiContainer.addControl(bottomPanel);

        this._score = new Score(bottomPanel);

        this._level = new Level(bottomPanel, this._score, this._tank.displayName);
        this._level.onChangedObservable.add((value) => this.onLevelChangedObservable.notifyObservers(value));

        this._upgrades = new Upgrades(this._world, this._level, this._tank.upgradeNames);
        this._upgrades.onUpgradeObservable.add(() => this._setTankUpgrades());

        this._evolutions = new Evolutions(this._world, this._level);
        this._evolutions.onEvolveObservable.add((evolutionNode) => this._updateTank(evolutionNode));

        this._camera = new ArcRotateCamera("camera", CAMERA_ALPHA, CAMERA_BETA, CAMERA_RADIUS, this._tank.position.clone(), this._world.scene);
        this._camera.lowerRadiusLimit = 2;
        this._world.scene.activeCameras = [this._camera];

        this._world.scene.onKeyboardObservable.add((data) => {
            if (this._world.paused) {
                return;
            }

            // Cheat shortcut for testing
            if (data.type === KeyboardEventTypes.KEYUP && data.event.ctrlKey && data.event.shiftKey && data.event.altKey && data.event.code === "KeyG") {
                const score = this._score.value;
                if (score < 731) {
                    this._score.add(731 - score);
                } else if (score < 2958) {
                    this._score.add(2958 - score);
                } else {
                    this._score.add(10000 - score);
                }
            }

            const command = KeyMapping.get(data.event.code);
            if (command !== undefined) {
                switch (command) {
                    case Command.AutoShoot: {
                        if (data.type === KeyboardEventTypes.KEYUP) {
                            this._tank.toggleAutoShoot();
                        }
                        break;
                    }
                    case Command.AutoRotate: {
                        if (data.type === KeyboardEventTypes.KEYUP) {
                            this._tank.toggleAutoRotate();
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

        this._world.scene.onPointerObservable.add((data) => {
            if (this._world.paused) {
                return;
            }

            const command = (data.event.button === 0) ? Command.Shoot : Command.Secondary;
            let state = this._commandState.get(command) || State.None;
            if (data.type === PointerEventTypes.POINTERDOWN) {
                state |= State.Pointer;
            } else if (data.type === PointerEventTypes.POINTERUP) {
                state &= ~State.Pointer;
            }
            this._commandState.set(command, state);
        });

        this._world.onPausedStateChangedObservable.add((paused) => {
            if (paused) {
                this._camera.attachControl();
            } else {
                this._camera.detachControl();
                this._camera.target.copyFrom(this._tank.position);
                this._camera.alpha = CAMERA_ALPHA;
                this._camera.beta = CAMERA_BETA;

                this._commandState.clear();
            }
        });

        this._world.onEnemyDestroyedObservable.add(([source, target]) => {
            if (source === this._tank || source.owner === this._tank) {
                this._score.add(target.points);
            }
        });
    }

    public get position(): Vector3 {
        return this._tank.position;
    }

    public get active(): boolean {
        return this._tank.active && this._tank.inBounds && !this._tank.idle;
    }

    public get level(): number {
        return this._level.value;
    }

    public readonly onLevelChangedObservable = new Observable<number>();

    public update(deltaTime: number): void {
        this._tank.applyRotation(deltaTime);

        const x = (this._commandState.get(Command.Left) ? -1 : 0) + (this._commandState.get(Command.Right) ? 1 : 0);
        const z = (this._commandState.get(Command.Up) ? 1 : 0) + (this._commandState.get(Command.Down) ? -1 : 0);
        this._tank.applyMovement(deltaTime, x, z, this._world.size + 10);

        if (this._commandState.get(Command.Shoot) && this._tank.inBounds) {
            this._tank.shoot();
        }

        this._tank.secondary(this._commandState.get(Command.Secondary) !== 0);

        this._tank.update(deltaTime, (entity) => {
            this._onTankDestroyed(entity);
        });

        this._score.update(deltaTime);
        this._level.update(deltaTime);

        this._updateCamera(deltaTime);
    }

    private _updateCamera(deltaTime: number): void {
        const target = TmpVector3[0].copyFrom(this._tank.position).addInPlace(this._tank.cameraTargetOffset);
        decayVector3ToRef(this._camera.target, target, deltaTime, 10, this._camera.target);
        this._camera.radius = decayScalar(this._camera.radius, CAMERA_RADIUS * this._tank.cameraRadiusMultiplier, deltaTime, 4);
    }

    private _onTankDestroyed(entity: Entity): void {
        const message = new Message(this._world);
        message.show(`You were killed by a ${entity.displayName}.`, () => {
            this._score.multiply(0.5);
            this._upgrades.reset();
            this._evolutions.reset();
            this._updateTank(EvolutionRootNode);
            this._tank.reset();

            const limit = this._world.size * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            this._tank.position.set(x, 0, z);
        });
    }

    private _setTankUpgrades(): void {
        this._tank.setUpgrades({
            weaponSpeed:  this._upgrades.getUpgradeValue(UpgradeType.WeaponSpeed),
            weaponDamage: this._upgrades.getUpgradeValue(UpgradeType.WeaponDamage),
            weaponHealth: this._upgrades.getUpgradeValue(UpgradeType.WeaponHealth),
            reloadTime:   this._upgrades.getUpgradeValue(UpgradeType.ReloadTime),
            healthRegen:  this._upgrades.getUpgradeValue(UpgradeType.HealthRegen),
            maxHealth:    this._upgrades.getUpgradeValue(UpgradeType.MaxHealth),
            moveSpeed:    this._upgrades.getUpgradeValue(UpgradeType.MoveSpeed),
            bodyDamage:   this._upgrades.getUpgradeValue(UpgradeType.BodyDamage),
        });
    }

    private _updateTank(evolutionNode: EvolutionNode): void {
        const node = evolutionNode.Tank.Create(this._world.sources, this._root);
        this._tank = new evolutionNode.Tank(this._world, node, this._tank);
        this._upgrades.setNames(this._tank.upgradeNames);
        this._level.setTankDisplayName(this._tank.displayName);
        this._setTankUpgrades();
    }
}
