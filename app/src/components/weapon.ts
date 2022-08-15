import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { Collider } from "../colliders/collider";
import { applyCollisionForce } from "../common";
import { Entity, EntityType } from "../entity";
import { SizeMetadata } from "../metadata";
import { World } from "../worlds/world";
import { Damage, DamageWithMultiplier, DamageZero } from "./damage";

export interface WeaponProperties {
    speed: number;
    damage: Damage;
    health: number;
}

export class WeaponPropertiesWithMultiplier implements DeepImmutable<WeaponProperties> {
    private readonly _base: DeepImmutable<WeaponProperties>;
    private readonly _multiplier: Partial<DeepImmutable<WeaponProperties>>;
    private readonly _damage: DamageWithMultiplier;

    public constructor(properties: DeepImmutable<WeaponProperties>, multiplier?: Partial<DeepImmutable<WeaponProperties>>) {
        this._base = properties;
        this._multiplier = multiplier || {};
        this._damage = new DamageWithMultiplier(this._base.damage, this._multiplier.damage);
    }

    public get speed() { return this._base.speed * (this._multiplier.speed || 1); }
    public get damage() { return this._damage; }
    public get health() { return this._base.health * (this._multiplier.health || 1); }
}

export abstract class Weapon implements Entity {
    protected readonly _node: TransformNode;
    protected readonly _metadata: SizeMetadata;
    protected readonly _damage: DeepImmutable<Damage>;

    public constructor(world: World, type: EntityType, owner: Entity, node: TransformNode, damage: DeepImmutable<Damage> = DamageZero) {
        this.type = type;
        this.owner = owner;
        this._node = node;
        this._metadata = this._node.metadata as SizeMetadata;
        this._damage = damage;

        const collider = Collider.FromMetadata(this._node, this._metadata, this, this._onCollide.bind(this));
        world.collisions.register(collider);
    }

    // Entity
    public get displayName() { return this.owner.displayName; }
    public readonly type: EntityType;
    public get active() { return this.owner.active; }
    public get size() { return (this._node.metadata as SizeMetadata).size; }
    public get mass() { return this.owner.mass; }
    public get damage() { return this._damage; }
    public get position() { return this._node.absolutePosition; }
    public get rotation() { return this.owner.rotation; }
    public get velocity() { return this.owner.velocity; }
    public readonly owner: Entity;

    private _onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            return 1;
        }

        applyCollisionForce(this.owner, other);
        this._takeDamage(other);
        return other.damage.time;
    }

    protected _takeDamage(_: Entity): void {
        // do nothing by default
    }
}
