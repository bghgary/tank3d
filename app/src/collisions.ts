import Quadtree from "@timohausmann/quadtree-js";
import { Collidable, Collider, EntityCollider, ProximityCollider } from "./colliders/colliders";
import { Entity } from "./entity";
import { World } from "./worlds/world";

function moveBy(entity: Entity, dx: number, dz: number): void {
    if (entity.attachment) {
        entity.owner!.position.x += dx;
        entity.owner!.position.z += dz;
    } else {
        entity.position.x += dx;
        entity.position.z += dz;
    }
}

function isEntityCollider(collider: Collider): collider is EntityCollider {
    return !!(collider as EntityCollider).entity;
}

function applyCollisionForce(target: Entity, other: Entity): void {
    const dx = target.position.x - other.position.x;
    const dz = target.position.z - other.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const factor = other.mass / (target.mass + other.mass) * Math.min((target.size + other.size) / distance, 20);
    target.velocity.x += dx * factor;
    target.velocity.z += dz * factor;
}

function applyImpenetrability(entity1: Entity, entity2: Entity): void {
    if (entity1.impenetrable || entity2.impenetrable) {
        const dx = entity1.position.x - entity2.position.x;
        const dz = entity1.position.z - entity2.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const contactDistance = (entity1.size + entity2.size) * 0.5;
        if (distance < contactDistance) {
            const factor = contactDistance / distance - 1;
            const totalMass = entity1.mass + entity2.mass;
            const factor1 = factor * entity2.mass / totalMass;
            moveBy(entity1, dx * factor1, dz * factor1);
            const factor2 = factor * entity1.mass / totalMass;
            moveBy(entity2, -dx * factor2, -dz * factor2);
        }
    }
}

export class Collisions {
    private readonly _quadtree: Quadtree;
    private readonly _proximityColliders = new Set<ProximityCollider>();
    private readonly _entityColliders = new Set<EntityCollider>();
    private readonly _timeMap = new Map<Entity, { lastCollided: Entity, time: number }>();

    public constructor(world: World) {
        const size = world.size;
        const halfSize = size * 0.5;
        this._quadtree = new Quadtree({ x: -halfSize, y: -halfSize, width: size, height: size });
    }

    public registerProximity(collider: ProximityCollider): void {
        this._proximityColliders.add(collider);
        collider.node.onDisposeObservable.add(() => {
            this.unregisterProximity(collider);
        });
    }

    public unregisterProximity(collider: ProximityCollider): void {
        this._proximityColliders.delete(collider);
    }

    public registerEntity(collider: EntityCollider): void {
        this._entityColliders.add(collider);
        collider.node.onDisposeObservable.add(() => {
            this.unregisterEntity(collider);
        });
    }

    public unregisterEntity(collider: EntityCollider): void {
        this._entityColliders.delete(collider);
    }

    public update(deltaTime: number): void {
        for (const [target, data] of this._timeMap) {
            if ((data.time -= deltaTime) <= 0) {
                this._timeMap.delete(target);
            }
        }

        for (const collider of this._proximityColliders) {
            this._quadtree.insert(collider);
        }

        for (const collider of this._entityColliders) {
            if (collider.entity.active) {
                this._quadtree.insert(collider);
            }
        }

        for (const collider1 of this._proximityColliders) {
            for (const collider2 of this._quadtree.retrieve<Collider>(collider1)) {
                if (collider1 !== collider2 && isEntityCollider(collider2)) {
                    if (collider1.preCollide(collider2.entity) && Collider.Collide(collider1, collider2)) {
                        collider1.postCollide(collider2.entity);
                    }
                }
            }
        }

        const collided = new Set<Collider>();
        for (const collider1 of this._entityColliders) {
            if (!collider1.entity.active) {
                continue;
            }

            for (const collider2 of this._quadtree.retrieve<Collider>(collider1)) {
                if (collider1 !== collider2 && isEntityCollider(collider2) && !collided.has(collider1)) {
                    const preCollide1 = collider1.entity.preCollide(collider2.entity);
                    const preCollide2 = collider2.entity.preCollide(collider1.entity);
                    if (preCollide1 || preCollide2) {
                        if (Collider.Collide(collider1, collider2)) {
                            collided.add(collider2);

                            if (preCollide1) {
                                this._postCollide(collider1.entity, collider2.entity);
                            }

                            if (preCollide2) {
                                this._postCollide(collider2.entity, collider1.entity);
                            }

                            applyImpenetrability(collider1.entity, collider2.entity);
                        }
                    }
                }
            }
        }

        this._quadtree.clear();
    }

    private _postCollide(target: Entity & Collidable, other: Entity): void {
        const data = this._timeMap.get(target);
        if (!data || data.lastCollided !== other) {
            applyCollisionForce(target, other);
            const time = target.postCollide(other);
            if (time > 0) {
                this._timeMap.set(target, { lastCollided: other, time: time });
            }
        }
    }
}