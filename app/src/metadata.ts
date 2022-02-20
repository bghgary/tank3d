import { Vector3 } from "@babylonjs/core/Maths/math.vector";
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
    size: number;
    length: number;
    offset: Vector3;
    forward: Vector3;
    mesh: string;
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

export interface TankMetadata extends DisplayNameMetadata, SizeMetadata {
    shieldSize: number;
    barrels: Array<Readonly<BarrelMetadata>>;
    multiplier: Partial<Readonly<TankProperties>>;
}
