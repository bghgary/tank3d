import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Sources } from "./sources";
import { ArtilleryTank } from "./tanks/artilleryTank";
import { AssassinTank } from "./tanks/assassinTank";
import { AutoTwoTank } from "./tanks/autoTwoTank";
import { BaseTank } from "./tanks/baseTank";
import { BlasterTank } from "./tanks/blasterTank";
import { BomberTank } from "./tanks/bomberTank";
import { BuilderTank } from "./tanks/builderTank";
import { DeceiverTank } from "./tanks/deceiverTank";
import { DestroyerTank } from "./tanks/destroyerTank";
import { DetectorTank } from "./tanks/detectorTank";
import { DirectorTank } from "./tanks/directorTank";
import { DoubleTwinTank } from "./tanks/doubleTwinTank";
import { FlankGuardTank } from "./tanks/flankGuardTank";
import { GatlingGunTank } from "./tanks/gatlingGunTank";
import { GrowerTank } from "./tanks/growerTank";
import { GunnerTank } from "./tanks/gunnerTank";
import { HunterTank } from "./tanks/hunterTank";
import { InfectorTank } from "./tanks/infectorTank";
import { JavelinTank } from "./tanks/javelinTank";
import { LancerTank } from "./tanks/lancerTank";
import { LauncherTank } from "./tanks/launcherTank";
import { MachineGunTank } from "./tanks/machineGunTank";
import { OverseerTank } from "./tanks/overseerTank";
import { PlayerTank } from "./tanks/playerTank";
import { PoisonTank } from "./tanks/poisonTank";
import { PounderTank } from "./tanks/pounderTank";
import { PropellerTank } from "./tanks/propellerTank";
import { QuadTank } from "./tanks/quadTank";
import { ReflectorTank } from "./tanks/reflectorTank";
import { RevolutionistTank } from "./tanks/revolutionistTank";
import { SearcherTank } from "./tanks/searcherTank";
import { ShieldTank } from "./tanks/shieldTank";
import { SniperTank } from "./tanks/sniperTank";
import { SpawnerTank } from "./tanks/spawnerTank";
import { SpinnerTank } from "./tanks/spinnerTank";
import { SprayerTank } from "./tanks/sprayerTank";
import { SwarmerTank } from "./tanks/swarmerTank";
import { TrapperTank } from "./tanks/trapperTank";
import { TripletTank } from "./tanks/tripletTank";
import { TwinMachineTank } from "./tanks/twinMachineTank";
import { TwinSniperTank } from "./tanks/twinSniperTank";
import { TwinTank } from "./tanks/twinTank";
import { WarshipTank } from "./tanks/warshipTank";
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
    children: [
        {
            Tank: SniperTank,
            children: [
                {
                    Tank: AssassinTank,
                },
                {
                    Tank: TwinSniperTank,
                },
                {
                    Tank: GatlingGunTank,
                },
                {
                    Tank: HunterTank,
                },
                {
                    Tank: PoisonTank,
                },
                {
                    Tank: SearcherTank,
                },
                {
                    Tank: ReflectorTank,
                },
            ],
        },
        {
            Tank: TwinTank,
            children: [
                {
                    Tank: TwinSniperTank,
                },
                {
                    Tank: DoubleTwinTank,
                },
                {
                    Tank: TripletTank,
                },
                {
                    Tank: GunnerTank,
                },
                {
                    Tank: TwinMachineTank,
                },
            ],
        },
        {
            Tank: FlankGuardTank,
            children: [
                {
                    Tank: ShieldTank,
                },
                {
                    Tank: SpinnerTank,
                },
                {
                    Tank: PropellerTank,
                },
                {
                    Tank: DoubleTwinTank,
                },
                {
                    Tank: AutoTwoTank,
                },
                {
                    Tank: WarshipTank,
                },
                {
                    Tank: QuadTank,
                },
                {
                    Tank: RevolutionistTank,
                },
            ],
        },
        {
            Tank: PounderTank,
            children: [
                {
                    Tank: LauncherTank,
                },
                {
                    Tank: DestroyerTank,
                },
                {
                    Tank: BuilderTank,
                },
                {
                    Tank: ArtilleryTank,
                },
                {
                    Tank: BlasterTank,
                },
                {
                    Tank: BomberTank,
                },
            ],
        },
        {
            Tank: DirectorTank,
            children: [
                {
                    Tank: SwarmerTank,
                },
                {
                    Tank: OverseerTank,
                },
                {
                    Tank: SpawnerTank,
                },
                {
                    Tank: DetectorTank,
                },
                {
                    Tank: WarshipTank,
                },
                {
                    Tank: InfectorTank,
                },
            ],
        },
        {
            Tank: TrapperTank,
            children: [
                {
                    Tank: BuilderTank,
                },
                {
                    Tank: GrowerTank,
                },
                {
                    Tank: DeceiverTank,
                },
            ],
        },
        {
            Tank: MachineGunTank,
            children: [
                {
                    Tank: GatlingGunTank,
                },
                {
                    Tank: BlasterTank,
                },
                {
                    Tank: SprayerTank,
                },
                {
                    Tank: TwinMachineTank,
                },
            ],
        },
        {
            Tank: LancerTank,
            children: [
                {
                    Tank: ShieldTank,
                },
                {
                    Tank: SpinnerTank,
                },
                {
                    Tank: JavelinTank,
                },
            ],
        },
    ],
};
