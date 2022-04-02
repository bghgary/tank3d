import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyCollisionForce, applyMovement } from "../common";
import { BarHealth } from "../components/health";
import { Shadow } from "../components/shadow";
import { WeaponProperties } from "../components/weapon";
import { Entity, EntityType } from "../entity";
import { decayVector3ToRef, TmpVector3 } from "../math";
import { World } from "../worlds/world";
import { Projectile, Projectiles } from "./projectiles";

export class Drones extends Projectiles<Drone> {
    private readonly _properties: DeepImmutable<WeaponProperties>;

    public constructor(world: World, parent: TransformNode, properties: DeepImmutable<WeaponProperties>) {
        super(world, "drones");
        this._root.parent = parent;
        this._properties = properties;
    }

    public get count(): number {
        return this._projectiles.size;
    }

    public add(owner: Entity, barrelNode: TransformNode, source: Mesh): Drone {
        const node = this._world.sources.create(source, this._root);
        const drone = new Drone(this._world, barrelNode, owner, node, this._properties);
        this._projectiles.add(drone);
        return drone;
    }

    public update(deltaTime: number, target: Vector3, radius: number): void {
        for (const projectile of this._projectiles) {
            projectile.update(deltaTime, target, radius, () => {
                this._projectiles.delete(projectile);
            });
        }
    }
}

class Drone extends Projectile {
    private readonly _shadow: Shadow;
    private readonly _health: BarHealth;

    public constructor(world: World, barrelNode: TransformNode, owner: Entity, node: TransformNode, properties: DeepImmutable<WeaponProperties>) {
        super(barrelNode, owner, node, properties);
        this._shadow = new Shadow(world.sources, this._node);
        this._health = new BarHealth(world.sources, this._node, this._properties.health);
    }

    public type = EntityType.Drone;

    public update(deltaTime: number, target: Vector3, radius: number, onDestroy: () => void): void {
        applyMovement(deltaTime, this._node.position, this.velocity);

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

        const speed = this._properties.speed * Math.min(distance, 1);
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

            applyCollisionForce(this, other);
            return 0;
        }

        applyCollisionForce(this, other);
        this._health.takeDamage(other);
        return other.damage.time;
    }
}
