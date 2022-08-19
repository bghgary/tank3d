import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { Entity } from "../entity";
import { SizeMetadata } from "../metadata";
import { collideCircleWithCircle, collideCircleWithPolygon, collidePolygonWithCircle, collidePolygonWithPolygon } from "./colliderMath";

export abstract class Collider implements Quadtree.Rect {
    protected readonly _node: TransformNode;
    protected readonly _size: number;

    protected get _absoluteSize(): number {
        const scaling = this._node.scaling;
        return this._size * Math.max(scaling.x, scaling.z);
    }

    protected get _absolutePolygon(): Nullable<DeepImmutable<Array<Vector3>>> {
        return null;
    }

    public constructor(node: TransformNode, size: number) {
        this._node = node;
        this._size = size;
    }

    public get node(): TransformNode {
        return this._node;
    }

    // Quadtree.Rect
    public get x() { return this._node.absolutePosition.x - this._absoluteSize * 0.5; }
    public get y() { return this._node.absolutePosition.z - this._absoluteSize * 0.5; }
    public get width() { return this._absoluteSize; }
    public get height() { return this._absoluteSize; }

    public static Collide(collider1: Collider, collider2: Collider, mtv: Vector3): boolean {
        const center1 = collider1._node.absolutePosition;
        const center2 = collider2._node.absolutePosition;
        const polygon1 = collider1._absolutePolygon;
        const polygon2 = collider2._absolutePolygon;
        const radius1 = collider1._absoluteSize * 0.5;
        const radius2 = collider2._absoluteSize * 0.5;

        if (polygon1 && polygon2) {
            return collidePolygonWithPolygon(center1, polygon1, center2, polygon2, mtv);
        } else if (!polygon1 && !polygon2) {
            return collideCircleWithCircle(center1, radius1, center2, radius2, mtv);
        } else if (polygon1) {
            return collidePolygonWithCircle(center1, polygon1, center2, radius2, mtv);
        } else if (polygon2) {
            return collideCircleWithPolygon(center1, radius1, center2, polygon2, mtv);
        }

        return false;
    }
}

export interface Collidable {
    preCollide: (other: Entity) => boolean;
    postCollide: (other: Entity) => number;
}

export class EntityCollider extends Collider {
    public constructor(node: TransformNode, size: number, entity: Entity & Collidable) {
        super(node, size);
        this.entity = entity;
    }

    public readonly entity: Entity & Collidable;

    public static FromMetadata(node: TransformNode, metadata: SizeMetadata, entity: Entity & Collidable): EntityCollider {
        if (metadata.meshCollider) {
            const mesh = findNode(node, metadata.meshCollider.name) as AbstractMesh;
            return new PolygonCollider(mesh, metadata.meshCollider.indices, entity);
        }

        return new CircleCollider(node, metadata.size, entity);
    }
}

export class CircleCollider extends EntityCollider {}

export class PolygonCollider extends EntityCollider {
    protected readonly _points: DeepImmutable<Array<Vector3>>;
    protected readonly _absolutePoints: Array<Vector3>;

    protected override get _absolutePolygon(): Nullable<DeepImmutable<Array<Vector3>>> {
        const mesh = (this._node as AbstractMesh);
        const matrix = mesh.getWorldMatrix();
        for (let i = 0; i < this._points.length; ++i) {
            Vector3.TransformCoordinatesToRef(this._points[i]!, matrix, this._absolutePoints[i]!);
            this._absolutePoints[i]!.y = 0;
        }

        return this._absolutePoints;
    }

    public constructor(mesh: AbstractMesh, indices: DeepImmutable<Array<number>>, entity: Entity & Collidable) {
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
        const points = indices.map((index) => Vector3.FromArray(positions, index * 3));

        let maxRadiusSquared = 0;
        for (const point of points) {
            const radiusSquared = point.lengthSquared();
            if (radiusSquared > maxRadiusSquared) {
                maxRadiusSquared = radiusSquared;
            }
        }

        super(mesh, Math.sqrt(maxRadiusSquared), entity);

        this._points = points;
        this._absolutePoints = this._points.map(() => new Vector3());
    }
}

export class ProximityCollider extends Collider {
    protected override get _absoluteSize(): number {
        return this._size;
    }

    public constructor(node: TransformNode, radius: number, preCollide: (entity: Entity) => boolean, postCollide: (entity: Entity) => void) {
        super(node, radius * 2);
        this.preCollide = preCollide;
        this.postCollide = postCollide;
    }

    public readonly preCollide: (entity: Entity) => boolean;
    public readonly postCollide: (entity: Entity) => void;
}
