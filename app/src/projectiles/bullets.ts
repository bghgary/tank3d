import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyCollisionForce, applyMovement } from "../common";
import { FlashState } from "../components/flash";
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

    public constructor(world: World, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, barrelNode: TransformNode, duration: number) {
        super(world, owner, node, properties, barrelNode, duration);
        this._health = new Health(this._properties.health);
    }

    public override shoot(barrelNode: TransformNode): void {
        super.shoot(barrelNode);
        this._targetVelocity.copyFrom(this._node.forward).scaleInPlace(this._properties.speed);
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
            this._flash.setState(FlashState.Damage);
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}
