import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyCollisionForce, applyMovement } from "../common";
import { Health } from "../components/health";
import { Shadow } from "../components/shadow";
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

    public add(constructor: BulletConstructor, barrelNode: TransformNode, owner: Entity, source: Mesh, properties: DeepImmutable<WeaponProperties>, duration: number): Bullet {
        const node = this._world.sources.create(source, this._root);
        const bullet = new constructor(this._world, barrelNode, owner, node, properties, duration);
        this._projectiles.add(bullet);
        return bullet;
    }

    public update(deltaTime: number): void {
        for (const projectile of this._projectiles) {
            projectile.update(deltaTime, () => {
                this._projectiles.delete(projectile);
            });
        }
    }
}

export class Bullet extends Projectile {
    private readonly _targetVelocity: DeepImmutable<Vector3> = new Vector3();
    private readonly _shadow: Shadow;
    private readonly _health: Health;
    private _time: number;

    public constructor(world: World, barrelNode: TransformNode, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(barrelNode, owner, node, properties);
        this._targetVelocity.copyFrom(this.velocity).scaleInPlace(properties.speed / this.velocity.length());
        this._shadow = new Shadow(world.sources, this._node);
        this._health = new Health(this._properties.health);
        this._time = duration;
    }

    public type = EntityType.Bullet;

    public update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

        decayVector3ToRef(this.velocity, this._targetVelocity, deltaTime, 2, this.velocity);

        this._node.addRotation(0, this._targetVelocity.length() * deltaTime, 0);

        this._shadow.update();

        if (!this._health.update(deltaTime) || (this._time -= deltaTime) <= 0) {
            onDestroy();
            this._node.dispose();
        }
    }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        applyCollisionForce(this, other, 2);
        this._health.takeDamage(other);
        return other.damage.time;
    }
}