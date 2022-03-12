import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ApplyCollisionForce, ApplyMovement } from "../common";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef } from "../math";
import { BarrelMetadata, ProjectileMetadata } from "../metadata";
import { Projectile, Projectiles } from "./projectiles";
import { Shadow } from "../shadow";
import { Sources } from "../sources";
import { World } from "../worlds/world";

const MAX_DURATION = 3;

export class Bullets extends Projectiles {
    private readonly _bullets: Set<Bullet>;

    public constructor(world: World) {
        const bullets = new Set<Bullet>();
        super(world, "bullets", bullets);
        this._bullets = bullets;
    }

    public add(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, bulletMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Projectile {
        const bullet = new Bullet(owner, barrelNode, barrelMetadata, createNode(this._root), bulletMetadata, this._world.sources);
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

    public constructor(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, bulletNode: TransformNode, bulletMetadata: Readonly<ProjectileMetadata>, sources: Sources) {
        super(owner, barrelNode, barrelMetadata, bulletNode, bulletMetadata);
        this._targetVelocity.copyFrom(this.velocity).scaleInPlace(bulletMetadata.speed / this.velocity.length());
        console.log(`targetVelocity ${this._targetVelocity.x} ${this._targetVelocity.y} ${this._targetVelocity.z}`);
        this._shadow = new Shadow(sources, this._node);
        this._health = this._metadata.health;
    }

    public type = EntityType.Bullet;

    public update(deltaTime: number, onDestroy: () => void): void {
        ApplyMovement(deltaTime, this._node.position, this.velocity);

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

        ApplyCollisionForce(this, other, 2);
        this._health -= other.damage;
        return 0.1;
    }
}
