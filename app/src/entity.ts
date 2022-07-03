import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DeepImmutable } from "@babylonjs/core/types";
import { Damage } from "./components/damage";

export const enum EntityType {
    Boss,
    Bullet,
    Crasher,
    Drone,
    Lance,
    Shape,
    Shield,
    Tank,
    Trap,
}

export interface Entity {
    readonly displayName: string;
    readonly type: EntityType;
    readonly active: boolean;
    readonly size: number;
    readonly mass: number;
    readonly damage: DeepImmutable<Damage>;
    readonly position: Vector3;
    readonly rotation: Quaternion;
    readonly velocity: Vector3;
    readonly owner?: Entity;
}

export function GetDangerValue(type: EntityType): number {
    switch (type) {
        case EntityType.Tank:
            return 0;
        case EntityType.Crasher:
            return 1;
        case EntityType.Boss:
            return 2;
        case EntityType.Drone:
        case EntityType.Trap:
        case EntityType.Bullet:
            return 3;
        case EntityType.Shape:
            return 4;
        case EntityType.Lance:
        case EntityType.Shield:
            return 5;
    }
}
