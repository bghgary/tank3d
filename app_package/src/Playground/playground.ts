import "@babylonjs/inspector";
import { Color3, Engine, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";

class Playground {
    private static _createTank(scene: Scene, barrelDiameter: number, barrelLength: number): Mesh {
        const body = MeshBuilder.CreateSphere("tankBody", { diameter: 1 }, scene);
        const bodyMaterial = new StandardMaterial("tankBody", scene);
        bodyMaterial.diffuseColor = new Color3(0.3, 0.7, 1);
        body.material = bodyMaterial;
        const barrel = MeshBuilder.CreateCylinder("tankBarrel", { diameter: barrelDiameter, height: barrelLength }, scene);
        barrel.rotation.x = Math.PI * 0.5;
        barrel.position.z = barrelLength * 0.5;
        const barrelMaterial = new StandardMaterial("tankBarrel", scene);
        barrelMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
        barrel.material = barrelMaterial;
        const tank = Mesh.MergeMeshes([body, barrel], true, undefined, undefined, undefined, true)!;
        tank.name = "tank";
        tank.material!.name = "tank";
        return tank;
    }

    private static _createGround(scene: Scene): Mesh {
        const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
        const groundMaterial = new GridMaterial("ground", scene);
        ground.material = groundMaterial;
        return ground;
    }

    public static CreateScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
        const scene = new Scene(engine);

        const tank = this._createTank(scene, 0.45, 0.75);
        tank.position.y += 0.6;

        this._createGround(scene);

        scene.createDefaultCamera(true, undefined, true);
        scene.createDefaultLight();

        scene.debugLayer.show();

        return scene;
    }
}

export function CreatePlaygroundScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
    return Playground.CreateScene(engine, canvas);
}
