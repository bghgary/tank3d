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

export class Traps extends Projectiles {
    private readonly _traps: Set<Trap>;

    public constructor(world: World) {
        const traps = new Set<Trap>();
        super(world, "traps", traps);
        this._traps = traps;
    }

    public add(owner: Entity, barrelNode: TransformNode, createNode: (parent: TransformNode) => TransformNode, properties: Readonly<WeaponProperties>, duration: number): Trap {
        const trap = new Trap(owner, barrelNode, createNode(this._root), properties, duration, this._world.sources);
        this._traps.add(trap);
        return trap;
    }

    public update(deltaTime: number): void {
        for (const trap of this._traps) {
            trap.update(deltaTime, () => {
                this._traps.delete(trap);
            });
        }
    }
}

class Trap extends Projectile {
    private readonly _shadow: Shadow;
    private _health: number;
    private _time: number;

    public constructor(owner: Entity, barrelNode: TransformNode, bulletNode: TransformNode, properties: Readonly<WeaponProperties>, duration: number, sources: Sources) {
        super(owner, barrelNode, bulletNode, properties);
        this._shadow = new Shadow(sources, this._node);
        this._health = this._properties.health;
        this._time = duration;
    }

    public type = EntityType.Trap;

    public update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

        decayVector3ToRef(this.velocity, Vector3.ZeroReadOnly, deltaTime, 2, this.velocity);

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
            applyCollisionForce(this, other);
            return 0;
        }

        applyCollisionForce(this, other, 2);
        this._health -= other.damage;
        return other.damageTime;
    }
}
