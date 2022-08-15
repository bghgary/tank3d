import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable, Nullable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { Entity } from "../entity";
import { SizeMetadata } from "../metadata";
import { collideCircleWithCircle, collideCircleWithPolygon, collidePolygonWithPolygon } from "./colliderMath";

export class Collider implements Quadtree.Rect {
    protected readonly _node: TransformNode;
    protected readonly _radius: number;

    protected get _absoluteRadius(): number {
        return this._radius * this._node.scaling.x;
    }

    protected get _absolutePolygon(): Nullable<DeepImmutable<Array<Vector3>>> {
        return null;
    }

    public constructor(node: TransformNode, radius: number, entity: Nullable<Entity>, onCollide: (other: Entity) => number) {
        this._node = node;
        this._radius = radius;
        this.entity = entity;
        this.onCollide = onCollide;
    }

    public get node(): TransformNode {
        return this._node;
    }

    public get active(): boolean {
        return this.entity ? this.entity.active : true;
    }

    public readonly entity: Nullable<Entity>;
    public readonly onCollide: (other: Entity) => number;

    // Quadtree.Rect
    public get x() { return this._node.absolutePosition.x - this._absoluteRadius; }
    public get y() { return this._node.absolutePosition.z - this._absoluteRadius; }
    public get width() { return this._absoluteRadius * 2; }
    public get height() { return this._absoluteRadius * 2; }

    public static FromMetadata(node: TransformNode, metadata: SizeMetadata, entity: Entity, onCollide: (other: Entity) => number): Collider {
        if (metadata.meshCollider) {
            const mesh = findNode(node, metadata.meshCollider.name) as AbstractMesh;
            return new MeshCollider(mesh, metadata.meshCollider.indices, entity, onCollide);
        }

        return new Collider(node, metadata.size * 0.5, entity, onCollide);
    }

    public static Collide(collider1: Collider, collider2: Collider): boolean {
        if (!collider1._absolutePolygon && !collider2._absolutePolygon) {
            return collideCircleWithCircle(
                collider1._node.absolutePosition, collider1._absoluteRadius,
                collider2._node.absolutePosition, collider2._absoluteRadius);
        } else if (collider1._absolutePolygon && collider2._absolutePolygon) {
            return collidePolygonWithPolygon(
                collider1._absolutePolygon,
                collider2._absolutePolygon);
        } else if (collider1._absolutePolygon) {
            return collideCircleWithPolygon(
                collider2._node.absolutePosition, collider2._absoluteRadius,
                collider1._absolutePolygon);
        } else if (collider2._absolutePolygon) {
            return collideCircleWithPolygon(
                collider1._node.absolutePosition, collider1._absoluteRadius,
                collider2._absolutePolygon);
        }

        return false;
    }
}

export class MeshCollider extends Collider {
    protected readonly _points: DeepImmutable<Array<Vector3>>;
    protected readonly _absolutePoints: Array<Vector3>;
    protected  _matrixChanged = true;

    protected override get _absolutePolygon(): Nullable<DeepImmutable<Array<Vector3>>> {
        if (this._matrixChanged) {
            this._matrixChanged = false;
            const mesh = (this._node as AbstractMesh);
            const matrix = mesh.getWorldMatrix();
            for (let i = 0; i < this._points.length; ++i) {
                Vector3.TransformCoordinatesToRef(this._points[i]!, matrix, this._absolutePoints[i]!);
            }
        }

        return this._absolutePoints;
    }

    public constructor(mesh: AbstractMesh, indices: DeepImmutable<Array<number>>, entity: Nullable<Entity>, onCollide: (other: Entity) => number) {
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
        const points = indices.map((index) => Vector3.FromArray(positions, index * 3));

        let maxRadiusSquared = 0;
        for (const point of points) {
            const radiusSquared = point.lengthSquared();
            if (radiusSquared > maxRadiusSquared) {
                maxRadiusSquared = radiusSquared;
            }
        }

        super(mesh, Math.sqrt(maxRadiusSquared), entity, onCollide);

        this._points = points;
        this._absolutePoints = this._points.map(() => new Vector3());

        mesh.onAfterWorldMatrixUpdateObservable.add(() => {
            this._matrixChanged = true;
        });
    }
}
