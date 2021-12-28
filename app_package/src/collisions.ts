import Quadtree from "@timohausmann/quadtree-js";
import { Entity } from "./entity";
import { World } from "./world";

// REVIEW: copy Quadtree and make it use Entity directly to prevent allocations?

interface QuadtreeObject extends Quadtree.Rect {
    entity: Entity;
}

export class Collisions {
    private readonly _quadtree: Quadtree;
    private readonly _entries = new Array<{
        entities: Iterable<Entity>;
    }>();

    public constructor(world: World) {
        const size = world.size;
        const halfSize = size * 0.5;
        this._quadtree = new Quadtree({ x: -halfSize, y: -halfSize, width: size, height: size });

        world.scene.onAfterAnimationsObservable.add(() => {
            this.update();
        });
    }

    public register(entities: Iterable<Entity>): void {
        this._entries.push({ entities: entities });
    }

    public update(): void {
        this._quadtree.clear();

        const objectFromEntity = (entity: Entity): QuadtreeObject => {
            const position = entity.position;
            const size = entity.metadata.size;
            const halfSize = size * 0.5;
            return {
                x: position.x - halfSize,
                y: position.z - halfSize,
                width: size,
                height: size,
                entity: entity
            };
        };

        const intersects = (a: Entity, b: Entity): boolean => {
            const collisionDistance = (a.metadata.size + b.metadata.size) * 0.5;
            const x0 = a.position.x, z0 = a.position.z;
            const x1 = b.position.x, z1 = b.position.z;
            const dx = x1 - x0, dz = z1 - z0;
            const sqrDistance = dx * dx + dz * dz;
            return (sqrDistance < collisionDistance * collisionDistance);
        };

        for (const entry of this._entries) {
            for (const entity of entry.entities) {
                this._quadtree.insert(objectFromEntity(entity));
            }
        }

        for (const entry of this._entries) {
            for (const entity of entry.entities) {
                const target = objectFromEntity(entity);
                const candidates = this._quadtree.retrieve<QuadtreeObject>(target);
                for (const candidate of candidates) {
                    if (candidate.entity !== entity) {
                        if (intersects(target.entity, candidate.entity)) {
                            target.entity.metadata.onCollide(candidate.entity);
                        }
                    }
                }
            }
        }
    }
}