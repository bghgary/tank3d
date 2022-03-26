export const enum WeaponType {
    Bullet,
    Drone,
    Lance,
    Trap,
}

export interface WeaponProperties {
    speed: number;
    damage: number;
    damageTime: number;
    health: number;
}

export class WeaponPropertiesWithMultiplier implements Readonly<WeaponProperties> {
    private readonly _properties: Readonly<WeaponProperties>;
    private readonly _multiplier: Partial<Readonly<WeaponProperties>>;

    public constructor(properties: Readonly<WeaponProperties>, multiplier?: Partial<Readonly<WeaponProperties>>) {
        this._properties = properties;
        this._multiplier = multiplier || {};
    }

    public get speed() { return this._properties.speed * (this._multiplier.speed || 1); }
    public get damage() { return this._properties.damage * (this._multiplier.damage || 1); }
    public get damageTime() { return this._properties.damageTime * (this._multiplier.damageTime || 1); }
    public get health() { return this._properties.health * (this._multiplier.health || 1); }
}
