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

const MAX_DURATION = 24;

export class Traps extends Projectiles {
    private readonly _traps: Set<Trap>;

    public constructor(world: World) {
        const traps = new Set<Trap>();
        super(world, "traps", traps);
        this._traps = traps;
    }

    public add(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, trapMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Trap {
        const trap = new Trap(owner, barrelNode, barrelMetadata, createNode(this._root), trapMetadata, this._world.sources);
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
    private _time = MAX_DURATION;

    public constructor(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, bulletNode: TransformNode, bulletMetadata: Readonly<ProjectileMetadata>, sources: Sources) {
        super(owner, barrelNode, barrelMetadata, bulletNode, bulletMetadata);
        this._shadow = new Shadow(sources, this._node);
        this._health = this._metadata.health;
    }

    public type = EntityType.Trap;

    public update(deltaTime: number, onDestroy: () => void): void {
        ApplyMovement(deltaTime, this._node.position, this.velocity);

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
            ApplyCollisionForce(this, other);
            return 0;
        }

        ApplyCollisionForce(this, other, 2);
        this._health -= other.damage;
        return 0.1;
    }
}
