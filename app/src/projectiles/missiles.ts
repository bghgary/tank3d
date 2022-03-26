import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyCollisionForce, applyMovement } from "../common";
import { Shadow } from "../components/shadow";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef } from "../math";
import { World } from "../worlds/world";
import { Projectile, Projectiles } from "./projectiles";

export interface MissileConstructor {
    prototype: Missile;
    new(owner: Entity, barrelNode: TransformNode, missileNode: TransformNode, properties: Readonly<WeaponProperties>, duration: number, world: World): Missile;
}

export class Missiles extends Projectiles {
    private readonly _missiles: Set<Missile>;
    private readonly _properties: Readonly<WeaponProperties>;

    public constructor(world: World, parent: TransformNode, properties: Readonly<WeaponProperties>) {
        const missiles = new Set<Missile>();
        super(world, "missiles", missiles);
        this._root.parent = parent;
        this._missiles = missiles;
        this._properties = properties;
    }

    public add(constructor: MissileConstructor, owner: Entity, barrelNode: TransformNode, createNode: (parent: TransformNode) => TransformNode, duration: number): Missile {
        const missile = new constructor(owner, barrelNode, createNode(this._root), this._properties, duration, this._world);
        this._missiles.add(missile);
        return missile;
    }

    public update(deltaTime: number): void {
        for (const missile of this._missiles) {
            missile.update(deltaTime, () => {
                this._missiles.delete(missile);
            });
        }
    }
}

export abstract class Missile extends Projectile {
    protected _world: World;
    private readonly _shadow: Shadow;
    private readonly _targetVelocity: Readonly<Vector3> = new Vector3();
    private _health: number;
    private _time: number;

    protected constructor(owner: Entity, barrelNode: TransformNode, missileNode: TransformNode, properties: Readonly<WeaponProperties>, duration: number, world: World) {
        super(owner, barrelNode, missileNode, properties);
        this._world = world;
        this._targetVelocity.copyFrom(this.velocity).scaleInPlace(properties.speed / this.velocity.length());
        this._shadow = new Shadow(this._world.sources, this._node);
        this._health = this._properties.health;
        this._time = duration;
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
            if (other.type == EntityType.Bullet) {
                return 1;
            }

            applyCollisionForce(this, other);
            return 0;
        }

        applyCollisionForce(this, other);
        this._health -= other.damage;
        return other.damageTime;
    }
}
