import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DeepImmutable } from "@babylonjs/core/types";
import { Damage } from "./components/damage";

export const enum EntityType {
    Boss,
    Bullet,
    Crasher,
    Drone,
    Landmine,
    Lance,
    Sentry,
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
    readonly attachment?: boolean;
    readonly impenetrable?: boolean;
}

export interface Enemy extends Entity {
    readonly points: number;
}