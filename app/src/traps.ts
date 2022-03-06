import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Collider } from "./collisions";
import { ApplyCollisionForce, ApplyMovement } from "./common";
import { Entity, EntityType } from "./entity";
import { decayVector3ToRef, TmpVector3 } from "./math";
import { BarrelMetadata, ProjectileMetadata } from "./metadata";
import { Shadow } from "./shadow";
import { Sources } from "./sources";
import { World } from "./worlds/world";

const MAX_DURATION = 24;

export interface Trap extends Entity {
    readonly owner: Entity;
}

export class Traps {
    private readonly _world: World;
    private readonly _root: TransformNode;
    private readonly _traps = new Set<TrapImpl>();

    public constructor(world: World) {
        this._world = world;
        this._root = new TransformNode("traps", this._world.scene);
        this._world.collisions.register(this._traps);
    }

    public add(owner: Entity, barrelNode: TransformNode, barrelMetadata: Readonly<BarrelMetadata>, trapMetadata: Readonly<ProjectileMetadata>, createNode: (parent: TransformNode) => TransformNode): Trap {
        const size = barrelMetadata.diameter * 0.9;

        const forward = barrelNode.forward;
        const position = TmpVector3[0];
        forward.scaleToRef(barrelMetadata.length + size * 0.5, position).addInPlace(barrelNode.absolutePosition);

        const initialSpeed = Vector3.Dot(owner.velocity, forward) + trapMetadata.speed;

        const node = createNode(this._root);
        node.scaling.setAll(size);

        const trap = new TrapImpl(owner, node, trapMetadata, this._world.sources, size);
        trap.position.copyFrom(position);
        trap.rotation.copyFrom(owner.rotation);
        trap.velocity.copyFrom(forward).scaleInPlace(initialSpeed);
        this._traps.add(trap);

        return trap;
    }

    public update(deltaTime: number): void {
        for (const trap of this._traps) {
            trap.update(deltaTime, () => {
                this._traps.delete(trap);
            });
        }
    }
}

class TrapImpl implements Trap, Collider {
    private readonly _node: TransformNode;
    private readonly _metadata: Readonly<ProjectileMetadata>;
    private readonly _shadow: Shadow;
    private _health: number;
    private _time = MAX_DURATION;

    public constructor(owner: Entity, node: TransformNode, metadata: Readonly<ProjectileMetadata>, sources: Sources, size: number) {
        this.owner = owner;
        this._node = node;
        this._metadata = metadata;
        this._shadow = new Shadow(sources, node);
        this._health = this._metadata.health;
        this.size = size;
    }

    // Trap
    public get displayName() { return this.owner.displayName; }
    public readonly type = EntityType.Trap;
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

    public update(deltaTime: number, onDestroy: () => void): void {
        ApplyMovement(deltaTime, this._node.position, this.velocity);

        decayVector3ToRef(this.velocity, Vector3.ZeroReadOnly, deltaTime, 2, this.velocity);

        this._shadow.update();

        if (this._health <= 0) {
            onDestroy();
            this._node.dispose();
        }

        this._time = Math.max(this._time - deltaTime, 0);
        if (this._time === 0) {
            onDestroy();
            this._node.dispose();
        }
    }

    public onCollide(other: Entity): number {
        if (this.owner.type === other.type || (other.owner && this.owner.type === other.owner.type)) {
            ApplyCollisionForce(this, other);
            return 0;
        }

        ApplyCollisionForce(this, other, 2);
        this._health -= other.damage;
        return 0.1;
    }
}
