"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, XCircle } from "lucide-react";
import {
  ACTIONS,
  formatPreflopSizing,
  isPresetPreflopBbAmount,
  PREFLOP_BB_SIZINGS,
  preflopBbToAmount,
  PROFILE_TAGS,
  RANKS,
  REVIEW_TAG_GROUPS,
  SUITS,
} from "@/lib/constants";
import {
  buildPreflopRoster,
  buildPreflopStateFromWizard,
  createPreflopStreetBase,
  parseHeroPreflopLine,
  PREFLOP_DEAD_POT_BB,
  processStreetAction,
  syncVillainActionsFromLog,
} from "@/lib/betting-round";
import {
  type CardSlot,
  getCardAtSlot,
  isCardAlreadyUsed,
  isRankDisabled,
  isSuitDisabled,
} from "@/lib/cards";
import { playHaptic } from "@/lib/haptics";
import {
  buildInitialVillains,
  getFilteredVillainPositions,
  getPostflopWeight,
  heroPreflopActsBeforeVillains,
  inferDefaultVillainPreflopAction,
  getVillainPositionHint,
  getVillainPositionMode,
  sanitizeVillainPositions,
} from "@/lib/positions";
import { formatBbAsDollars } from "@/lib/session-math";
import type { Hand, StreetState } from "@/lib/types";
import { PostflopLiveActionLogger } from "./PostflopLiveActionLogger";
import { PreflopLiveActionLogger } from "./PreflopLiveActionLogger";

export type HandWizardProps = {
  initialHand: Hand;
  tableSize: number;
  getPositionsForSize: (size: number) => string[];
  wizardStep: number;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  selectedVillainIndex: number;
  setSelectedVillainIndex: React.Dispatch<React.SetStateAction<number>>;
  onSave: (hand: Hand) => void;
  onCancel: () => void;
  isEditing?: boolean;
  onDraftSync?: (hand: Hand) => void;
  bigBlind: number;
};

