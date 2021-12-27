import Quadtree from "@timohausmann/quadtree-js";
import { Vector3 } from "@babylonjs/core";
import { ObjectType, World } from "./world";

// REVIEW: copy Quadtree and make it use Collidable directly to prevent allocations?

export interface Collider {
    size: number;
    onCollide: (other: Collidable) => void;
}

export interface Collidable {
    position: Vector3;
    metadata: {
        type: ObjectType;
        collider: Collider;
    }
}

interface QuadtreeObject extends Quadtree.Rect {
    collidable: Collidable;
}

export class Collisions {
    private readonly _quadtree: Quadtree;
    private readonly _entries = new Array<{
        collidables: Iterable<Collidable>;
    }>();

    public constructor(world: World) {
        const size = world.size;
        const halfSize = size * 0.5;
        this._quadtree = new Quadtree({ x: -halfSize, y: -halfSize, width: size, height: size });

        world.scene.onAfterAnimationsObservable.add(() => {
            this.update();
        });
    }

    public register(collidables: Iterable<Collidable>): void {
        this._entries.push({ collidables: collidables });
    }

    public update(): void {
        this._quadtree.clear();

        const objectFromCollidable = (collidable: Collidable): QuadtreeObject => {
            const position = collidable.position;
            const size = collidable.metadata.collider.size;
            const halfSize = size * 0.5;
            return {
                x: position.x - halfSize,
                y: position.z - halfSize,
                width: size,
                height: size,
                collidable: collidable
            };
        };

        const intersects = (a: Collidable, b: Collidable): boolean => {
            const collisionDistance = (a.metadata.collider.size + b.metadata.collider.size) * 0.5;
            const x0 = a.position.x, z0 = a.position.z;
            const x1 = b.position.x, z1 = b.position.z;
            const dx = x1 - x0, dz = z1 - z0;
            const sqrDistance = dx * dx + dz * dz;
            return (sqrDistance < collisionDistance * collisionDistance);
        };

        for (const entry of this._entries) {
            const collidables = entry.collidables;

            for (const collidable of collidables) {
                this._quadtree.insert(objectFromCollidable(collidable));
            }

            for (const collidable of collidables) {
                const target = objectFromCollidable(collidable);
                const candidates = this._quadtree.retrieve<QuadtreeObject>(target);
                for (const candidate of candidates) {
                    if (candidate.collidable !== collidable) {
                        if (intersects(target.collidable, candidate.collidable)) {
                            target.collidable.metadata.collider.onCollide(candidate.collidable);
                        }
                    }
                }
            }
        }
    }
}