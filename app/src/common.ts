import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Entity } from "./entity";

const GRAVITY = 9.8;

export function ApplyCollisionForce(target: Entity, other: Entity, strength = 1): void {
    const position = target.position;
    const velocity = target.velocity;
    const dx = position.x - other.position.x;
    const dz = position.z - other.position.z;
    if (dx === 0 && dz === 0) {
        const randomAngle = Scalar.RandomRange(0, Scalar.TwoPi);
        const speed = target.size * 60;
        velocity.x = Math.cos(randomAngle) * speed;
        velocity.y = Math.sin(randomAngle) * speed;
    } else {
        const factor = strength * other.mass / (target.mass + other.mass) / Math.sqrt(dx * dx + dz * dz);
        velocity.x += dx * factor;
        velocity.z += dz * factor;
    }
}

export function ApplyMovement(deltaTime: number, position: Vector3, velocity: Vector3): void {
    position.x += velocity.x * deltaTime;
    position.z += velocity.z * deltaTime;
}

export function ApplyGravity(deltaTime: number, position: Vector3, velocity: Vector3): boolean {
    if (position.y > 0) {
        velocity.y -= GRAVITY * deltaTime;
        position.y += velocity.y * deltaTime;
        if (position.y <= 0) {
            position.y = 0;
            velocity.y = 0;
        }

        return true;
    }

    return false;
}

export function ApplyWallBounce(position: Vector3, velocity: Vector3, size: number, worldSize: number): void {
    const limit = (worldSize - size) * 0.5;

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

export function ApplyWallClamp(position: Vector3, size: number, worldSize: number): void {
    const limit = (worldSize - size) * 0.5;

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
