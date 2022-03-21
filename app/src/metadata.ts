import { WeaponProperties } from "./components/weapon";
import { TankProperties } from "./tanks/playerTank";

export interface DisplayNameMetadata {
    readonly displayName: string;
}

export interface SizeMetadata {
    readonly size: number;
    readonly height?: number;
}

export interface BarrelMetadata {
    readonly diameter: number;
    readonly length: number;
    readonly variance?: number;
    readonly multiplier?: Partial<Readonly<WeaponProperties>>;
}

export interface LanceMetadata {
    readonly diameter: number;
}

export interface ShapeMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly health: number;
    readonly damage: number;
    readonly points: number;
}

export interface CrasherMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly speed: number;
    readonly health: number;
    readonly damage: number;
    readonly points: number;
}

export interface BarrelCrasherMetadata extends CrasherMetadata {
    readonly reload: number;
    readonly barrels: Array<string>;
}

export interface BulletCrasherMetadata extends BarrelCrasherMetadata {
    readonly bullet: Readonly<WeaponProperties>;
}

export interface DroneCrasherMetadata extends BarrelCrasherMetadata {
    readonly drone: Readonly<WeaponProperties>;
}

export interface BossTankMetadata {
    readonly reload: number;
    readonly barrels: Array<string>;
    readonly bullet: Readonly<WeaponProperties>;
}

export interface BossMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly speed: number;
    readonly health: number;
    readonly damage: number;
    readonly points: number;
    readonly tanks: Array<string>;
}

export interface PlayerTankMetadata extends DisplayNameMetadata, SizeMetadata {
    readonly barrels?: Array<string>;
    readonly lances?: Array<string>;
    readonly multiplier: Partial<Readonly<TankProperties>>;
}
