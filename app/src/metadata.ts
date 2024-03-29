import { DeepImmutable } from "@babylonjs/core/types";
import { Damage } from "./components/damage";
import { WeaponProperties } from "./components/weapon";
import { TankProperties } from "./tanks/playerTank";

export interface DisplayNameMetadata {
    readonly displayName: string;
}

export interface SizeMetadata {
    readonly size: number;
    readonly height?: number;
    readonly meshCollider?: {
        name?: string;
        indices: DeepImmutable<Array<number>>;
    };
}

export interface BarrelMetadata {
    readonly diameter: number;
    readonly length: number;
    readonly angleVariance?: number;
    readonly speedVariance?: number;
    readonly multiplier?: Partial<DeepImmutable<WeaponProperties>>;
}

export interface BombMetadata {
    readonly barrels: Array<string>;
    readonly multiplier: Partial<DeepImmutable<WeaponProperties>>;
}

export interface BarrelProjectileMetadata {
    readonly barrels: Array<string>;
    readonly reloadMultiplier?: number;
}

export interface ShapeMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly health: number;
    readonly damage: Damage;
    readonly points: number;
}

export interface CrasherMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly speed: number;
    readonly health: number;
    readonly damage: Damage;
    readonly points: number;
}

export interface SentryMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly health: number;
    readonly damage: Damage;
    readonly points: number;
    readonly reload: number;
    readonly barrels: Array<string>;
    readonly bullet: DeepImmutable<WeaponProperties>;
}

export interface LandmineMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly health: number;
    readonly damage: Damage;
    readonly points: number;
    readonly barrels: Array<string>;
    readonly bullet: DeepImmutable<WeaponProperties>;
}

export interface BarrelCrasherMetadata extends CrasherMetadata {
    readonly reload: number;
    readonly barrels: Array<string>;
}

export interface BulletCrasherMetadata extends BarrelCrasherMetadata {
    readonly bullet: DeepImmutable<WeaponProperties>;
}

export interface PartyCrasherMetadata extends CrasherMetadata {
    readonly barrels: Array<string>;
    readonly bullet: DeepImmutable<WeaponProperties>;
}

export interface DroneCrasherMetadata extends BarrelCrasherMetadata {
    readonly drone: DeepImmutable<WeaponProperties>;
}

export interface BossTankMetadata {
    readonly reload: number;
    readonly barrels: Array<string>;
    readonly bullet: DeepImmutable<WeaponProperties>;
}

export interface BossMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly speed: number;
    readonly health: number;
    readonly damage: Damage;
    readonly points: number;
    readonly tanks?: Array<string>;
    readonly barrels?: Array<string>;
    readonly trap?: DeepImmutable<WeaponProperties>;
    readonly drone?: DeepImmutable<WeaponProperties>;
}

export interface PlayerTankMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly barrels?: Array<string>;
    readonly lances?: Array<string>;
    readonly shields?: Array<string>;
    readonly spinners?: Array<string>;
    readonly tanks?: Array<string>;
    readonly multiplier: Partial<DeepImmutable<TankProperties>>;
}
