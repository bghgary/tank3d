import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DeepImmutable } from "@babylonjs/core/types";

const TmpVector3: [Vector3] = [new Vector3()];

let numAxes = 0;
const axes = new Array<Vector3>(32);
for (let i = 0; i < axes.length; ++i) {
    axes[i] = new Vector3();
}

function getAxes(polygon: DeepImmutable<Array<Vector3>>): void {
    const n = polygon.length;
    for (let i = 0; i < n; ++i) {
        const a = polygon[i]!;
        const b = polygon[(i + 1) % n]!;
        axes[numAxes++]!.set(a.z - b.z, 0, b.x - a.x).normalize();
    }
}

function projectPolygon(polygon: DeepImmutable<Array<Vector3>>, axis: DeepImmutable<Vector3>): [number, number] {
    let min = Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    for (const point of polygon) {
        const projection = Vector3.Dot(axis, point);
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
    const projection = Vector3.Dot(axis, center);
    return [projection - radius, projection + radius];
}

function getOverlap(a: [number, number], b: [number, number]): number {
    return Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
}

export function collideCircleWithCircle(center1: DeepImmutable<Vector3>, radius1: number, center2: DeepImmutable<Vector3>, radius2: number, mtv: Vector3): boolean {
    const contactDistance = radius1 + radius2;
    const delta = TmpVector3[0];
    center1.subtractToRef(center2, delta);
    const distance2 = delta.lengthSquared();
    if (distance2 > contactDistance * contactDistance) {
        return false;
    }

    const distance = Math.sqrt(distance2);
    delta.scaleToRef(contactDistance / distance - 1, mtv);
    return true;
}

function collideSAT(
    center1: DeepImmutable<Vector3>, project1: (axis: DeepImmutable<Vector3>) => [number, number],
    center2: DeepImmutable<Vector3>, project2: (axis: DeepImmutable<Vector3>) => [number, number],
    mtv: Vector3): boolean {

    let minOverlap = Number.MAX_VALUE;
    let minAxis: Vector3 = axes[0]!;
    for (let index = 0; index < numAxes; ++index) {
        const axis = axes[index]!;
        const projection1 = project1(axis);
        const projection2 = project2(axis);

        const overlap = getOverlap(projection1, projection2);
        if (overlap < 0) {
            return false;
        }

        if (overlap < minOverlap) {
            minOverlap = overlap;
            minAxis = axis;
        }
    }

    const delta = TmpVector3[0];
    center1.subtractToRef(center2, delta);
    mtv.copyFrom(minAxis).scaleInPlace(minOverlap * Math.sign(Vector3.Dot(delta, minAxis)));
    return true;
}

export function collidePolygonWithPolygon(
    center1: DeepImmutable<Vector3>, polygon1: DeepImmutable<Array<Vector3>>,
    center2: DeepImmutable<Vector3>, polygon2: DeepImmutable<Array<Vector3>>,
    mtv: Vector3): boolean {

    numAxes = 0;
    getAxes(polygon1);
    getAxes(polygon2);

    return collideSAT(
        center1, (axis) => projectPolygon(polygon1, axis),
        center2, (axis) => projectPolygon(polygon2, axis),
        mtv);
}

export function collideCircleWithPolygon(
    center1: DeepImmutable<Vector3>, radius1: number,
    center2: DeepImmutable<Vector3>, polygon2: DeepImmutable<Array<Vector3>>,
    mtv: Vector3): boolean {

    numAxes = 0;

    if (polygon2.length > 0) {
        const axis = axes[numAxes++]!;

        const delta = TmpVector3[0];
        let minDistance2 = Number.MAX_VALUE;
        for (const point of polygon2) {
            center1.subtractToRef(point, delta);
            const distance2 = delta.lengthSquared();
            if (distance2 < minDistance2) {
                minDistance2 = distance2;
                axis.copyFrom(delta);
            }
        }

        axis.normalize();
    }

    getAxes(polygon2);

    return collideSAT(
        center1, (axis) => projectCircle(center1, radius1, axis),
        center2, (axis) => projectPolygon(polygon2, axis),
        mtv);
}

export function collidePolygonWithCircle(
    center1: DeepImmutable<Vector3>, polygon1: DeepImmutable<Array<Vector3>>,
    center2: DeepImmutable<Vector3>, radius2: number,
    mtv: Vector3): boolean {

    if (!collideCircleWithPolygon(center2, radius2, center1, polygon1, mtv)) {
        return false;
    }

    mtv.scaleInPlace(-1);
    return true;
}
