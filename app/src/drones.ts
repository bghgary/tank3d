import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "./collisions";
import { ApplyCollisionForce, ApplyMovement } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Shadow } from "./shadow";
import { BarrelMetadata, Sources } from "./sources";
import { World } from "./world";

export interface Drone extends Entity {
    readonly owner: Entity;
}

export interface DroneProperties {
    speed: number;
    damage: number;
    health: number;
}

export const enum DroneBehavior {
    Attack,
    Defend,
}

export class Drones {
    private readonly _root: TransformNode;
    private readonly _sources: Sources;
    private readonly _properties: Readonly<DroneProperties>;
    private readonly _drones = new Set<DroneImpl>();

    public constructor(world: World, parent: TransformNode, properties: Readonly<DroneProperties>) {
        this._root = new TransformNode("drones", world.scene);
        this._root.parent = parent;
        this._sources = world.sources;
        this._properties = properties;

        world.collisions.register(this._drones);
    }

    public dispose(): void {
        this._root.dispose();
    }

    public get count(): number {
        return this._drones.size;
    }

    public add(owner: Entity, barrelMetadata: BarrelMetadata, createNode: (parent: TransformNode) => TransformNode): Drone {
        const size = barrelMetadata.size * 0.75;

        const forward = TmpVectors.Vector3[0];
        barrelMetadata.forward.rotateByQuaternionToRef(owner.rotation, forward);

        const position = TmpVectors.Vector3[1];
        barrelMetadata.forward.scaleToRef(barrelMetadata.length + size * 0.5, position).addInPlace(barrelMetadata.offset);
        position.rotateByQuaternionToRef(owner.rotation, position).addInPlace(owner.position);

        const initialSpeed = Math.max(Vector3.Dot(owner.velocity, forward) + this._properties.speed, 0.1);

        const node = createNode(this._root);
        node.scaling.setAll(size);

        const drone = new DroneImpl(owner, node, this._sources, size, this._properties);
        drone.position.copyFrom(position);
        drone.rotation.copyFrom(owner.rotation);
        drone.velocity.copyFrom(forward).scaleInPlace(initialSpeed);
        this._drones.add(drone);

        return drone;
    }

    public update(deltaTime: number, target: Vector3, behavior: DroneBehavior, defendRadius: number): void {
        for (const drone of this._drones) {
            drone.update(deltaTime, target, behavior, defendRadius, () => {
                this._drones.delete(drone);
            });
        }
    }
}

class DroneImpl implements Drone, Collider {
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private readonly _shadow: Shadow;
    private readonly _properties: Readonly<DroneProperties>;

    public constructor(owner: Entity, node: TransformNode, sources: Sources, size: number, properties: Readonly<DroneProperties>) {
        this.owner = owner;
        this._node = node;
        this._health = new Health(sources, node, properties.health);
        this._shadow = new Shadow(sources, node);
        this.size = size;
        this.mass = this.size * this.size;
        this._properties = properties;
    }

    // Drone
    public get displayName() { return this.owner.displayName; }
    public readonly type = EntityType.Drone;
    public readonly size: number;
    public readonly mass: number;
    public get damage() { return this._properties.damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public readonly owner: Entity;

    public update(deltaTime: number, target: Vector3, behavior: DroneBehavior, defendRadius: number, onDestroyed: () => void): void {
        this._shadow.update();

        const direction = TmpVectors.Vector3[0];
        target.subtractToRef(this.position, direction);
        const distance = direction.length();
        direction.scaleInPlace(1 / distance);

        if (behavior === DroneBehavior.Defend) {
            const position = TmpVectors.Vector3[1];
            direction.scaleToRef(-defendRadius, position).addInPlace(target);
            position.addInPlaceFromFloats(-direction.z, direction.y, direction.x);
            position.subtractToRef(this.position, direction).normalize();
        }

        const directionDecayFactor = Math.exp(-deltaTime * 10);
        direction.x = direction.x - (direction.x - this._node.forward.x) * directionDecayFactor;
        direction.z = direction.z - (direction.z - this._node.forward.z) * directionDecayFactor;
        this._node.setDirection(direction);

        const speed = this._properties.speed * Math.min(distance, 1);
        const targetVelocityX = this._node.forward.x * speed;
        const targetVelocityZ = this._node.forward.z * speed;
        const velocityDecayFactor = Math.exp(-deltaTime * 2);
        this.velocity.x = targetVelocityX - (targetVelocityX - this.velocity.x) * velocityDecayFactor;
        this.velocity.z = targetVelocityZ - (targetVelocityZ - this.velocity.z) * velocityDecayFactor;

        ApplyMovement(deltaTime, this._node.position, this.velocity);

        this._health.update(deltaTime, () => {
            this._node.dispose();
            onDestroyed();
        });
    }

    public onCollide(other: Entity): number {
        if (other.type === EntityType.Drone || other === this.owner) {
            ApplyCollisionForce(this, other);
            return 0;
        }

        this._health.takeDamage(other);
        ApplyCollisionForce(this, other);
        return 1;
    }
}
