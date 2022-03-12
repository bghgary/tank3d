import { Scalar } from "@babylonjs/core/Maths/math.scalar";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Entity } from "./entity";

const GRAVITY = 9.8;

export function ApplyCollisionForce(target: Entity, other: Entity, strength = 1): void {
    const position = target.position;
    const velocity = target.velocity;
    const dx = position.x - other.position.x;
    const dz = position.z - other.position.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const factor = strength * other.mass / (target.mass + other.mass) / Math.max(length, 0.01);
    velocity.x += dx * factor;
    velocity.z += dz * factor;
}

export function ApplyMovement(deltaTime: number, position: Vector3, velocity: Readonly<Vector3>): void {
    position.x += velocity.x * deltaTime;
    position.z += velocity.z * deltaTime;
}

export function ApplyGravity(deltaTime: number, position: Vector3, velocity: Vector3): boolean {
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

export function ApplyWallBounce(position: Vector3, velocity: Vector3, size: number, wallLimit: number): void {
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

export function ApplyWallClamp(position: Vector3, size: number, wallLimit: number): void {
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

export function ApplyRecoil(recoil: Vector3, entity: Entity): void {
    recoil.x += entity.velocity.x * entity.mass;
    recoil.z += entity.velocity.z * entity.mass;
}

export function ApplyVariance(forward: Readonly<Vector3>, variance = Tools.ToRadians(2), result: Vector3): Vector3 {
    const angle = Scalar.RandomRange(-variance, variance);
    forward.rotateByQuaternionToRef(Quaternion.FromEulerAngles(0, angle, 0), result);
    return result;
}
