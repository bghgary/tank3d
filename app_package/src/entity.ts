import { Vector3 } from "@babylonjs/core";

export const enum EntityType {
    Bullet,
    Shape
}

export interface EntityData {
    readonly type: EntityType;
    readonly size: number;
    readonly onCollide: (other: Entity) => void;
}

export interface Entity {
    uniqueId: number;
    position: Vector3;
    metadata: EntityData;
}