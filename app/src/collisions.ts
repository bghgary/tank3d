import Quadtree from "@timohausmann/quadtree-js";
import { Collider } from "./colliders/collider";
import { World } from "./worlds/world";

export class Collisions {
    private readonly _quadtree: Quadtree;
    private readonly _colliders = new Set<Collider>();
    private readonly _collidedMap = new Map<Collider, Map<Collider, { time: number }>>();

    public constructor(world: World) {
        const size = world.size;
        const halfSize = size * 0.5;
        this._quadtree = new Quadtree({ x: -halfSize, y: -halfSize, width: size, height: size });
    }

    public register(collider: Collider): void {
        this._colliders.add(collider);
        collider.node.onDisposeObservable.add(() => {
            this.unregister(collider);
        });
    }

    public unregister(collider: Collider): void {
        this._colliders.delete(collider);
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

        for (const collider of this._colliders) {
            if (collider.active) {
                this._quadtree.insert(collider);
            }
        }

        for (const target of this._colliders) {
            for (const other of this._quadtree.retrieve<Collider>(target)) {
                // TODO: add callback to avoid certain collisions (e.g., lance/lancerTank, shield/shieldTank)
                if (other !== target && other.entity) {
                    if (Collider.Collide(target, other)) {
                        const otherMap = targetMap.get(target) || new Map<Collider, { time: number }>();
                        if (!otherMap.has(other)) {
                            otherMap.set(other, { time: target.onCollide(other.entity) });
                            targetMap.set(target, otherMap);
                        }
                    }
                }
            }
        }
    }
}