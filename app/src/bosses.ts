import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { KeeperBoss } from "./bosses/keeperBoss";
import { Entity } from "./entity";
import { Player } from "./player";
import { World } from "./world";

export interface Boss extends Entity {
    readonly points: number;
}

export class Bosses {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _bosses = new Set<KeeperBoss>();

    public constructor(world: World) {
        this._world = world;

        this._root = new TransformNode("bosses", this._world.scene);

        this._world.collisions.register({
            [Symbol.iterator]: this._getCollidableEntities.bind(this)
        });


        const node = this._world.sources.create(this._world.sources.boss.keeper, this._root);
        node.position.y = 10;
        node.position.z = 10;

        this._bosses.add(new KeeperBoss(this._world, node));
    }

    public update(deltaTime: number, player: Player): void {
        for (const boss of this._bosses) {
            boss.update(deltaTime, player, (entity) => {
                this._bosses.delete(boss);
            });
        }
    }

    private *_getCollidableEntities(): Iterator<KeeperBoss> {
        for (const boss of this._bosses) {
            if (boss.active) {
                yield boss;
            }
        }
    }
}