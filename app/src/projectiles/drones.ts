import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ApplyCollisionForce, ApplyMovement } from "../common";
import { Entity, EntityType } from "../entity";
import { Health } from "../health";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { BarrelMetadata, ProjectileMetadata } from "../metadata";
import { Shadow } from "../shadow";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { Projectile, Projectiles } from "./projectiles";

export class Drones extends Projectiles {
    private readonly _drones: Set<Drone>;
    private readonly _metadata: Readonly<ProjectileMetadata>;

    public constructor(world: World, parent: TransformNode, metadata: Readonly<ProjectileMetadata>) {
        const drones = new Set<Drone>();
        super(world, "drones", drones);
        this._root.parent = parent;
        this._drones = drones;
        this._metadata = metadata;
    }

    public get count(): number {
        return this._drones.size;
    }

    public add(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, createNode: (parent: TransformNode) => TransformNode): Drone {
        const drone = new Drone(owner, barrelNode, barrelMetadata, createNode(this._root), this._metadata, this._world.sources);
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

class Drone extends Projectile {
    private readonly _shadow: Shadow;
    private readonly _health: Health;

    public constructor(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, droneNode: TransformNode, droneMetadata: Readonly<ProjectileMetadata>, sources: Sources) {
        super(owner, barrelNode, barrelMetadata, droneNode, droneMetadata);
        this._shadow = new Shadow(sources, this._node);
        this._health = new Health(sources, this._node, this._metadata.health);
    }

    public type = EntityType.Drone;

    public update(deltaTime: number, target: Vector3, radius: number, onDestroy: () => void): void {
        ApplyMovement(deltaTime, this._node.position, this.velocity);

        const direction = TmpVector3[0];
        target.subtractToRef(this._node.position, direction);
        const distance = direction.length();
        direction.scaleInPlace(1 / Math.max(distance, 0.01));

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
