import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";

function distanceSquared(a: DeepImmutable<Vector3>, b: DeepImmutable<Vector3>): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
}

function dot(a: DeepImmutable<Vector3>, b: DeepImmutable<Vector3>): number {
    return a.x * b.x + a.z * b.z;
}

let numAxes = 0;
const axes = new Array<Vector3>(32);
for (let i = 0; i < axes.length; ++i) {
    axes[i] = new Vector3();
}

function getAxes(polygon: DeepImmutable<Array<Vector3>>): void {
    const n = polygon.length;
    for (let i = 0; i < n; ++i) {
        const p0 = polygon[i]!;
        const p1 = polygon[(i + 1) % n]!;
        axes[numAxes++]!.set(p0.z - p1.z, 0, p1.x - p0.x);
    }
}

function projectPolygon(polygon: DeepImmutable<Array<Vector3>>, axis: DeepImmutable<Vector3>): [number, number] {
    let min = Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    for (const point of polygon) {
        const projection = dot(axis, point);
        if (projection < min) {
            min = projection;
        }
        if (projection > max) {
            max = projection;
        }
    }
    return [min, max];
}

function projectCircle(center: DeepImmutable<Vector3>, radius: number, axis: DeepImmutable<Vector3>): [number, number] {
    const projection = dot(axis, center);
    const projectedRadius = radius * axis.length();
    return [projection - projectedRadius, projection + projectedRadius];
}

function overlap(a: [number, number], b: [number, number]): boolean {
    return a[1] >= b[0] && b[1] >= a[0];
}

export function collideCircleWithCircle(center0: DeepImmutable<Vector3>, radius0: number, center1: DeepImmutable<Vector3>, radius1: number): boolean {
    const distance = radius0 + radius1;
    const distance2 = distanceSquared(center0, center1);
    return (distance2 < distance * distance);
}

export function collidePolygonWithPolygon(polygon1: DeepImmutable<Array<Vector3>>, polygon2: DeepImmutable<Array<Vector3>>): boolean {
    numAxes = 0;
    getAxes(polygon1);
    getAxes(polygon2);

    for (let i = 0; i < numAxes; ++i) {
        const axis = axes[i]!;
        const projection1 = projectPolygon(polygon1, axis);
        const projection2 = projectPolygon(polygon2, axis);
        if (!overlap(projection1, projection2)) {
            return false;
        }
    }

    return true;
}

export function collideCircleWithPolygon(center: DeepImmutable<Vector3>, radius: number, polygon: DeepImmutable<Array<Vector3>>): boolean {
    numAxes = 0;

    let minDistance2 = Number.MAX_VALUE;
    let closestPoint: Nullable<Vector3> = null;
    for (const point of polygon) {
        const distance2 = distanceSquared(center, point);
        if (distance2 < minDistance2) {
            minDistance2 = distance2;
            closestPoint = point;
        }
    }
    if (closestPoint) {
        axes[numAxes++]!.set(closestPoint.x - center.x, 0, closestPoint.z - center.z);
    }

    getAxes(polygon);

    for (let i = 0; i < numAxes; ++i) {
        const axis = axes[i]!;
        const projection1 = projectCircle(center, radius, axis);
        const projection2 = projectPolygon(polygon, axis);
        if (!overlap(projection1, projection2)) {
            return false;
        }
    }

    return true;
}
