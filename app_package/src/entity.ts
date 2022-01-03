import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export const enum EntityType {
    Bullet,
    Crasher,
    Shape,
    Tank,
}

export interface Entity {
    readonly displayName: string;
    readonly type: EntityType;
    readonly size: number;
    readonly mass: number;
    readonly damage: number;
    readonly position: Vector3;
    readonly velocity: Vector3;
}
