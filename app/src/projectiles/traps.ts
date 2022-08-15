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

export type TrapConstructor = ProjectileConstructor<Trap>;

export class Traps extends Projectiles<Trap> {
    public constructor(world: World) {
        super(world, "traps");
    }

    public add(constructor: TrapConstructor, owner: Entity, source: TransformNode, properties: DeepImmutable<WeaponProperties>, barrelNode: TransformNode, duration: number): Trap {
        return this._add(constructor, owner, source, properties, barrelNode, duration);
    }
}

export class Trap extends Projectile {
    protected readonly _health: Health;

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);
        this._health = new Health(this._properties.health);
    }

    public type = EntityType.Trap;

    public override update(deltaTime: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);
        decayVector3ToRef(this.velocity, Vector3.ZeroReadOnly, deltaTime, 2, this.velocity);
        super.update(deltaTime, onDestroy);
    }

    protected _onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            applyCollisionForce(this, other);
            return 0;
        }

        if (other.damage.value > 0) {
            this._flash.setState(FlashState.Damage);
            this._health.takeDamage(other);
        }

        applyCollisionForce(this, other);
        return other.damage.time;
    }
}
