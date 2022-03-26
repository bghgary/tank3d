import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyCollisionForce, applyMovement } from "../common";
import { Shadow } from "../components/shadow";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef } from "../math";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { Projectile, Projectiles } from "./projectiles";

const MAX_DURATION = 3;

export class Bullets extends Projectiles {
    private readonly _bullets: Set<Bullet>;

    public constructor(world: World) {
        const bullets = new Set<Bullet>();
        super(world, "bullets", bullets);
        this._bullets = bullets;
    }

    public add(owner: Entity, barrelNode: TransformNode, createNode: (parent: TransformNode) => TransformNode, bulletProperties: Readonly<WeaponProperties>): Projectile {
        const bullet = new Bullet(owner, barrelNode, createNode(this._root), bulletProperties, this._world.sources);
        this._bullets.add(bullet);
        return bullet;
    }

    public update(deltaTime: number): void {
        for (const bullet of this._bullets) {
            bullet.update(deltaTime, () => {
                this._bullets.delete(bullet);
            });
        }
    }
}

class Bullet extends Projectile {
    private readonly _shadow: Shadow;
    private readonly _targetVelocity: Readonly<Vector3> = new Vector3();
    private _health: number;
    private _time = MAX_DURATION;

    public constructor(owner: Entity, barrelNode: TransformNode, bulletNode: TransformNode, bulletProperties: Readonly<WeaponProperties>, sources: Sources) {
        super(owner, barrelNode, bulletNode, bulletProperties);
        this._targetVelocity.copyFrom(this.velocity).scaleInPlace(bulletProperties.speed / this.velocity.length());
        this._shadow = new Shadow(sources, this._node);
        this._health = this._properties.health;
    }

    public type = EntityType.Bullet;

    public update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

        decayVector3ToRef(this.velocity, this._targetVelocity, deltaTime, 2, this.velocity);

        this._shadow.update();

        if (this._health <= 0) {
            onDestroy();
            this._node.dispose();
        }

        this._time = Math.max(this._time - deltaTime, 0);
        if (this._time === 0) {
            onDestroy();
            this._node.dispose();
        }
    }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        applyCollisionForce(this, other, 2);
        this._health -= other.damage;
        return other.damageTime;
    }
}
