import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { DeepImmutable } from "@babylonjs/core/types";
import { applyRecoil, findNode } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties } from "../components/weapon";
import { Entity } from "../entity";
import { TmpVector3 } from "../math";
import { BarrelProjectileMetadata } from "../metadata";
import { Bullet } from "../projectiles/bullets";
import { SingleTargetDrone } from "../projectiles/drones";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { DirectorTank } from "./directorTank";
import { TankProperties } from "./playerTank";

const SHOOT_ANGLE = 0.02 * Math.PI;

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
            if (this._reloadTime === 0 && this.target.radius === 0) {
                const direction = this.target.position.subtractToRef(this._node.position, TmpVector3[0]).normalize();
                const angle = Math.acos(Vector3.Dot(this._node.forward, direction));
                if (angle < SHOOT_ANGLE) {
                    for (const barrel of this._barrels) {
                        const bullet = barrel.shootBullet(Bullet, this.owner, this._bulletSource, this._properties, 3);
                        applyRecoil(this._recoil, bullet);
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
