import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { PartyCrasherMetadata } from "../metadata";
import { Player } from "../player";
import { Bullet, Bullets } from "../projectiles/bullets";
import { World } from "../worlds/world";
import { BaseCrasher } from "./baseCrasher";

export class PartyCrasher extends BaseCrasher {
    private readonly _barrelNodes: Array<TransformNode>;
    private readonly _bullets: Bullets;
    private readonly _bulletSource: TransformNode;
    private readonly _bulletProperties: DeepImmutable<WeaponProperties>;

    public constructor(world: World, node: TransformNode) {
        super(world, node);

        const metadata = this._metadata as PartyCrasherMetadata;
        this._barrelNodes = metadata.barrels.map((name) => findNode(node, name));
        this._bullets = world.bullets;
        this._bulletSource = world.sources.bullet.crasher;
        this._bulletProperties = metadata.bullet;
    }

    public override update(deltaTime: number, player: Player, onDestroy: (entity: Entity) => void): void {
        super.update(deltaTime, player, (entity) => {
            for (const barrelNode of this._barrelNodes) {
                const bullet = this._bullets.add(Bullet, this, this._bulletSource, this._bulletProperties, barrelNode, 3);
                bullet.shoot(barrelNode);
            }

            onDestroy(entity);
        });
    }
}
