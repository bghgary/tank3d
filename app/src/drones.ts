import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IDisposable } from "@babylonjs/core/scene";
import { Collider } from "./collisions";
import { ApplyCollisionForce, ApplyMovement } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { decayVector3ToRef, TmpVector3 } from "./math";
import { BarrelMetadata, ProjectileMetadata } from "./metadata";
import { Shadow } from "./shadow";
import { Sources } from "./sources";
import { World } from "./world";

export interface Drone extends Entity {
    readonly owner: Entity;
}

export class Drones {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _metadata: Readonly<ProjectileMetadata>;
    private readonly _drones = new Set<DroneImpl>();
    private readonly _collisionToken: IDisposable;

    public constructor(world: World, parent: TransformNode, metadata: Readonly<ProjectileMetadata>) {
        this._world = world;

        this._root = new TransformNode("drones", this._world.scene);
        this._root.parent = parent;

        this._metadata = metadata;

        this._collisionToken = this._world.collisions.register(this._drones);
    }

    public dispose(): void {
        this._root.dispose();
        this._collisionToken.dispose();
    }

    public get count(): number {
        return this._drones.size;
    }

    public add(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, createNode: (parent: TransformNode) => TransformNode): Drone {
        const size = barrelMetadata.diameter * 0.75;

        const forward = barrelNode.forward;
        const position = TmpVector3[0];
        forward.scaleToRef(barrelMetadata.length + size * 0.5, position).addInPlace(barrelNode.absolutePosition);

        const initialSpeed = Math.max(Vector3.Dot(owner.velocity, forward) + this._metadata.speed, 0.1);

        const node = createNode(this._root);
        node.scaling.setAll(size);

        const drone = new DroneImpl(owner, node, this._metadata, this._world.sources, size);
        drone.position.copyFrom(position);
        drone.rotation.copyFrom(owner.rotation);
        drone.velocity.copyFrom(forward).scaleInPlace(initialSpeed);
        this._drones.add(drone);

        return drone;
    }

    public update(deltaTime: number, target: Vector3, radius: number): void {
        for (const drone of this._drones) {
            drone.update(deltaTime, target, radius, () => {
                this._drones.delete(drone);
            });
        }
    }
}

class DroneImpl implements Drone, Collider {
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private readonly _shadow: Shadow;
    private readonly _metadata: Readonly<ProjectileMetadata>;

    public constructor(owner: Entity, node: TransformNode, metadata: Readonly<ProjectileMetadata>, sources: Sources, size: number) {
        this.owner = owner;
        this._node = node;
        this._metadata = metadata;
        this._health = new Health(sources, node, this._metadata.health);
        this._shadow = new Shadow(sources, node);
        this.size = size;
    }

    // Drone
    public get displayName() { return this.owner.displayName; }
    public readonly type = EntityType.Drone;
    public get active() { return this._node.isEnabled(); }
    public readonly size: number;
    public get mass() { return this.size * this.size; }
    public get damage() { return this._metadata.damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public readonly owner: Entity;

    public update(deltaTime: number, target: Vector3, radius: number, onDestroy: () => void): void {
        ApplyMovement(deltaTime, this._node.position, this.velocity);

        const direction = TmpVector3[0];
        target.subtractToRef(this._node.position, direction);
        const distance = direction.length();
        direction.scaleInPlace(1 / distance);

        if (radius > 0) {
            const position = TmpVector3[1];
            direction.scaleToRef(-radius, position).addInPlace(target);
            position.addInPlaceFromFloats(-direction.z, direction.y, direction.x);
            position.subtractToRef(this._node.position, direction).normalize();
        }

        const forward = this._node.forward;
        decayVector3ToRef(forward, direction, deltaTime, 10, direction);
        this._node.setDirection(direction.normalize());

        const speed = this._metadata.speed * Math.min(distance, 1);
        const targetVelocity = TmpVector3[2].copyFrom(forward).scaleInPlace(speed);
        decayVector3ToRef(this.velocity, targetVelocity, deltaTime, 2, this.velocity);

        this._shadow.update();

        this._health.update(deltaTime, () => {
            onDestroy();
            this._node.dispose();
        });
    }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            if (other.type == EntityType.Bullet) {
                return 1;
            }

            ApplyCollisionForce(this, other);
            return 0;
        }

        ApplyCollisionForce(this, other);
        this._health.takeDamage(other);
        return 0.2;
    }
}
