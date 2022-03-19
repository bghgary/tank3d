import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Entity } from "./entity";
import { Player } from "./player";
import { World } from "./worlds/world";
import { BaseCrasher } from "./crashers/baseCrasher";
import { BulletCrasher } from "./crashers/bulletCrasher";
import { DroneCrasher } from "./crashers/droneCrasher";
import { TwinCrasher } from "./crashers/twinCrasher";

const DROP_HEIGHT = 5;

export interface Crasher extends Entity {
    readonly points: number;
}

export class Crashers {
    private readonly _world: World;
    private readonly _maxCount: number;
    private readonly _root: TransformNode;
    private readonly _crashers = new Set<BaseCrasher>();
    private _spawnTime = 0;

    public constructor(world: World, maxCount: number) {
        this._world = world;
        this._maxCount = maxCount;
        this._root = new TransformNode("crashers", this._world.scene);
        this._world.collisions.register(this._crashers);
    }

    public update(deltaTime: number, player: Player): void {
        for (const crasher of this._crashers) {
            crasher.update(deltaTime, player, (source) => {
                this._crashers.delete(crasher);
                this._world.onEnemyDestroyedObservable.notifyObservers([source, crasher]);
            });
        }

        if (this._crashers.size < this._maxCount) {
            this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
            if (this._spawnTime === 0) {
                this._spawnCrashers();
                this._spawnTime = Scalar.RandomRange(5, 15);
            }
        }
    }

    private _addCrasher(crasher: BaseCrasher, x: number, z: number, rotation: number): void {
        crasher.position.set(x, DROP_HEIGHT, z);
        Quaternion.RotationYawPitchRollToRef(rotation, 0, 0, crasher.rotation);
        this._crashers.add(crasher);
    }

    private _createCrasher(source: TransformNode): BaseCrasher {
        return new BaseCrasher(this._world, this._world.sources.create(source, this._root));
    }

    private _createBulletCrasher(source: TransformNode): BaseCrasher {
        return new BulletCrasher(this._world, this._world.sources.create(source, this._root));
    }

    private _createTwinCrasher(source: TransformNode): BaseCrasher {
        return new TwinCrasher(this._world, this._world.sources.create(source, this._root));
    }

    private _createDroneCrasher(source: TransformNode): BaseCrasher {
        return new DroneCrasher(this._world, this._world.sources.create(source, this._root));
    }

    private _spawnCrashers(): void {
        const sources = this._world.sources;

        if (Math.random() < 0.95) {
            const create = [
                () => this._createCrasher(sources.crasher.small),
                () => this._createCrasher(sources.crasher.big),
                () => this._createBulletCrasher(sources.crasher.shooter),
            ];

            const clumpSize = Math.round(Scalar.RandomRange(4, 7));
            const limit = (this._world.size - clumpSize) * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            const rotation = Scalar.RandomRange(0, Scalar.TwoPi);
            for (let index = 0; index < clumpSize; ++index) {
                const x1 = Math.random() * clumpSize;
                const z1 = Math.random() * clumpSize;
                const rotation1 = Math.random() * Math.PI * 0.5;
                const n = Math.random();
                const crasher = create[n < 0.6 ? 0 : n < 0.9 ? 1 : 2]!();
                this._addCrasher(crasher, x + x1, z + z1, rotation + rotation1);
            }
        } else {
            const create = [
                () => this._createBulletCrasher(sources.crasher.destroyer),
                () => this._createTwinCrasher(sources.crasher.twin),
                () => this._createDroneCrasher(sources.crasher.drone),
            ];

            const n = Math.random();
            const crasher = create[n < 0.333 ? 0 : n < 0.666 ? 1 : 2]!();
            const limit = (this._world.size - crasher.size) * 0.5;
            const x = Scalar.RandomRange(-limit, limit);
            const z = Scalar.RandomRange(-limit, limit);
            const rotation = Scalar.RandomRange(0, Scalar.TwoPi);
            this._addCrasher(crasher, x, z, rotation);
        }
    }
}
