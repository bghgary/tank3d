import { Engine } from "@babylonjs/core/Engines/engine";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Bosses } from "../bosses";
import { Crashers } from "../crashers";
import { CreateGridMaterial } from "../materials/gridMaterial";
import { Player } from "../player";
import { Shapes } from "../shapes";
import { World } from "./world";

export class StandardWorld extends World {
    private _shapes: Shapes;
    private _crashers: Crashers;
    private _bosses: Bosses;
    private _player: Player;

    public constructor(engine: Engine) {
        super(engine, 10);

        this._shapes = new Shapes(this, 0);
        this._crashers = new Crashers(this, 1);
        this._bosses = new Bosses(this);
        this._player = new Player(this);
    }

    protected override _update(deltaTime: number): void {
        this._shapes.update(deltaTime);
        this._player.update(deltaTime);
        this._crashers.update(deltaTime, this._player);
        this._bosses.update(deltaTime, this._player);
    }

    protected override _createGround(): Mesh {
        const ground = super._createGround();

        const grid = MeshBuilder.CreateGround("grid", { width: 1000, height: 1000 }, this.scene);
        grid.position.y = -1;
        grid.doNotSyncBoundingInfo = true;
        grid.alwaysSelectAsActiveMesh = true;
        grid.material = CreateGridMaterial(this.scene, this.size);
        grid.parent = ground;

        return ground;
    }
}
