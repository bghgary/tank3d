import Quadtree from "@timohausmann/quadtree-js";
import { Entity } from "./entity";
import { World } from "./world";

export interface CollisionRegisterToken {
    dispose(): void;
}

export interface CollidableEntity extends Entity, Quadtree.Rect {
    getCollisionRepeatRate(other: Entity): number;
    onCollide(other: Entity): void;
}

export class Collisions {
    private readonly _quadtree: Quadtree;
    private readonly _entries = new Map<number, { entities: Iterable<CollidableEntity> }>();
    private _registerToken: number = 0;
    private readonly _collidedEntitiesMap = new Map<CollidableEntity, Map<CollidableEntity, { time: number }>>();

    public constructor(world: World) {
        const size = world.size;
        const halfSize = size * 0.5;
        this._quadtree = new Quadtree({ x: -halfSize, y: -halfSize, width: size, height: size });
    }

    public register(entities: Iterable<CollidableEntity>): CollisionRegisterToken {
        const registerToken = this._registerToken++;
        this._entries.set(registerToken, { entities: entities });
        return {
            dispose: () => this._entries.delete(registerToken)
        };
    }

    public update(deltaTime: number): void {
        const targetMap = this._collidedEntitiesMap;
        for (const [target, otherMap] of targetMap) {
            for (const [other, data] of otherMap) {
                data.time += deltaTime;
                if (data.time >= target.getCollisionRepeatRate(other)) {
                    otherMap.delete(other);
                    if (otherMap.size === 0) {
                        targetMap.delete(target);
                    }
                }
            }
        }

        this._quadtree.clear();

        const intersects = (a: CollidableEntity, b: CollidableEntity): boolean => {
            const collisionDistance = (a.size + b.size) * 0.5;
            const x0 = a.position.x, z0 = a.position.z;
            const x1 = b.position.x, z1 = b.position.z;
            const dx = x1 - x0, dz = z1 - z0;
            const sqrDistance = dx * dx + dz * dz;
            return (sqrDistance < collisionDistance * collisionDistance);
        };

        for (const entry of this._entries.values()) {
            for (const entity of entry.entities) {
                this._quadtree.insert(entity);
            }
        }

        for (const entry of this._entries.values()) {
            for (const target of entry.entities) {
                const others = this._quadtree.retrieve<CollidableEntity>(target);
                for (const other of others) {
                    if (other !== target) {
                        if (intersects(target, other)) {
                            const otherMap = targetMap.get(target) || new Map<CollidableEntity, { time: number }>();
                            if (!otherMap.has(other)) {
                                target.onCollide(other);
                                otherMap.set(other, { time: 0 });
                                targetMap.set(target, otherMap);
                            }
                        }
                    }
                }
            }
        }
    }
}