import { TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CollidableEntity } from "./collisions";
import { ApplyCollisionForce, ApplyMovement, ApplyWallClamp } from "./common";
import { Entity, EntityType } from "./entity";
import { Health } from "./health";
import { Shadow } from "./shadow";
import { BarrelMetadata, Sources } from "./sources";
import { World } from "./world";

export interface Drone extends Entity {
    readonly owner: Entity;
}

export interface DroneProperties {
    readonly speed: number;
    readonly damage: number;
    readonly health: number;
}

export class Drones {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _sources: Sources;
    private readonly _drones = new Set<DroneImpl>();

    private _properties: DroneProperties;

    public constructor(world: World, parent: TransformNode, properties: DroneProperties) {
        this._world = world;
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

        const drone = new DroneImpl(owner, node, this._sources, size, () => this._properties, this._world.pointerPosition);
        drone.position.copyFrom(position);
        drone.rotation.copyFrom(owner.rotation);
        drone.velocity.copyFrom(forward).scaleInPlace(initialSpeed);
        this._drones.add(drone);

        return drone;
    }

    public update(deltaTime: number): void {
        for (const drone of this._drones) {
            drone.update(deltaTime, this._world.size, () => {
                this._drones.delete(drone);
            });
        }
    }

    public setProperties(properties: DroneProperties): void {
        this._properties = properties;
    }
}

class DroneImpl implements Drone, CollidableEntity {
    private readonly _node: TransformNode;
    private readonly _health: Health;
    private readonly _shadow: Shadow;
    private readonly _getProperties: () => DroneProperties;
    private readonly _target: Vector3;

    public constructor(owner: Entity, node: TransformNode, sources: Sources, size: number, getProperties: () => DroneProperties, target: Vector3) {
        this.owner = owner;
        this._node = node;
        this._health = new Health(sources, node, getProperties().health);
        this._shadow = new Shadow(sources, node);
        this.size = size;
        this.mass = this.size * this.size;
        this._getProperties = getProperties;
        this._target = target;
    }

    // Drone
    public get displayName() { return this.owner.displayName; }
    public readonly type = EntityType.Drone;
    public readonly size: number;
    public readonly mass: number;
    public get damage() { return this._getProperties().damage; }
    public get position() { return this._node.position; }
    public get rotation() { return this._node.rotationQuaternion!; }
    public readonly velocity = new Vector3();

    // Quadtree.Rect
    public get x() { return this._node.position.x - this.size * 0.5; }
    public get y() { return this._node.position.z - this.size * 0.5; }
    public get width() { return this.size; }
    public get height() { return this.size; }

    public readonly owner: Entity;

    public update(deltaTime: number, worldSize: number, onDestroyed: () => void): void {
        this._shadow.update();

        ApplyMovement(deltaTime, this._node.position, this.velocity);
        ApplyWallClamp(this._node.position, this.size, worldSize + 10);

        const direction = TmpVectors.Vector3[0];
        this._target.subtractToRef(this.position, direction);
        const directionDecayFactor = Math.exp(-deltaTime * 10);
        direction.x = direction.x - (direction.x - this._node.forward.x) * directionDecayFactor;
        direction.z = direction.z - (direction.z - this._node.forward.z) * directionDecayFactor;
        this._node.setDirection(direction);

        const speed = this._getProperties().speed;
        const decayFactor = Math.exp(-deltaTime * 2);
        const targetVelocityX = this._node.forward.x * speed;
        const targetVelocityZ = this._node.forward.z * speed;
        this.velocity.x = targetVelocityX - (targetVelocityX - this.velocity.x) * decayFactor;
        this.velocity.z = targetVelocityZ - (targetVelocityZ - this.velocity.z) * decayFactor;

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
