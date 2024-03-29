import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { findNode } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { BarrelProjectileMetadata } from "../metadata";
import { Bullet } from "../projectiles/bullets";
import { SingleTargetDrone } from "../projectiles/drones";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { DirectorTank } from "./directorTank";
import { TankProperties } from "./playerTank";

export class SpawnerTank extends DirectorTank {
    protected override readonly _maxDroneCount: number = 3;
    protected override readonly _droneConstructor = SpawnerDrone;
    protected override readonly _droneSource = this._world.sources.drone.tankSpawner;

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.spawner, parent);
    }
}

interface PlayerTankInternal extends Entity {
    _properties: DeepImmutable<TankProperties>;
}

class SpawnerDrone extends SingleTargetDrone {
    private readonly _barrels: Array<Barrel>;
    private readonly _bulletSource: TransformNode;
    private readonly _getReloadTime: () => number;
    private _reloadTime = 0;
    private _recoil = new Vector3();

    public constructor(world: World, owner: Entity, node: TransformNode, barrelNode: TransformNode, properties: DeepImmutable<WeaponProperties>, duration: number) {
        super(world, owner, node, barrelNode, properties, duration);

        const metadata = node.metadata as BarrelProjectileMetadata;
        this._barrels = metadata.barrels.map((name) => new Barrel(world, findNode(node, name)));
        this._bulletSource = world.sources.bullet.tank;
        this._getReloadTime = () => (owner as PlayerTankInternal)._properties.reloadTime * (metadata.reloadMultiplier || 1);
        this._reloadTime = this._getReloadTime() * 0.5;
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        if (this.target) {
            if (this._reloadTime === 0 && this.target.defendRadius === 0) {
                const angle = Math.acos(Vector3.Dot(this._node.forward, this._targetDirection));
                const maxAngle = Math.atan(this.target.size / this._targetDistance);
                if (angle < maxAngle) {
                    for (const barrel of this._barrels) {
                        barrel.shootBullet(Bullet, this.owner, this._bulletSource, this._properties, 3, this._recoil);
                    }

                    this._reloadTime = this._getReloadTime();
                }
            }
        }

        for (const barrel of this._barrels) {
            barrel.update(deltaTime);
        }

        this._reloadTime = Math.max(this._reloadTime - deltaTime, 0);

        this.velocity.subtractInPlace(this._recoil);
        this._recoil.setAll(0);

        super.update(deltaTime, onDestroy);
    }
}
