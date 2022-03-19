import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { IDisposable } from "@babylonjs/core/scene";
import Quadtree from "@timohausmann/quadtree-js";
import { Entity } from "./entity";
import { World } from "./worlds/world";

export interface Collider extends Quadtree.Rect {
    readonly active: boolean;
    readonly position: Readonly<Vector3>;
    readonly size: number;
    onCollide(other: Entity): number;
}

function isEntity(collider: Collider | Entity): collider is Entity {
    return (collider as Entity).type !== undefined;
}

export class Collisions {
    private readonly _quadtree: Quadtree;
    private readonly _entries = new Map<number, { colliders: Iterable<Collider> }>();
    private _registerToken: number = 0;
    private readonly _collidedMap = new Map<Collider, Map<Collider, { time: number }>>();

    public constructor(world: World) {
        const size = world.size;
        const halfSize = size * 0.5;
        this._quadtree = new Quadtree({ x: -halfSize, y: -halfSize, width: size, height: size });
    }

    public register(colliders: Iterable<Collider>): IDisposable {
        const registerToken = this._registerToken++;
        this._entries.set(registerToken, { colliders: colliders });
        return {
            dispose: () => this._entries.delete(registerToken)
        };
    }

    public update(deltaTime: number): void {
        const targetMap = this._collidedMap;
        for (const [target, otherMap] of targetMap) {
            for (const [other, data] of otherMap) {
                data.time -= deltaTime;
                if (data.time <= 0) {
                    otherMap.delete(other);
                    if (otherMap.size === 0) {
                        targetMap.delete(target);
                    }
                }
            }
        }

        this._quadtree.clear();

        const intersects = (a: Collider, b: Collider): boolean => {
            const collisionDistance = (a.size + b.size) * 0.5;
            const distanceSquared = Vector3.DistanceSquared(a.position, b.position);
            return (distanceSquared < collisionDistance * collisionDistance);
        };

        for (const entry of this._entries.values()) {
            for (const collider of entry.colliders) {
                if (collider.active) {
                    this._quadtree.insert(collider);
                }
            }
        }

        for (const entry of this._entries.values()) {
            for (const target of entry.colliders) {
                const others = this._quadtree.retrieve<Collider>(target);
                for (const other of others) {
                    if (other !== target && isEntity(other)) {
                        if (intersects(target, other)) {
                            const otherMap = targetMap.get(target) || new Map<Collider, { time: number }>();
                            if (!otherMap.has(other)) {
                                otherMap.set(other, { time: target.onCollide(other) });
                                targetMap.set(target, otherMap);
                            }
                        }
                    }
                }
            }
        }
    }
}