import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

export const enum EntityType {
    Bullet,
    Drone,
    Trap,
    Shape,
    Crasher,
    Boss,
    Tank,
}

export interface Entity {
    readonly displayName: string;
    readonly type: EntityType;
    readonly active: boolean;
    readonly size: number;
    readonly mass: number;
    readonly damage: number;
    readonly position: Vector3;
    readonly rotation: Quaternion;
    readonly velocity: Vector3;
    readonly owner?: Entity;
}
