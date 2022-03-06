import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

export const TmpVector3: [Vector3, Vector3, Vector3] = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
];

export const TmpMatrix: [Matrix] = [
    new Matrix(),
];

export const QuaternionIdentity: Readonly<Quaternion> = Quaternion.Identity();

export function decayScalar(from: number, to: number, deltaTime: number, factor: number): number {
    const decayFactor = Math.exp(-deltaTime * factor);
    return to - (to - from) * decayFactor;
}

export function decayVector3ToRef(from: Readonly<Vector3>, to: Readonly<Vector3>, deltaTime: number, factor: number, result: Vector3): Vector3 {
    const decayFactor = Math.exp(-deltaTime * factor);
    result.x = to.x - (to.x - from.x) * decayFactor;
    result.z = to.z - (to.z - from.z) * decayFactor;
    return result;
}

export function decayQuaternionToRef(from: Readonly<Quaternion>, to: Readonly<Quaternion>, deltaTime: number, factor: number, result: Quaternion): Quaternion {
    const decayFactor = Math.exp(-deltaTime * factor);
    result.x = to.x - (to.x - from.x) * decayFactor;
    result.y = to.y - (to.y - from.y) * decayFactor;
    result.z = to.z - (to.z - from.z) * decayFactor;
    result.w = to.w - (to.w - from.w) * decayFactor;
    return result;
}
