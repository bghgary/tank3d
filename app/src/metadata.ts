import { TankProperties } from "./tanks/playerTank";

export interface DisplayNameMetadata {
    displayName: string;
}

export interface SizeMetadata {
    size: number;
}

export interface ProjectileMetadata {
    speed: number;
    damage: number;
    health: number;
}

export interface BarrelMetadata {
    nodeName: string;
    diameter: number;
    length: number;
}

export interface ShapeMetadata extends DisplayNameMetadata, SizeMetadata {
    health: number;
    damage: number;
    points: number;
}

export interface CrasherMetadata extends DisplayNameMetadata, SizeMetadata {
    speed: number;
    health: number;
    damage: number;
    points: number;
}

export interface BarrelCrasherMetadata extends CrasherMetadata {
    reload: number;
    barrels: Array<Readonly<BarrelMetadata>>;
}

export interface BulletCrasherMetadata extends BarrelCrasherMetadata {
    bullet: Readonly<ProjectileMetadata>;
}

export interface DroneCrasherMetadata extends BarrelCrasherMetadata {
    drone: Readonly<ProjectileMetadata>;
}

export interface BossTankMetadata {
    nodeName: string;
    reload: number;
    barrels: Array<Readonly<BarrelMetadata>>;
    bullet: Readonly<ProjectileMetadata>;
}

export interface BossMetadata extends DisplayNameMetadata, SizeMetadata {
    speed: number;
    health: number;
    damage: number;
    points: number;
    tanks: Array<Readonly<BossTankMetadata>>;
}

export interface PlayerTankMetadata extends DisplayNameMetadata, SizeMetadata {
    shieldSize: number;
    barrels: Array<Readonly<BarrelMetadata>>;
    multiplier: Partial<Readonly<TankProperties>>;
}
