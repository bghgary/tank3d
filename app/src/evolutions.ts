import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "./sources";
import { ArtilleryTank } from "./tanks/artilleryTank";
import { AssassinTank } from "./tanks/assassinTank";
import { BaseTank } from "./tanks/baseTank";
import { BlasterTank } from "./tanks/blasterTank";
import { BomberTank } from "./tanks/bomberTank";
import { BuilderTank } from "./tanks/builderTank";
import { CruiserTank } from "./tanks/cruiserTank";
import { DestroyerTank } from "./tanks/destroyerTank";
import { DetectorTank } from "./tanks/detectorTank";
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
import { ShieldTank } from "./tanks/shieldTank";
import { SniperTank } from "./tanks/sniperTank";
import { SpawnerTank } from "./tanks/spawnerTank";
import { SpinnerTank } from "./tanks/spinnerTank";
import { SwarmerTank } from "./tanks/swarmerTank";
import { TrapperTank } from "./tanks/trapperTank";
import { TwinSniperTank } from "./tanks/twinSniperTank";
import { TwinTank } from "./tanks/twinTank";
import { UnderseerTank } from "./tanks/underseerTank";
import { World } from "./worlds/world";

interface TankConstructor {
    prototype: PlayerTank;
    new(world: World, node: TransformNode, previousTank?: PlayerTank): PlayerTank;
    Create(sources: Sources, parent?: TransformNode): TransformNode;
}

export interface EvolutionNode {
    readonly Tank: TankConstructor;
    readonly children?: Array<EvolutionNode>;
}

export const EvolutionRootNode: EvolutionNode = {
    Tank: BaseTank,
    children: [{
        Tank: SniperTank,
        children: [{
            Tank: AssassinTank,
        }, {
            Tank: TwinSniperTank,
        }, {
            Tank: GatlingGunTank,
        }, {
            Tank: HunterTank,
        }, {
            Tank: PoisonTank,
        }, {
            Tank: SearcherTank,
        }]
    }, {
        Tank: TwinTank,
        children: [{
            Tank: TwinSniperTank,
        }]
    }, {
        Tank: FlankGuardTank,
        children: [{
            Tank: ShieldTank,
        }, {
            Tank: SpinnerTank,
        }]
    }, {
        Tank: PounderTank,
        children: [{
            Tank: LauncherTank,
        }, {
            Tank: DestroyerTank,
        }, {
            Tank: BuilderTank,
        }, {
            Tank: ArtilleryTank,
        }, {
            Tank: BlasterTank,
        }, {
            Tank: BomberTank,
        }]
    }, {
        Tank: DirectorTank,
        children: [{
            Tank: SwarmerTank,
        }, {
            Tank: OverseerTank,
        }, {
            Tank: SpawnerTank,
        }, {
            Tank: DetectorTank,
        }, {
            Tank: CruiserTank,
        }, {
            Tank: UnderseerTank,
        }]
    }, {
        Tank: TrapperTank,
        children: [{
            Tank: BuilderTank,
        }]
    }, {
        Tank: MachineGunTank,
        children: [{
            Tank: GatlingGunTank,
        }, {
            Tank: BlasterTank,
        }]
    }, {
        Tank: LancerTank,
        children: [{
            Tank: ShieldTank,
        }, {
            Tank: SpinnerTank,
        }]
    }],
};
