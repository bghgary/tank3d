import Quadtree from "@timohausmann/quadtree-js";
import { Entity } from "./entity";
import { World } from "./world";

const COLLISION_REPEAT_RATE = 1;

export function ApplyCollisionForce(target: Entity, other: Entity, strength = 1): void {
    const position = target.position;
    const velocity = target.velocity;
    const dx = position.x - other.position.x;
    const dz = position.z - other.position.z;
    const factor = strength * other.mass / (target.mass + other.mass) / Math.sqrt(dx * dx + dz * dz);
    velocity.x += dx * factor;
    velocity.z += dz * factor;
}

export interface CollidableEntity extends Entity, Quadtree.Rect {
    readonly onCollide: (other: Entity) => void;
}

export class Collisions {
    private readonly _quadtree: Quadtree;
    private readonly _entries = new Array<{ entities: Iterable<CollidableEntity> }>();
    private readonly _collidedEntitiesMap = new Map<CollidableEntity, Map<CollidableEntity, { time: number }>>();

    public constructor(world: World) {
        const size = world.size;
        const halfSize = size * 0.5;
        this._quadtree = new Quadtree({ x: -halfSize, y: -halfSize, width: size, height: size });

        world.scene.onAfterAnimationsObservable.add(() => {
            this._update(world.scene.deltaTime * 0.001);
        });
    }

    public register(entities: Iterable<CollidableEntity>): void {
        this._entries.push({ entities: entities });
    }

    private _update(deltaTime: number): void {
        const targetMap = this._collidedEntitiesMap;
        for (const [target, candidateMap] of targetMap) {
            for (const [candidate, data] of candidateMap) {
                data.time += deltaTime;
                if (data.time >= COLLISION_REPEAT_RATE) {
                    candidateMap.delete(candidate);
                    if (candidateMap.size === 0) {
                        targetMap.delete(target);
                    }
                }
            }
        }

        this._quadtree.clear();

        const intersects = (a: Entity, b: Entity): boolean => {
            const collisionDistance = (a.size + b.size) * 0.5;
            const x0 = a.position.x, z0 = a.position.z;
            const x1 = b.position.x, z1 = b.position.z;
            const dx = x1 - x0, dz = z1 - z0;
            const sqrDistance = dx * dx + dz * dz;
            return (sqrDistance < collisionDistance * collisionDistance);
        };

        for (const entry of this._entries) {
            for (const entity of entry.entities) {
                this._quadtree.insert(entity);
            }
        }

        for (const entry of this._entries) {
            for (const target of entry.entities) {
                const candidates = this._quadtree.retrieve<CollidableEntity>(target);
                for (const candidate of candidates) {
                    if (candidate !== target) {
                        if (intersects(target, candidate)) {
                            const candidateMap = targetMap.get(target) || new Map<CollidableEntity, { time: number }>();
                            if (!candidateMap.has(candidate)) {
                                target.onCollide(candidate);
                                candidateMap.set(candidate, { time: 0 });
                                targetMap.set(target, candidateMap);
                            }
                        }
                    }
                }
            }
        }
    }
}