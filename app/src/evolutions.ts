import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "./sources";
import { ArtilleryTank } from "./tanks/artilleryTank";
import { AssassinTank } from "./tanks/assassinTank";
import { BaseTank } from "./tanks/baseTank";
import { BlasterTank } from "./tanks/blasterTank";
import { BomberTank } from "./tanks/bomberTank";
import { BuilderTank } from "./tanks/builderTank";
import { DestroyerTank } from "./tanks/destroyerTank";
import { DirectorTank } from "./tanks/directorTank";
import { FlankGuardTank } from "./tanks/flankGuardTank";
import { GatlingGunTank } from "./tanks/gatlingGunTank";
import { HunterTank } from "./tanks/hunterTank";
import { LancerTank } from "./tanks/lancerTank";
import { LauncherTank } from "./tanks/launcherTank";
import { MachineGunTank } from "./tanks/machineGunTank";
import { OverseerTank } from "./tanks/overseerTank";
import { PlayerTank } from "./tanks/playerTank";
import { PoisonTank } from "./tanks/poisonTank";
import { PounderTank } from "./tanks/pounderTank";
import { SearcherTank } from "./tanks/searcherTank";
import { SniperTank } from "./tanks/sniperTank";
import { SpawnerTank } from "./tanks/spawnerTank";
import { SwarmerTank } from "./tanks/swarmerTank";
import { TrapperTank } from "./tanks/trapperTank";
import { TwinSniperTank } from "./tanks/twinSniperTank";
import { TwinTank } from "./tanks/twinTank";
import { World } from "./worlds/world";

interface TankConstructor {
    prototype: PlayerTank;
    new(world: World, node: TransformNode, previousTank?: PlayerTank): PlayerTank;
    CreateMesh(sources: Sources, parent?: TransformNode): AbstractMesh;
}

export interface EvolutionNode {
    readonly Tank: TankConstructor;
    readonly children: Array<EvolutionNode>;
}

export const EvolutionRootNode: EvolutionNode = {
    Tank: BaseTank,
    children: [{
        Tank: SniperTank,
        children: [{
            Tank: AssassinTank,
            children: [],
        }, {
            Tank: TwinSniperTank,
            children: [],
        }, {
            Tank: GatlingGunTank,
            children: [],
        }, {
            Tank: HunterTank,
            children: [],
        }, {
            Tank: PoisonTank,
            children: [],
        }, {
            Tank: SearcherTank,
            children: [],
        }]
    }, {
        Tank: TwinTank,
        children: [{
            Tank: TwinSniperTank,
            children: [],
        }]
    }, {
        Tank: FlankGuardTank,
        children: []
    }, {
        Tank: PounderTank,
        children: [{
            Tank: LauncherTank,
            children: []
        }, {
            Tank: DestroyerTank,
            children: []
        }, {
            Tank: BuilderTank,
            children: []
        }, {
            Tank: ArtilleryTank,
            children: []
        }, {
            Tank: BlasterTank,
            children: [],
        }, {
            Tank: BomberTank,
            children: [],
        }]
    }, {
        Tank: DirectorTank,
        children: [{
            Tank: SwarmerTank,
            children: []
        }, {
            Tank: OverseerTank,
            children: []
        }, {
            Tank: SpawnerTank,
            children: []
        }]
    }, {
        Tank: TrapperTank,
        children: [{
            Tank: BuilderTank,
            children: []
        }]
    }, {
        Tank: MachineGunTank,
        children: [{
            Tank: GatlingGunTank,
            children: [],
        }, {
            Tank: BlasterTank,
            children: [],
        }]
    }, {
        Tank: LancerTank,
        children: []
    }],
};
