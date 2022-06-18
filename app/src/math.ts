import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DeepImmutable } from "@babylonjs/core/types";

export const TmpVector3: [Vector3, Vector3, Vector3] = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
];

export const TmpMatrix: [Matrix] = [
    new Matrix(),
];

export function decayScalar(from: number, to: number, deltaTime: number, factor: number): number {
    const decayFactor = Math.exp(-deltaTime * factor);
    return to - (to - from) * decayFactor;
}

export function decayVector3ToRef(from: DeepImmutable<Vector3>, to: DeepImmutable<Vector3>, deltaTime: number, factor: number, result: Vector3): void {
    const decayFactor = Math.exp(-deltaTime * factor);
    result.x = to.x - (to.x - from.x) * decayFactor;
    result.z = to.z - (to.z - from.z) * decayFactor;
}

export function max<T>(array: Iterable<T>, callback: (value: T) => number): number {
    let max = -Number.MAX_VALUE;
    for (const item of array) {
        const value = callback(item);
        if (value > max) {
            max = value;
        }
    }
    return max;
}

export function angleBetween(a: DeepImmutable<Vector3>, b: DeepImmutable<Vector3>): number {
    return Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z);
}