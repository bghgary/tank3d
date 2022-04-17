import { DeepImmutable } from "@babylonjs/core/types";
import { Damage, DamageWithMultiplier } from "./damage";

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
