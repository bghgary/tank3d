import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Player } from "./player";
import { BaseSentry } from "./sentries/baseSentry";
import { World } from "./worlds/world";

const SPAWN_DROP_HEIGHT = 5;

export class Sentries {
    private readonly _world: World;
    private readonly _maxCount: number;
    private readonly _root: TransformNode;
    private readonly _sentries = new Set<BaseSentry>();
    private _spawnTime = 0;

    public constructor(world: World, maxCount: number) {
        this._world = world;
        this._maxCount = maxCount;
        this._root = new TransformNode("sentries", this._world.scene);
        this._world.collisions.register(this._sentries);
    }

    public enabled = false;

    public update(deltaTime: number, player: Player) {
        for (const sentry of this._sentries) {
            sentry.update(deltaTime, player, (source) => {
                this._sentries.delete(sentry);
                this._world.onEnemyDestroyedObservable.notifyObservers([source, sentry]);
            });
        }

        if (this.enabled && this._sentries.size < this._maxCount) {
            this._spawnTime = Math.max(this._spawnTime - deltaTime, 0);
            if (this._spawnTime === 0) {
                this._spawn();
                this._spawnTime = Scalar.RandomRange(30, 120);
            }
        }
    }

    private _spawn(): void {
        const node = this._world.sources.create(this._world.sources.sentries.base, this._root);
        const sentry = new BaseSentry(this._world, node);

        const limit = (this._world.size - sentry.size) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        sentry.position.set(x, SPAWN_DROP_HEIGHT, z);

        this._sentries.add(sentry);
    }
}
