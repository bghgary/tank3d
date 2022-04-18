import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { WeaponProperties, WeaponPropertiesWithMultiplier } from "../components/weapon";
import { Entity } from "../entity";
import { BombMetadata } from "../metadata";
import { Bullet, Bullets } from "../projectiles/bullets";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { BulletTank } from "./bulletTank";

export class BomberTank extends BulletTank {
    protected override readonly _bulletConstructor = Bomb;
    protected override readonly _bulletSource = this._world.sources.bullet.tankBomber;

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.bomber, parent);
    }
}

class Bomb extends Bullet {
    private readonly _barrelNodes: Array<TransformNode>;
    private readonly _bullets: Bullets;
    private readonly _bulletSource: Mesh;
    private readonly _bulletProperties: DeepImmutable<WeaponProperties>;

    public constructor(world: World, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, properties, duration);

        const metadata = node.metadata as BombMetadata;
        this._barrelNodes = metadata.barrels.map((name) => findNode(node, name));
        this._bullets = world.bullets;
        this._bulletSource = world.sources.bullet.tank;
        this._bulletProperties = new WeaponPropertiesWithMultiplier(properties, metadata.multiplier);
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        super.update(deltaTime, () => {
            for (const barrelNode of this._barrelNodes) {
                this._bullets.add(Bullet, this.owner, this._bulletSource, this._bulletProperties, 2).shootFrom(barrelNode);
            }

            onDestroy();
        });
    }
}