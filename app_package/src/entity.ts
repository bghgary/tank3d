import { Vector3 } from "@babylonjs/core";

export const enum EntityType {
    Bullet,
    Shape
}

export interface EntityData {
    readonly type: EntityType;
    readonly size: number;
    readonly mass: number;
    readonly onCollide: (other: Entity) => void;
}

export interface Entity {
    uniqueId: number;
    position: Vector3;
    metadata: EntityData;
}

interface EntityWithVelocity extends Entity {
    metadata: EntityData & {
        velocity: Vector3;
    };
}

export function ApplyCollisionForce(target: EntityWithVelocity, other: Entity, strength = 1): void {
    const position = target.position;
    const velocity = target.metadata.velocity;
    const dx = position.x - other.position.x;
    const dz = position.z - other.position.z;
    const factor = strength * other.metadata.mass / (target.metadata.mass + other.metadata.mass) / Math.sqrt(dx * dx + dz * dz);
    velocity.x += dx * factor;
    velocity.z += dz * factor;
}