export function HandWizard({
  initialHand,
  tableSize,
  getPositionsForSize,
  wizardStep,
  setWizardStep,
  selectedVillainIndex,
  setSelectedVillainIndex,
  onSave,
  onCancel,
  isEditing = false,
  onDraftSync,
  bigBlind,
}: HandWizardProps) {
  const [hand, setHand] = useState<Hand>(initialHand);
  const [preflopCustomOpen, setPreflopCustomOpen] = useState(false);

  useEffect(() => {
    onDraftSync?.(hand);
  }, [hand, onDraftSync]);

  useEffect(() => {
    if (wizardStep !== 9 || hand.villainCount < 1) return;
    const tablePositions = getPositionsForSize(tableSize);
    const sanitized = sanitizeVillainPositions(
      hand.villains,
      tablePositions,
      hand.heroPositionIndex,
      hand.preflopAction,
      hand.villainCount
    );
    const changed =
      sanitized.length !== hand.villains.length ||
      sanitized.some((v, i) => v.position !== hand.villains[i]?.position);
    if (changed) {
      setHand((prev) => ({ ...prev, villains: sanitized }));
    }
  }, [wizardStep, hand.villainCount, hand.preflopAction, hand.heroPositionIndex, tableSize]);

  useEffect(() => {
    if (wizardStep !== 9 || hand.villainCount < 1) return;
    const defaultVillain = inferDefaultVillainPreflopAction(hand.preflopAction);
    if (!defaultVillain) return;

    const villains = [...hand.villains];
    let changed = false;
    for (let i = 0; i < hand.villainCount; i++) {
      if (!villains[i]?.action) {
        villains[i] = { ...(villains[i] ?? {}), action: defaultVillain };
        changed = true;
      }
    }
    if (changed) {
      setHand((prev) => ({ ...prev, villains }));
    }
  }, [wizardStep, hand.villainCount, hand.preflopAction]);

  useEffect(() => {
    if (wizardStep !== 10 || hand.villainCount < 1) return;
    initPreflopState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wizardStep,
    hand.villainCount,
    hand.id,
    hand.preflopAction,
    hand.villains,
  ]);

  const [streetState, setStreetState] = useState<StreetState>({
    street: "flop",
    players: [],
    history: [],
    currentActorIndex: 0,
    pot: PREFLOP_DEAD_POT_BB,
    potByStreet: {},
    highestBet: 0,
    lastRaiserId: null,
    showBetSizes: false,
    currentActionPending: "",
  });

            

            const positions = getPositionsForSize(tableSize);
            const villainPositionMode = getVillainPositionMode(
              hand.preflopAction,
              hand.villainCount
            );
            const villainPositionOptions = getFilteredVillainPositions(
              positions,
              hand.heroPositionIndex,
              villainPositionMode
            );
            const villainPositionHint = getVillainPositionHint(villainPositionMode);

  const updateHandState = <K extends keyof Hand>(key: K, val: Hand[K]) => {
    setHand((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

            const goNext = () => {
                playHaptic('click');
                if (wizardStep === 4 && !hand.heroPosition) {
                    updateHandState('heroPosition', positions[0]);
                    updateHandState('heroPositionIndex', 0);
                }
                
                // If entering Flop actions (Step 13), Turn actions (Step 15), or River actions (Step 17)
                // Initialize the positional bidding states
                if (wizardStep === 13) {
                    initStreetState('flop');
                } else if (wizardStep === 15) {
                    initStreetState('turn');
                } else if (wizardStep === 17) {
                    initStreetState('river');
                }

                setWizardStep(prev => prev + 1);
            };

            const goPrev = () => {
                playHaptic('click');
                setWizardStep(prev => prev - 1);
            };

            const skipToOutcome = () => {
                playHaptic('success');
                setWizardStep(19); // Hand Outcome
            };

            const completePreflopFromHistory = (
                history: string[],
                finalStreet?: Pick<StreetState, "pot" | "potByStreet">
            ) => {
                const heroLine = parseHeroPreflopLine(history);
                const syncedVillains = syncVillainActionsFromLog(
                    hand.villains,
                    history,
                    hand.villainCount
                );
                const sanitized = sanitizeVillainPositions(
                    syncedVillains,
                    positions,
                    hand.heroPositionIndex,
                    heroLine || hand.preflopAction,
                    hand.villainCount
                );
                const heroFolded =
                    heroLine === "Fold" || hand.preflopFolded;
                const mergedPotByStreet = {
                    ...hand.potByStreet,
                    ...finalStreet?.potByStreet,
                };
                setHand((prev) => ({
                    ...prev,
                    preflopActions: history,
                    preflopAction: heroLine || prev.preflopAction,
                    villains: sanitized,
                    preflopFolded: heroFolded || prev.preflopFolded,
                    potByStreet: mergedPotByStreet,
                }));
                if (finalStreet) {
                    setStreetState((prev) => ({
                        ...prev,
                        pot: finalStreet.pot,
                        potByStreet: mergedPotByStreet,
                    }));
                }
                setWizardStep(heroFolded ? 19 : 11);
            };

            const initPreflopState = () => {
                const roster = buildPreflopRoster(
                    positions,
                    hand.heroPosition,
                    hand.heroPositionIndex,
                    hand.villains,
                    hand.villainCount
                );
                const baseState = createPreflopStreetBase({
                    players: roster,
                });
                const { state, roundComplete } = buildPreflopStateFromWizard(
                    hand,
                    baseState
                );

                if (roundComplete) {
                    playHaptic("success");
                    setStreetState(state);
                    completePreflopFromHistory(state.history, {
                        pot: state.pot,
                        potByStreet: state.potByStreet,
                    });
                    return;
                }

                setStreetState(state);
                setHand((prev) => ({ ...prev, preflopActions: [] }));
            };

            const initStreetState = (streetName: "flop" | "turn" | "river") => {
                // Determine who is still active at the start of this street
                let roster = [];

                // 1. Hero
                const heroFoldedPreflop = hand.preflopFolded || hand.preflopAction === 'Fold';
                const heroFoldedFlop = streetName !== 'flop' && hand.flopFolded;
                const heroFoldedTurn = streetName === 'river' && hand.turnFolded;
                
                roster.push({
                    id: 'hero',
                    label: 'Hero',
                    position: hand.heroPosition,
                    isHero: true,
                    folded: !!(heroFoldedPreflop || heroFoldedFlop || heroFoldedTurn),
                    contribution: 0,
                    lastAction: 'None',
                    actedThisRound: false
                });

                // 2. Villains
                hand.villains.forEach((v, idx) => {
                    const villainFoldedPreflop = v.action === 'Fold';
                    const villainFoldedFlop = streetName !== 'flop' && v.flopFolded;
                    const villainFoldedTurn = streetName === 'river' && v.turnFolded;

                    roster.push({
                        id: `villain_${idx}`,
                        label: `Villain ${idx + 1}`,
                        position: v.position || positions[((hand.heroPositionIndex ?? 0) + idx + 1) % tableSize],
                        isHero: false,
                        folded: !!(villainFoldedPreflop || villainFoldedFlop || villainFoldedTurn),
                        contribution: 0,
                        lastAction: 'None',
                        actedThisRound: false
                    });
                });

                // Sort the active (non-folded) players by Postflop positional weight (closest to SB goes first)
                const activeOnStreet = roster.filter(p => !p.folded);
                const sortedActive = activeOnStreet.sort((a, b) => getPostflopWeight(a.position) - getPostflopWeight(b.position));

                const potByStreet = {
                    ...hand.potByStreet,
                    ...streetState.potByStreet,
                };
                let pot = streetState.pot ?? PREFLOP_DEAD_POT_BB;
                if (streetName === "flop") {
                    pot =
                        potByStreet.preflop ??
                        streetState.pot ??
                        PREFLOP_DEAD_POT_BB;
                } else if (streetName === "turn") {
                    pot =
                        potByStreet.flop ??
                        potByStreet.preflop ??
                        streetState.pot ??
                        pot;
                } else if (streetName === "river") {
                    pot =
                        potByStreet.turn ??
                        potByStreet.flop ??
                        potByStreet.preflop ??
                        streetState.pot ??
                        pot;
                }

                setStreetState({
                    street: streetName,
                    players: sortedActive,
                    history: [],
                    currentActorIndex: 0,
                    pot,
                    potByStreet,
                    highestBet: 0,
                    lastRaiserId: null,
                    showBetSizes: false,
                    currentActionPending: "",
                });
            };

            const handlePlayerAction = (actionType: string, sizing = "") => {
                const currentActor = streetState.players[streetState.currentActorIndex];
                const result = processStreetAction(streetState, actionType, sizing);

                if (actionType === "Fold") {
                    if (currentActor.isHero) {
                        if (streetState.street === "preflop") {
                            setHand((prev) => ({
                                ...prev,
                                preflopFolded: true,
                                preflopAction: "Fold",
                            }));
                        } else {
                            setHand((prev) => ({
                                ...prev,
                                [`${streetState.street}Folded`]: true,
                            }));
                        }
                    } else {
                        const vIndex = parseInt(currentActor.id.replace("villain_", ""), 10);
                        const updatedVillains = [...hand.villains];
                        if (streetState.street === "preflop") {
                            if (updatedVillains[vIndex]) {
                                updatedVillains[vIndex] = {
                                    ...updatedVillains[vIndex],
                                    action: "Fold",
                                };
                            }
                            setHand((prev) => ({ ...prev, villains: updatedVillains }));
                        } else if (updatedVillains[vIndex]) {
                            updatedVillains[vIndex] = {
                                ...updatedVillains[vIndex],
                                [`${streetState.street}Folded`]: true,
                            };
                            setHand((prev) => ({ ...prev, villains: updatedVillains }));
                        }
                    }
                }

                if (result.activeCount <= 1 || result.roundComplete) {
                    playHaptic("success");

                    setStreetState((prev) => ({
                        ...prev,
                        players: result.players,
                        history: result.history,
                        pot: result.pot,
                        potByStreet: result.potByStreet,
                        highestBet: result.highestBet,
                        lastRaiserId: result.lastRaiserId,
                    }));

                    if (streetState.street === "preflop") {
                        const heroLine = parseHeroPreflopLine(result.history);
                        const syncedVillains = syncVillainActionsFromLog(
                            hand.villains,
                            result.history,
                            hand.villainCount
                        );
                        const sanitized = sanitizeVillainPositions(
                            syncedVillains,
                            positions,
                            hand.heroPositionIndex,
                            heroLine || hand.preflopAction,
                            hand.villainCount
                        );
                        const heroFolded =
                            heroLine === "Fold" || hand.preflopFolded;
                        setHand((prev) => ({
                            ...prev,
                            preflopActions: result.history,
                            preflopAction: heroLine || prev.preflopAction,
                            villains: sanitized,
                            preflopFolded: heroFolded || prev.preflopFolded,
                            potByStreet: {
                                ...prev.potByStreet,
                                ...result.potByStreet,
                            },
                        }));
                        setTimeout(() => {
                            if (result.activeCount <= 1 || heroFolded) {
                                setWizardStep(19);
                            } else {
                                setWizardStep(11);
                            }
                        }, 400);
                        return;
                    }

                    setHand((prev) => ({
                        ...prev,
                        [`${streetState.street}Actions`]: result.history,
                        potByStreet: {
                            ...prev.potByStreet,
                            ...result.potByStreet,
                        },
                    }));
                    setTimeout(() => {
                        if (result.activeCount <= 1) {
                            setWizardStep(19);
                        } else if (streetState.street === "flop") {
                            setWizardStep(15);
                        } else if (streetState.street === "turn") {
                            setWizardStep(17);
                        } else {
                            setWizardStep(19);
                        }
                    }, 400);
                    return;
                }

                setStreetState((prev) => ({
                    ...prev,
                    players: result.players,
                    history: result.history,
                    pot: result.pot,
                    potByStreet: result.potByStreet,
                    currentActorIndex: result.nextActorIndex,
                    highestBet: result.highestBet,
                    lastRaiserId: result.lastRaiserId,
                    showBetSizes: false,
                    currentActionPending: "",
                    currentActionPendingCustom: false,
                }));
            };

            const getStepTitle = (s: number) => {
                switch(s) {
                    case 3: return "Step 3: Effective Stack";
                    case 4: return "Step 4: Your Position";
                    case 5: return "Step 5: Hero Card 1";
                    case 6: return "Step 6: Hero Card 2";
                    case 7: return "Step 7: Hero Preflop Action";
                    case 8: return "Step 8: Villain Count";
                    case 9: return `Step 9: Villain Profile (${selectedVillainIndex + 1}/${hand.villainCount})`;
                    case 10: return "Step 10: Preflop Live Action";
                    case 11: return "Step 11: Flop Card 1";
                    case 12: return "Step 12: Flop Card 2";
                    case 13: return "Step 13: Flop Card 3";
                    case 14: return "Step 14: Flop Live Action";
                    case 15: return "Step 15: Turn Board Card";
                    case 16: return "Step 16: Turn Live Action";
                    case 17: return "Step 17: River Board Card";
                    case 18: return "Step 18: River Live Action";
                    case 19: return "Step 19: Hand Outcome";
                    case 20: return "Step 20: Notes & Analysis";
                    default: return "Configure Hand";
                }
            };

            const applyCardInput = (
                slot: CardSlot,
                key: "rank" | "suit",
                val: string,
                onComplete?: () => void
            ) => {
                const current = getCardAtSlot(hand, slot);
                const rank = key === "rank" ? val : current.rank;
                const suit = key === "suit" ? val : current.suit;

                if (rank && suit && isCardAlreadyUsed(hand, rank, suit, slot)) {
                    return;
                }

                playHaptic("card");
                setHand((prev) => {
                    let next: Hand = prev;

                    if (slot.zone === "hero") {
                        const heroCards = [...prev.heroCards];
                        heroCards[slot.index] = { ...heroCards[slot.index], [key]: val };
                        next = { ...prev, heroCards };
                    } else if (slot.zone === "flop") {
                        const boardFlop = [...prev.boardFlop];
                        boardFlop[slot.index] = { ...boardFlop[slot.index], [key]: val };
                        next = { ...prev, boardFlop };
                    } else if (slot.zone === "turn") {
                        next = { ...prev, boardTurn: { ...prev.boardTurn, [key]: val } };
                    } else {
                        next = { ...prev, boardRiver: { ...prev.boardRiver, [key]: val } };
                    }

                    const card = getCardAtSlot(next, slot);
                    if (card.rank && card.suit && onComplete) {
                        setTimeout(onComplete, 250);
                    }
                    return next;
                });
            };

            const handleHeroCardInput = (cardIdx: number, key: "rank" | "suit", val: string) => {
                applyCardInput(
                    { zone: "hero", index: cardIdx },
                    key,
                    val,
                    () => setWizardStep((s) => s + 1)
                );
            };

            const handleFlopCardInput = (cardIdx: number, key: "rank" | "suit", val: string) => {
                applyCardInput(
                    { zone: "flop", index: cardIdx },
                    key,
                    val,
                    () => {
                        if (cardIdx === 2) initStreetState("flop");
                        setWizardStep((s) => s + 1);
                    }
                );
            };

            const handleTurnCardInput = (key: "rank" | "suit", val: string) => {
                applyCardInput({ zone: "turn" }, key, val, () => {
                    initStreetState("turn");
                    setWizardStep(16);
                });
            };

            const handleRiverCardInput = (key: "rank" | "suit", val: string) => {
                applyCardInput({ zone: "river" }, key, val, () => {
                    initStreetState("river");
                    setWizardStep(18);
                });
            };

            const rankPickerClass = (slot: CardSlot, rank: string, selected: boolean) => {
                const disabled = isRankDisabled(hand, slot, rank);
                return `px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                    disabled
                        ? "opacity-25 cursor-not-allowed bg-slate-950 text-slate-600"
                        : selected
                          ? "bg-poker-primary text-slate-950"
                          : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`;
            };

            const suitPickerClass = (
                slot: CardSlot,
                suitSymbol: string,
                selected: boolean,
                suitBg: string
            ) => {
                const disabled = isSuitDisabled(hand, slot, suitSymbol);
                return `p-2.5 rounded-xl border text-sm text-center transition-all ${
                    disabled
                        ? "opacity-25 cursor-not-allowed bg-slate-950 border-slate-900 text-slate-600"
                        : selected
                          ? `${suitBg} border-2`
                          : "bg-slate-900 border-slate-900 text-slate-400"
                }`;
            };

            const shouldShowContinueButton = () => {
                // Returns true if step needs a bottom Continue/Save button (not auto-advanced on tap grids)
                return ![3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(wizardStep);
            };

            const getSuitColor = (suit: string) => {
                switch(suit) {
                    case '♠': return 'text-sky-400';
                    case '♥': return 'text-rose-500';
                    case '♦': return 'text-pink-500';
                    case '♣': return 'text-emerald-400';
                    default: return 'text-slate-100';
                }
            };

            return (
                <div className="px-4 pt-4 space-y-4">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <button 
                            type="button" 
                            onClick={wizardStep > 3 ? goPrev : onCancel}
                            className="p-1.5 hover:bg-slate-900 rounded-lg transition-colors text-slate-400"
                        >
                            {wizardStep > 3 ? <ChevronLeft className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </button>
                        <div className="text-center">
                            <span className="text-[9px] text-poker-accent font-extrabold uppercase tracking-widest">Hand Wizard</span>
                            <h3 className="font-extrabold text-sm text-white">{getStepTitle(wizardStep)}</h3>
                        </div>
                        <div className="w-8"></div>
                    </div>

                    {/* Progress dots bar */}
                    <div className="flex items-center justify-between gap-1 px-4 py-1.5 bg-slate-950/50 rounded-lg overflow-x-auto">
                        {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(s => (
                            <div 
                                key={s} 
                                className={`h-1.5 rounded-full flex-1 min-w-[6px] transition-all ${
                                    wizardStep === s ? 'bg-poker-accent' : wizardStep > s ? 'bg-poker-primary' : 'bg-slate-800'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Active Wizard Step Panel */}
                    <div className="min-h-[420px] bg-poker-card p-4 rounded-3xl border border-slate-900 flex flex-col justify-between space-y-4 relative">
                        
                        {/* STEP 3: Effective Stack Selector */}
                        {wizardStep === 3 && (
                            <div className="space-y-4 text-center flex-1 flex flex-col justify-center animate-fadeIn">
                                <p className="text-xs text-slate-400">Select effective stack size in big blinds (BB) for this hand.</p>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    {[33, 50, 75, 100].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => {
                                                playHaptic('success');
                                                setHand(prev => ({ ...prev, effectiveStack: `${val} BB` }));
                                                setTimeout(() => setWizardStep(4), 150);
                                            }}
                                            className={`py-4 rounded-2xl font-black text-lg border transition-all ${
                                                hand.effectiveStack === `${val} BB` 
                                                    ? 'bg-poker-primary border-poker-primary text-slate-950 glow-green' 
                                                    : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                                            }`}
                                        >
                                            {val} BB
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-2 pt-4 border-t border-slate-900/60">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Or custom manual entry (BB)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="e.g. 150"
                                            value={hand.effectiveStack && !['33 BB', '50 BB', '75 BB', '100 BB'].includes(hand.effectiveStack) ? hand.effectiveStack.replace(' BB', '') : ''}
                                            onChange={(e) => updateHandState('effectiveStack', e.target.value ? `${e.target.value} BB` : '')}
                                            className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white font-medium text-sm transition-colors focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (hand.effectiveStack) {
                                                    playHaptic('success');
                                                    setWizardStep(4);
                                                }
                                            }}
                                            className="px-5 bg-poker-primary hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Position Selector */}
                        {wizardStep === 4 && (
                            <div className="space-y-4 flex-1 flex flex-col justify-center animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Tap your physical seat position below to calibrate metrics tracking.</p>
                                
                                <div className="relative aspect-[4/3] bg-emerald-950/20 rounded-3xl border border-emerald-800/40 p-3 flex flex-col justify-between overflow-hidden shadow-inner">
                                    <div className="absolute inset-8 border border-emerald-500/20 rounded-full flex items-center justify-center bg-emerald-900/10">
                                        <div className="text-center">
                                            <span className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">TABLE FLOW</span>
                                            <p className="text-xs font-bold text-emerald-300">{tableSize}-Max</p>
                                        </div>
                                    </div>

                                    {/* Clockwise Seat Grid */}
                                    <div className="grid grid-cols-3 gap-2.5 h-full relative z-10">
                                        {positions.map((pos, idx) => {
                                            const isSelected = hand.heroPositionIndex === idx;
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        playHaptic('success');
                                                        setHand(prev => ({
                                                            ...prev,
                                                            heroPosition: pos,
                                                            heroPositionIndex: idx
                                                        }));
                                                        setTimeout(() => setWizardStep(5), 150);
                                                    }}
                                                    className={`p-2 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                                                        isSelected ? 'bg-poker-primary border-poker-primary text-slate-950 font-black glow-green scale-105' : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <span className="text-xs font-black">{pos}</span>
                                                    <span className="text-[8px] opacity-75">Seat {idx + 1}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: Hero Card 1 (Tactile Rank/Suit Entry) */}
                        {wizardStep === 5 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select Rank & Suit for Hero Card 1.</p>
                                
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                                    <div className="h-24 w-16 mx-auto rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
                                        {hand.heroCards[0].rank ? (
                                            <>
                                                <span className="text-base font-black tracking-tight leading-none text-slate-100">{hand.heroCards[0].rank}</span>
                                                <span className={`text-2xl text-center leading-none self-end ${getSuitColor(hand.heroCards[0].suit)}`}>{hand.heroCards[0].suit}</span>
                                            </>
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">?</span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
                                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                                            {RANKS.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    disabled={isRankDisabled(hand, { zone: "hero", index: 0 }, r)}
                                                    onClick={() => handleHeroCardInput(0, 'rank', r)}
                                                    className={rankPickerClass({ zone: "hero", index: 0 }, r, hand.heroCards[0].rank === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SUITS.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    type="button"
                                                    disabled={isSuitDisabled(hand, { zone: "hero", index: 0 }, s.symbol)}
                                                    onClick={() => handleHeroCardInput(0, 'suit', s.symbol)}
                                                    className={suitPickerClass({ zone: "hero", index: 0 }, s.symbol, hand.heroCards[0].suit === s.symbol, s.bg)}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 6: Hero Card 2 (Tactile Rank/Suit Entry) */}
                        {wizardStep === 6 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select Rank & Suit for Hero Card 2.</p>
                                
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                                    <div className="flex gap-2 justify-center mb-1">
                                        {/* Card 1 Mini Reference */}
                                        <div className="h-16 w-11 rounded-lg border border-slate-800 bg-poker-card/60 flex flex-col justify-between p-1 opacity-60">
                                            <span className="text-xs font-bold text-slate-400 leading-none">{hand.heroCards[0].rank}</span>
                                            <span className={`text-base self-end ${getSuitColor(hand.heroCards[0].suit)}`}>{hand.heroCards[0].suit}</span>
                                        </div>
                                        {/* Card 2 Selection Preview */}
                                        <div className="h-24 w-16 rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
                                            {hand.heroCards[1].rank ? (
                                                <>
                                                    <span className="text-base font-black tracking-tight leading-none text-slate-100">{hand.heroCards[1].rank}</span>
                                                    <span className={`text-2xl text-center leading-none self-end ${getSuitColor(hand.heroCards[1].suit)}`}>{hand.heroCards[1].suit}</span>
                                                </>
                                            ) : (
                                                <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">?</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
                                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                                            {RANKS.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    disabled={isRankDisabled(hand, { zone: "hero", index: 1 }, r)}
                                                    onClick={() => handleHeroCardInput(1, 'rank', r)}
                                                    className={rankPickerClass({ zone: "hero", index: 1 }, r, hand.heroCards[1].rank === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SUITS.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    type="button"
                                                    disabled={isSuitDisabled(hand, { zone: "hero", index: 1 }, s.symbol)}
                                                    onClick={() => handleHeroCardInput(1, 'suit', s.symbol)}
                                                    className={suitPickerClass({ zone: "hero", index: 1 }, s.symbol, hand.heroCards[1].suit === s.symbol, s.bg)}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 7: Hero preflop action (before villain setup) */}
                        {wizardStep === 7 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">
                                    What was your preflop action? You will log the full betting round with villains on the next steps.
                                </p>

                                <div className="grid grid-cols-3 gap-2">
                                    {ACTIONS.map(act => (
                                        <button
                                            key={act}
                                            type="button"
                                            onClick={() => {
                                                playHaptic('click');
                                                if (act === 'Fold' || act === 'Limp') {
                                                    setHand(prev => ({
                                                        ...prev,
                                                        preflopAction: act,
                                                        preflopAmount: '',
                                                        ...(act === 'Fold' ? { preflopFolded: true } : {}),
                                                    }));
                                                    setTimeout(() => setWizardStep(8), 150);
                                                } else {
                                                    setPreflopCustomOpen(false);
                                                    updateHandState('preflopAction', act);
                                                }
                                            }}
                                            className={`p-4 rounded-xl text-xs font-black transition-all ${
                                                hand.preflopAction === act ? 'bg-poker-primary text-slate-950 glow-green' : 'bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800'
                                            }`}
                                        >
                                            {act}
                                        </button>
                                    ))}
                                </div>

                                {hand.preflopAction && hand.preflopAction !== 'Fold' && hand.preflopAction !== 'Limp' && (
                                    <div className="space-y-3 pt-4 border-t border-slate-900 animate-fadeIn">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-semibold block">
                                            Select open size (BB)
                                        </label>

                                        <div className="grid grid-cols-3 gap-2">
                                            {PREFLOP_BB_SIZINGS.map((size) => {
                                                const amount = preflopBbToAmount(size.bb);
                                                const dollarHint =
                                                    typeof size.bb === "number"
                                                        ? formatBbAsDollars(size.bb, bigBlind)
                                                        : null;
                                                return (
                                                <button
                                                    key={size.label}
                                                    type="button"
                                                    onClick={() => {
                                                        playHaptic('success');
                                                        setPreflopCustomOpen(false);
                                                        updateHandState('preflopAmount', amount);
                                                        setTimeout(() => setWizardStep(8), 150);
                                                    }}
                                                    className={`py-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
                                                        hand.preflopAmount === amount && !preflopCustomOpen
                                                            ? 'bg-poker-accent text-slate-950 border-poker-accent glow-gold'
                                                            : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                                                    }`}
                                                >
                                                    <span>{size.label}</span>
                                                    {dollarHint && (
                                                        <span className="text-[9px] opacity-80">{dollarHint}</span>
                                                    )}
                                                </button>
                                            );
                                            })}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    playHaptic('click');
                                                    setPreflopCustomOpen(true);
                                                    updateHandState('preflopAmount', '');
                                                }}
                                                className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                                                    preflopCustomOpen ||
                                                    (hand.preflopAmount &&
                                                        !isPresetPreflopBbAmount(hand.preflopAmount))
                                                        ? 'bg-poker-accent text-slate-950 border-poker-accent glow-gold'
                                                        : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                                                }`}
                                            >
                                                Custom
                                            </button>
                                        </div>

                                        {preflopCustomOpen && (
                                            <div className="space-y-2 pt-1 animate-fadeIn">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest block">
                                                    Custom size (BB)
                                                </span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.5"
                                                        min="0.5"
                                                        placeholder="e.g. 7.5"
                                                        value={
                                                            hand.preflopAmount &&
                                                            !isPresetPreflopBbAmount(hand.preflopAmount)
                                                                ? hand.preflopAmount
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            updateHandState('preflopAmount', e.target.value)
                                                        }
                                                        className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const bb = Number(hand.preflopAmount);
                                                            if (bb > 0) {
                                                                playHaptic('success');
                                                                setWizardStep(8);
                                                            }
                                                        }}
                                                        className="px-4 bg-poker-primary text-slate-950 rounded-xl font-bold text-xs"
                                                    >
                                                        Confirm
                                                    </button>
                                                </div>
                                                {hand.preflopAmount &&
                                                    !isPresetPreflopBbAmount(hand.preflopAmount) &&
                                                    Number(hand.preflopAmount) > 0 && (
                                                    <p className="text-[10px] text-slate-500 text-center">
                                                        ≈ {formatBbAsDollars(Number(hand.preflopAmount), bigBlind)}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 8: Villain Count */}
                        {wizardStep === 8 && (
                            <div className="space-y-4 text-center flex-1 flex flex-col justify-center animate-fadeIn">
                                <p className="text-xs text-slate-400">How many players remained active in this hand against you preflop?</p>
                                
                                <div className="grid grid-cols-6 gap-2 pt-6">
                                    {[0, 1, 2, 3, 4, 5].map(cnt => (
                                        <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => {
                                                playHaptic('success');
                                                if (cnt === 0) {
                                                    setHand(prev => ({
                                                        ...prev,
                                                        villainCount: 0,
                                                        result: 'Won',
                                                        notes: prev.notes || 'Everyone folded preflop.'
                                                    }));
                                                    setTimeout(() => setWizardStep(20), 200);
                                                } else {
                                                    setHand((prev) => ({
                                                        ...prev,
                                                        villainCount: cnt,
                                                        villains: buildInitialVillains(
                                                            positions,
                                                            prev.heroPositionIndex,
                                                            prev.preflopAction,
                                                            cnt
                                                        ),
                                                    }));
                                                    setTimeout(() => setWizardStep(9), 150);
                                                }
                                            }}
                                            className={`py-4 rounded-xl text-sm font-extrabold transition-all ${
                                                hand.villainCount === cnt ? 'bg-poker-primary text-slate-950 glow-green' : 'bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800'
                                            }`}
                                        >
                                            {cnt === 5 ? '5+' : cnt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 9: Villain profiles (seat + tags) */}
                        {wizardStep === 9 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Seat and tags for Villain {selectedVillainIndex + 1}.</p>

                                {hand.preflopAction && (
                                    <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-900/50 text-center space-y-1">
                                        <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">Your preflop line (step 7)</span>
                                        <p className="text-sm font-black text-sky-200">
                                            {hand.preflopAction}
                                            {hand.preflopAmount
                                                ? ` · ${formatPreflopSizing(hand.preflopAmount)}`
                                                : ""}
                                        </p>
                                        {!heroPreflopActsBeforeVillains(hand.preflopAction) && (
                                            <p className="text-[10px] text-slate-500 leading-relaxed">
                                                Villains act before you — suggested villain action is pre-selected below.
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    {/* Villain Position Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Villain Seat Position</label>
                                        {villainPositionHint && (
                                            <p className="text-[10px] text-emerald-500/90 leading-relaxed">
                                                {villainPositionHint}
                                            </p>
                                        )}
                                        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                                            {(villainPositionOptions.length > 0 ? villainPositionOptions : positions).map((pos) => {
                                                const currentV = hand.villains[selectedVillainIndex] || {};
                                                const isSelected = currentV.position === pos;
                                                return (
                                                    <button
                                                        key={pos}
                                                        type="button"
                                                        onClick={() => {
                                                            playHaptic('click');
                                                            const villains = [...hand.villains];
                                                            if (!villains[selectedVillainIndex]) villains[selectedVillainIndex] = {};
                                                            villains[selectedVillainIndex].position = pos;
                                                            updateHandState('villains', villains);
                                                        }}
                                                        className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                                                            isSelected ? 'bg-poker-accent text-slate-950 font-black' : 'bg-slate-950 text-slate-400 hover:bg-slate-900'
                                                        }`}
                                                    >
                                                        {pos}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Villain Profile Tags */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profile Tags</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {PROFILE_TAGS.map(tag => {
                                                const currentV = hand.villains[selectedVillainIndex] || {};
                                                const isSelected = currentV.tag === tag;
                                                return (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        onClick={() => {
                                                            playHaptic('click');
                                                            const villains = [...hand.villains];
                                                            if (!villains[selectedVillainIndex]) villains[selectedVillainIndex] = {};
                                                            villains[selectedVillainIndex].tag = tag;
                                                            updateHandState('villains', villains);
                                                        }}
                                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                            isSelected ? 'bg-poker-accent/20 text-poker-accent border border-poker-accent/40' : 'bg-slate-950 text-slate-500 hover:bg-slate-900 border border-transparent'
                                                        }`}
                                                    >
                                                        {tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Villain preflop action</label>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">
                                            Pre-filled from your line when villains act first. Adjust if needed.
                                        </p>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {['Fold', 'Call', 'Raise', '3-Bet', 'All-In'].map(act => {
                                                const currentV = hand.villains[selectedVillainIndex] || {};
                                                const isSelected = currentV.action === act;
                                                const isSuggested =
                                                    inferDefaultVillainPreflopAction(hand.preflopAction) === act &&
                                                    !heroPreflopActsBeforeVillains(hand.preflopAction);
                                                return (
                                                    <button
                                                        key={act}
                                                        type="button"
                                                        onClick={() => {
                                                            playHaptic('click');
                                                            const villains = [...hand.villains];
                                                            if (!villains[selectedVillainIndex]) villains[selectedVillainIndex] = {};
                                                            villains[selectedVillainIndex].action = act;
                                                            updateHandState('villains', villains);
                                                        }}
                                                        className={`py-2 rounded-lg text-[10px] font-bold text-center transition-all ${
                                                            isSelected
                                                                ? 'bg-poker-accent text-slate-950 font-black ring-2 ring-poker-accent/50'
                                                                : isSuggested
                                                                  ? 'bg-sky-950/50 border border-sky-700/60 text-sky-300'
                                                                  : 'bg-slate-950 border border-slate-900 text-slate-400 hover:bg-slate-900'
                                                        }`}
                                                    >
                                                        {act}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Villain Notes</label>
                                        <input
                                            type="text"
                                            placeholder="Write optional observations"
                                            value={(hand.villains[selectedVillainIndex] || {}).note || ''}
                                            onChange={(e) => {
                                                const villains = [...hand.villains];
                                                if (!villains[selectedVillainIndex]) villains[selectedVillainIndex] = {};
                                                villains[selectedVillainIndex].note = e.target.value;
                                                updateHandState('villains', villains);
                                            }}
                                            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 10: Preflop live action — round must complete before flop */}
                        {wizardStep === 10 && (
                            <PreflopLiveActionLogger
                                streetState={streetState}
                                setStreetState={setStreetState}
                                handlePlayerAction={handlePlayerAction}
                                skipToOutcome={skipToOutcome}
                                hand={hand}
                                potBb={streetState.pot ?? PREFLOP_DEAD_POT_BB}
                                bigBlind={bigBlind}
                            />
                        )}

                        {/* STEP 11: Flop Card 1 */}
                        {wizardStep === 11 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select Rank & Suit for Flop Card 1.</p>
                                
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                                    <div className="h-24 w-16 mx-auto rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
                                        {hand.boardFlop[0].rank ? (
                                            <>
                                                <span className="text-base font-black tracking-tight leading-none text-slate-100">{hand.boardFlop[0].rank}</span>
                                                <span className={`text-2xl text-center leading-none self-end ${getSuitColor(hand.boardFlop[0].suit)}`}>{hand.boardFlop[0].suit}</span>
                                            </>
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">?</span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
                                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                                            {RANKS.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    disabled={isRankDisabled(hand, { zone: "flop", index: 0 }, r)}
                                                    onClick={() => handleFlopCardInput(0, 'rank', r)}
                                                    className={rankPickerClass({ zone: "flop", index: 0 }, r, hand.boardFlop[0].rank === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SUITS.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    type="button"
                                                    disabled={isSuitDisabled(hand, { zone: "flop", index: 0 }, s.symbol)}
                                                    onClick={() => handleFlopCardInput(0, 'suit', s.symbol)}
                                                    className={suitPickerClass({ zone: "flop", index: 0 }, s.symbol, hand.boardFlop[0].suit === s.symbol, s.bg)}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </div>
                        )}

                        {/* STEP 12: Flop Card 2 */}
                        {wizardStep === 12 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select Rank & Suit for Flop Card 2.</p>
                                
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                                    <div className="flex gap-2 justify-center mb-1">
                                        <div className="h-16 w-11 rounded-lg border border-slate-800 bg-poker-card/60 flex flex-col justify-between p-1 opacity-60">
                                            <span className="text-xs font-bold text-slate-400 leading-none">{hand.boardFlop[0].rank}</span>
                                            <span className={`text-base self-end ${getSuitColor(hand.boardFlop[0].suit)}`}>{hand.boardFlop[0].suit}</span>
                                        </div>
                                        <div className="h-24 w-16 rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
                                            {hand.boardFlop[1].rank ? (
                                                <>
                                                    <span className="text-base font-black tracking-tight leading-none text-slate-100">{hand.boardFlop[1].rank}</span>
                                                    <span className={`text-2xl text-center leading-none self-end ${getSuitColor(hand.boardFlop[1].suit)}`}>{hand.boardFlop[1].suit}</span>
                                                </>
                                            ) : (
                                                <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">?</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
                                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                                            {RANKS.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    disabled={isRankDisabled(hand, { zone: "flop", index: 1 }, r)}
                                                    onClick={() => handleFlopCardInput(1, 'rank', r)}
                                                    className={rankPickerClass({ zone: "flop", index: 1 }, r, hand.boardFlop[1].rank === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SUITS.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    type="button"
                                                    disabled={isSuitDisabled(hand, { zone: "flop", index: 1 }, s.symbol)}
                                                    onClick={() => handleFlopCardInput(1, 'suit', s.symbol)}
                                                    className={suitPickerClass({ zone: "flop", index: 1 }, s.symbol, hand.boardFlop[1].suit === s.symbol, s.bg)}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </div>
                        )}

                        {/* STEP 13: Flop Card 3 */}
                        {wizardStep === 13 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select Rank & Suit for Flop Card 3.</p>
                                
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                                    <div className="flex gap-2 justify-center mb-1">
                                        <div className="h-16 w-11 rounded-lg border border-slate-800 bg-poker-card/60 flex flex-col justify-between p-1 opacity-60">
                                            <span className="text-xs font-bold text-slate-400 leading-none">{hand.boardFlop[0].rank}</span>
                                            <span className={`text-base self-end ${getSuitColor(hand.boardFlop[0].suit)}`}>{hand.boardFlop[0].suit}</span>
                                        </div>
                                        <div className="h-16 w-11 rounded-lg border border-slate-800 bg-poker-card/60 flex flex-col justify-between p-1 opacity-60">
                                            <span className="text-xs font-bold text-slate-400 leading-none">{hand.boardFlop[1].rank}</span>
                                            <span className={`text-base self-end ${getSuitColor(hand.boardFlop[1].suit)}`}>{hand.boardFlop[1].suit}</span>
                                        </div>
                                        <div className="h-24 w-16 rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
                                            {hand.boardFlop[2].rank ? (
                                                <>
                                                    <span className="text-base font-black tracking-tight leading-none text-slate-100">{hand.boardFlop[2].rank}</span>
                                                    <span className={`text-2xl text-center leading-none self-end ${getSuitColor(hand.boardFlop[2].suit)}`}>{hand.boardFlop[2].suit}</span>
                                                </>
                                            ) : (
                                                <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">?</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
                                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                                            {RANKS.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    disabled={isRankDisabled(hand, { zone: "flop", index: 2 }, r)}
                                                    onClick={() => handleFlopCardInput(2, 'rank', r)}
                                                    className={rankPickerClass({ zone: "flop", index: 2 }, r, hand.boardFlop[2].rank === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SUITS.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    type="button"
                                                    disabled={isSuitDisabled(hand, { zone: "flop", index: 2 }, s.symbol)}
                                                    onClick={() => handleFlopCardInput(2, 'suit', s.symbol)}
                                                    className={suitPickerClass({ zone: "flop", index: 2 }, s.symbol, hand.boardFlop[2].suit === s.symbol, s.bg)}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </div>
                        )}

                        {/* STEP 14: Flop live action */}
                        {wizardStep === 14 && (
                            <PostflopLiveActionLogger 
                                streetState={streetState}
                                setStreetState={setStreetState}
                                handlePlayerAction={handlePlayerAction}
                                skipToOutcome={skipToOutcome}
                                getSuitColor={getSuitColor}
                                hand={hand}
                                potBb={streetState.pot ?? PREFLOP_DEAD_POT_BB}
                                bigBlind={bigBlind}
                            />
                        )}

                        {/* STEP 15: Turn board card */}
                        {wizardStep === 15 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select Rank & Suit for the Turn Board Card.</p>
                                
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                                    <div className="h-24 w-16 mx-auto rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
                                        {hand.boardTurn.rank ? (
                                            <>
                                                <span className="text-base font-black tracking-tight leading-none text-slate-100">{hand.boardTurn.rank}</span>
                                                <span className={`text-2xl text-center leading-none self-end ${getSuitColor(hand.boardTurn.suit)}`}>{hand.boardTurn.suit}</span>
                                            </>
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">?</span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
                                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                                            {RANKS.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    disabled={isRankDisabled(hand, { zone: "turn" }, r)}
                                                    onClick={() => handleTurnCardInput('rank', r)}
                                                    className={rankPickerClass({ zone: "turn" }, r, hand.boardTurn.rank === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SUITS.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    type="button"
                                                    disabled={isSuitDisabled(hand, { zone: "turn" }, s.symbol)}
                                                    onClick={() => handleTurnCardInput('suit', s.symbol)}
                                                    className={suitPickerClass({ zone: "turn" }, s.symbol, hand.boardTurn.suit === s.symbol, s.bg)}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </div>
                        )}

                        {/* STEP 16: Turn live action */}
                        {wizardStep === 16 && (
                            <PostflopLiveActionLogger 
                                streetState={streetState}
                                setStreetState={setStreetState}
                                handlePlayerAction={handlePlayerAction}
                                skipToOutcome={skipToOutcome}
                                getSuitColor={getSuitColor}
                                hand={hand}
                                potBb={streetState.pot ?? PREFLOP_DEAD_POT_BB}
                                bigBlind={bigBlind}
                            />
                        )}

                        {/* STEP 17: River board card */}
                        {wizardStep === 17 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select Rank & Suit for the River Board Card.</p>
                                
                                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-900 space-y-3">
                                    <div className="h-24 w-16 mx-auto rounded-xl border border-slate-800 bg-poker-card flex flex-col justify-between p-2 shadow-lg relative animate-bounce">
                                        {hand.boardRiver.rank ? (
                                            <>
                                                <span className="text-base font-black tracking-tight leading-none text-slate-100">{hand.boardRiver.rank}</span>
                                                <span className={`text-2xl text-center leading-none self-end ${getSuitColor(hand.boardRiver.suit)}`}>{hand.boardRiver.suit}</span>
                                            </>
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-mono text-lg font-bold">?</span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Rank</span>
                                        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                                            {RANKS.map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    disabled={isRankDisabled(hand, { zone: "river" }, r)}
                                                    onClick={() => handleRiverCardInput('rank', r)}
                                                    className={rankPickerClass({ zone: "river" }, r, hand.boardRiver.rank === r)}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[8px] text-slate-600 font-bold uppercase">Suit</span>
                                        <div className="grid grid-cols-4 gap-2">
                                            {SUITS.map(s => (
                                                <button
                                                    key={s.symbol}
                                                    type="button"
                                                    disabled={isSuitDisabled(hand, { zone: "river" }, s.symbol)}
                                                    onClick={() => handleRiverCardInput('suit', s.symbol)}
                                                    className={suitPickerClass({ zone: "river" }, s.symbol, hand.boardRiver.suit === s.symbol, s.bg)}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </div>
                        )}

                        {/* STEP 18: River live action */}
                        {wizardStep === 18 && (
                            <PostflopLiveActionLogger 
                                streetState={streetState}
                                setStreetState={setStreetState}
                                handlePlayerAction={handlePlayerAction}
                                skipToOutcome={skipToOutcome}
                                getSuitColor={getSuitColor}
                                hand={hand}
                                potBb={streetState.pot ?? PREFLOP_DEAD_POT_BB}
                                bigBlind={bigBlind}
                            />
                        )}

                        {/* STEP 19: Hand outcome */}
                        {wizardStep === 19 && (
                            <div className="space-y-5 flex-1 flex flex-col justify-center animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Log final performance outcomes.</p>
                                
                                <div className="grid grid-cols-3 gap-2">
                                    {['Won', 'Lost', 'Split'].map(res => (
                                        <button
                                            key={res}
                                            type="button"
                                            onClick={() => { playHaptic('click'); updateHandState('result', res); }}
                                            className={`p-4 rounded-xl text-xs font-black transition-all ${
                                                hand.result === res 
                                                    ? res === 'Won' 
                                                        ? 'bg-poker-primary text-slate-950 glow-green' 
                                                        : res === 'Lost' 
                                                            ? 'bg-rose-500 text-white' 
                                                            : 'bg-poker-accent text-slate-950 glow-gold'
                                                    : 'bg-slate-950 border border-slate-900 text-slate-400 hover:border-slate-800'
                                            }`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-semibold">Net Chips Balance ($)</label>
                                    <input
                                        type="number"
                                        placeholder="Enter chips amount won or lost"
                                        value={hand.resultAmount}
                                        onChange={(e) => updateHandState('resultAmount', e.target.value)}
                                        className="w-full p-4 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white font-medium text-sm transition-colors focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 20: Notes & review */}
                        {wizardStep === 20 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Write optional analysis commentary & review tags.</p>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hand Notes</label>
                                    <textarea
                                        placeholder="Write detailed observation summaries..."
                                        rows={4}
                                        value={hand.notes}
                                        onChange={(e) => updateHandState('notes', e.target.value)}
                                        className="w-full p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Review Tags</label>
                                    {(
                                        Object.entries(REVIEW_TAG_GROUPS) as [
                                            string,
                                            readonly string[],
                                        ][]
                                    ).map(([groupLabel, tags]) => (
                                        <div key={groupLabel} className="space-y-1.5">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                                                {groupLabel}
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {tags.map((tag) => {
                                                    const isSelected = hand.tags.includes(tag);
                                                    return (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            onClick={() => {
                                                                playHaptic('click');
                                                                const activeTags = [...hand.tags];
                                                                if (isSelected) {
                                                                    updateHandState(
                                                                        'tags',
                                                                        activeTags.filter((t) => t !== tag)
                                                                    );
                                                                } else {
                                                                    activeTags.push(tag);
                                                                    updateHandState('tags', activeTags);
                                                                }
                                                            }}
                                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                                isSelected
                                                                    ? 'bg-poker-primary/20 text-poker-primary border border-poker-primary/40'
                                                                    : 'bg-slate-950 text-slate-500 hover:bg-slate-900 border border-transparent'
                                                            }`}
                                                        >
                                                            #{tag}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Navigation Buttons Row */}
                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={wizardStep > 3 ? goPrev : onCancel}
                            className="flex-1 py-3.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl font-bold text-xs text-slate-400"
                        >
                            {wizardStep > 3 ? "Back" : "Cancel"}
                        </button>
                        
                        {shouldShowContinueButton() && (
                            wizardStep === 9 && selectedVillainIndex < hand.villainCount - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        playHaptic('click');
                                        setSelectedVillainIndex(prev => prev + 1);
                                    }}
                                    className="flex-1 py-3.5 bg-poker-accent text-slate-950 font-black rounded-xl text-xs transition-colors animate-fadeIn"
                                >
                                    Next Villain
                                </button>
                            ) : wizardStep === 20 ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onSave({
                                            ...hand,
                                            potByStreet: {
                                                ...hand.potByStreet,
                                                ...streetState.potByStreet,
                                            },
                                        })
                                    }
                                    className="flex-1 py-3.5 bg-poker-primary text-slate-950 font-black rounded-xl text-xs transition-colors glow-green"
                                >
                                    {isEditing ? "SAVE CHANGES" : "SAVE HAND"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="flex-1 py-3.5 bg-poker-primary text-slate-950 font-black rounded-xl text-xs transition-colors"
                                >
                                    Continue
                                </button>
                            )
                        )}
                    </div>
                </div>
            );
        }

        