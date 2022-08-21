import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Bullet } from "../projectiles/bullets";
import { Sources } from "../sources";
import { World } from "../worlds/world";
import { PlayerTank } from "./playerTank";
import { SniperTank } from "./sniperTank";

export class PoisonTank extends SniperTank {
    protected override readonly _bulletConstructor = PoisonBullet;
    protected override readonly _bulletSource = this._world.sources.bullet.tankPoison;

    public constructor(world: World, node: TransformNode, previousTank?: PlayerTank) {
        super(world, node, previousTank);
        this._bulletProperties.damage.poison = 1;
    }

    public static override Create(sources: Sources, parent?: TransformNode): TransformNode {
        return sources.create(sources.tank.poison, parent);
    }
}

class PoisonBullet extends Bullet {
    public override update(deltaTime: number, onDestroy: () => void): void {
        this._node.addRotation(0, this._velocityTarget.length() * deltaTime, 0);
        super.update(deltaTime, onDestroy);
    }
}
