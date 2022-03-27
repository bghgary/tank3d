import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { applyRecoil, findNode } from "../common";
import { Barrel } from "../components/barrel";
import { WeaponProperties, WeaponPropertiesWithMultiplier } from "../components/weapon";
import { Entity } from "../entity";
import { MissileMetadata } from "../metadata";
import { Missile } from "../projectiles/missiles";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { MissileTank } from "./missileTank";
import { PlayerTank, TankProperties } from "./playerTank";

interface PlayerTankInternal extends Entity {
    _properties: Readonly<TankProperties>;
}

export class LauncherTank extends MissileTank {
    protected override readonly _missileConstructor = LauncherMissile;

    public constructor(world: World, parent: TransformNode, previousTank?: PlayerTank) {
        super(world, LauncherTank.CreateMesh(world.sources, parent), world.sources.missile.launcherTank, previousTank);
    }

    public static CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh {
        return sources.create(sources.tank.launcher, parent);
    }
}

class LauncherMissile extends Missile {
    private readonly _barrels: Array<Barrel>;
    private readonly _createBulletNode: (parent: TransformNode) => TransformNode;
    private readonly _bulletProperties: Readonly<WeaponProperties>;
    private readonly _getReloadTime: () => number;
    private _reloadTime: number;
    private _recoil = new Vector3();

    public constructor(owner: Entity, barrelNode: TransformNode, missileNode: TransformNode, properties: Readonly<WeaponProperties>, duration: number, world: World) {
        super(owner, barrelNode, missileNode, properties, duration, world);

        const missileMetadata = missileNode.metadata as MissileMetadata;
        this._barrels = missileMetadata.barrels.map((name) => new Barrel(findNode(missileNode, name)));
        this._createBulletNode = (parent) => this._world.sources.create(this._world.sources.bullet.tank, parent);
        this._bulletProperties = new WeaponPropertiesWithMultiplier(this._properties, missileMetadata.multiplier);
        this._getReloadTime = () => (owner as PlayerTankInternal)._properties.reloadTime * (missileMetadata.reloadMultiplier || 0);
        this._reloadTime = this._getReloadTime() * 0.5;
    }

    public override update(deltaTime: number, onDestroy: () => void): void {
        if (this._reloadTime === 0) {
            for (const barrel of this._barrels) {
                const bullet = barrel.shootBullet(this._world.bullets, this.owner, this._createBulletNode, this._bulletProperties, 2);
                applyRecoil(this._recoil, bullet);
            }

            this._reloadTime = this._getReloadTime();
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
