import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyCollisionForce, applyMovement } from "../common";
import { Health } from "../components/health";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef } from "../math";
import { World } from "../worlds/world";
import { Projectile, ProjectileConstructor, Projectiles } from "./projectiles";

export type BulletConstructor = ProjectileConstructor<Bullet>;

export class Bullets extends Projectiles<Bullet> {
    public constructor(world: World) {
        super(world, "bullets");
    }

    public add(constructor: BulletConstructor, owner: Entity, source: TransformNode, properties: DeepImmutable<WeaponProperties>, barrelNode: TransformNode, duration: number): Bullet {
        return super._add(constructor, owner, source, properties, barrelNode, duration);
    }
}

export class Bullet extends Projectile {
    protected readonly _targetVelocity: DeepImmutable<Vector3> = new Vector3();
    protected readonly _health: Health;

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);
        this._health = new Health(this._properties.health);
    }

    public override shoot(barrelNode: TransformNode, callback?: (barrelForward: Vector3, speed: number) => void): void {
        super.shoot(barrelNode, (barrelForward, speed) => {
            this._targetVelocity.copyFrom(barrelForward).scaleInPlace(speed);

            if (callback) {
                callback(barrelForward, speed);
            }
        });
    }

    public type = EntityType.Bullet;

    public override update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);
        decayVector3ToRef(this.velocity, this._targetVelocity, deltaTime, 2, this.velocity);
        super.update(deltaTime, onDestroy);
    }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        if (other.damage.value > 0) {
            // No flash for bullet.
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}
