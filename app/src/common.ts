import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { Entity, EntityType } from "./entity";

const GRAVITY = 9.8;

export function applyCollisionForce(target: Entity, other: DeepImmutable<Entity>): void {
    const position = target.position;
    const velocity = target.velocity;
    const dx = position.x - other.position.x;
    const dz = position.z - other.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const contactDistance = (target.size + other.size) * 0.5;
    const factor = Math.min(contactDistance / distance, 10) * 2 * other.mass / (target.mass + other.mass);
    setTimeout(() => {
        velocity.x += dx * factor;
        velocity.z += dz * factor;
    }, 0);

    // Certain objects are impenetrable.
    if (other.type === EntityType.Lance || other.type === EntityType.Shield) {
        if (distance < contactDistance) {
            const factor = (contactDistance - distance) / distance;
            setTimeout(() => {
                position.x += dx * factor;
                position.z += dz * factor;
            }, 0);
        }
    }
}

export function applyMovement(deltaTime: number, position: Vector3, velocity: DeepImmutable<Vector3>): void {
    position.x += velocity.x * deltaTime;
    position.z += velocity.z * deltaTime;
}

export function applyGravity(deltaTime: number, position: Vector3, velocity: Vector3): boolean {
    if (position.y === 0) {
        return false;
    }

    velocity.y -= GRAVITY * deltaTime;
    position.y += velocity.y * deltaTime;
    if (position.y <= 0) {
        position.y = 0;
        velocity.y = 0;
    }

    return true;
}

export function applyWallBounce(position: Vector3, velocity: Vector3, size: number, wallLimit: number): void {
    const limit = (wallLimit - size) * 0.5;

    if (position.x > limit) {
        position.x = limit;
        velocity.x = -Math.abs(velocity.x);
    } else if (position.x < -limit) {
        position.x = -limit;
        velocity.x = Math.abs(velocity.x);
    }

    if (position.z > limit) {
        position.z = limit;
        velocity.z = -Math.abs(velocity.z);
    } else if (position.z < -limit) {
        position.z = -limit;
        velocity.z = Math.abs(velocity.z);
    }
}

export function applyWallClamp(position: Vector3, size: number, wallLimit: number): void {
    const limit = (wallLimit - size) * 0.5;

    if (position.x > limit) {
        position.x = limit;
    } else if (position.x < -limit) {
        position.x = -limit;
    }

    if (position.z > limit) {
        position.z = limit;
    } else if (position.z < -limit) {
        position.z = -limit;
    }
}

export function findNode(node: TransformNode, name: string): TransformNode {
    return node.getChildren((node) => node.name === name, false)[0] as TransformNode;
}

export function isTarget(other: Entity, owner: Entity): boolean {
    if (!other.active || other === owner || other.owner === owner) {
        return false;
    }

    switch (other.type) {
        case EntityType.Lance:
        case EntityType.Shield:
        case EntityType.Bullet: {
            return false;
        }
    }

    return true;
}

const EntityThreatRank = new Map([
    [EntityType.Tank, 3],
    [EntityType.Crasher, 2],
    [EntityType.Boss, 1],
    [EntityType.Sentry, 1],
]);

export function getThreatValue(other: Entity, distance: number): number {
    return (EntityThreatRank.get(other.type) || 0) * 100 + Math.max(100 - distance, 0);
}

export function computeMass(density: number, size: number, height = size): number {
    const volume = height * size * size;
    return density * volume;
}