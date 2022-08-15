import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { BaseBoss } from "./bosses/baseBoss";
import { FortressBoss } from "./bosses/fortressBoss";
import { KeeperBoss } from "./bosses/keeperBoss";
import { Enemy } from "./entity";
import { Player } from "./player";
import { World } from "./worlds/world";

const DROP_HEIGHT = 20;

export class Bosses {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _bosses = new Set<BaseBoss>();

    public constructor(world: World) {
        this._world = world;
        this._root = new TransformNode("bosses", this._world.scene);
    }

    public addKeeper(): Enemy {
        const node = this._world.sources.create(this._world.sources.boss.keeper, this._root);
        const boss = new KeeperBoss(this._world, node);
        const limit = (this._world.size - boss.size) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        boss.position.set(x, DROP_HEIGHT, z);
        Quaternion.FromEulerAnglesToRef(0, Scalar.RandomRange(0, Math.PI), 0, boss.rotation);
        this._bosses.add(boss);
        return boss;
    }

    public addFortress(): Enemy {
        const node = this._world.sources.create(this._world.sources.boss.fortress, this._root);
        const boss = new FortressBoss(this._world, node);
        const limit = (this._world.size - boss.size) * 0.5;
        const x = Scalar.RandomRange(-limit, limit);
        const z = Scalar.RandomRange(-limit, limit);
        boss.position.set(x, DROP_HEIGHT, z);
        Quaternion.FromEulerAnglesToRef(0, Scalar.RandomRange(0, Math.PI), 0, boss.rotation);
        this._bosses.add(boss);
        return boss;
    }

    public update(deltaTime: number, player: Player): void {
        for (const boss of this._bosses) {
            boss.update(deltaTime, player, (source) => {
                this._bosses.delete(boss);
                this._world.onEnemyDestroyedObservable.notifyObservers([source, boss]);
            });
        }
    }
}