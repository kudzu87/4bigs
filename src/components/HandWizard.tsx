"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, XCircle } from "lucide-react";
import {
  parseHeroPreflopLine,
  PREFLOP_DEAD_POT_BB,
  syncVillainActionsFromLog,
  type ProcessActionResult,
} from "@/lib/betting-round";
import {
  getStepTitle,
  isStepComplete,
  shouldShowContinueButton,
  useHandWizardNavigation,
} from "@/hooks/useHandWizardNavigation";
import {
  completePreflopFromWizardHistory,
  seedWizardPreflopState,
} from "@/lib/wizard-preflop";
import {
  type CardSlot,
  getCardAtSlot,
  getUsedCardKeys,
  isCardAlreadyUsed,
} from "@/lib/cards";
import { playHaptic } from "@/lib/haptics";
import {
  getFilteredVillainPositions,
  inferDefaultVillainPreflopAction,
  getVillainPositionHint,
  getVillainPositionMode,
  sanitizeVillainPositions,
} from "@/lib/positions";
import type { Hand, StreetState } from "@/lib/types";
import { useStreetState } from "@/hooks/useStreetState";
import { CardFacePreview, WizardCardInput } from "./wizard/WizardCardInput";
import { WizardStepOutcome } from "./wizard/WizardStepOutcome";
import { WizardStepSetup } from "./wizard/WizardStepSetup";
import { WizardStepHeroPreflop } from "./wizard/WizardStepHeroPreflop";
import { WizardStepVillainProfile } from "./wizard/WizardStepVillainProfile";
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

  const onRoundComplete = useCallback(
    (street: string, result: ProcessActionResult) => {
      if (street === "preflop") {
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
        const heroFolded = heroLine === "Fold" || hand.preflopFolded;
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
        [`${street}Actions`]: result.history,
        potByStreet: {
          ...prev.potByStreet,
          ...result.potByStreet,
        },
      }));
      setTimeout(() => {
        if (result.activeCount <= 1) {
          setWizardStep(19);
        } else if (street === "flop") {
          setWizardStep(15);
        } else if (street === "turn") {
          setWizardStep(17);
        } else {
          setWizardStep(19);
        }
      }, 400);
    },
    [hand, positions, setHand, setWizardStep]
  );

  const {
    streetState,
    setStreetState,
    initStreetState,
    handlePlayerAction: applyStreetAction,
  } = useStreetState(hand, positions, bigBlind, onRoundComplete);

  const handlePlayerAction = (actionType: string, sizing = "") => {
    const currentActor = streetState.players[streetState.currentActorIndex];
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
    applyStreetAction(actionType, sizing);
  };

  const updateHandState = <K extends keyof Hand>(key: K, val: Hand[K]) => {
    setHand((prev) => ({
      ...prev,
      [key]: val,
    }));
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
                const completed = completePreflopFromWizardHistory(
                    hand,
                    positions,
                    bigBlind
                );

                if (completed) {
                    playHaptic("success");
                    setStreetState(completed);
                    completePreflopFromHistory(completed.history, {
                        pot: completed.pot,
                        potByStreet: completed.potByStreet,
                    });
                    return;
                }

                setStreetState(seedWizardPreflopState(hand, positions, bigBlind));
                setHand((prev) => ({ ...prev, preflopActions: [] }));
            };

  const onWizardStepChange = useCallback(
    (_nextStep: number, fromStep: number) => {
      if (fromStep === 4 && !hand.heroPosition) {
        updateHandState("heroPosition", positions[0]);
        updateHandState("heroPositionIndex", 0);
      }
    },
    [hand.heroPosition, positions]
  );

  const { goNext, goBack } = useHandWizardNavigation(
    wizardStep,
    setWizardStep,
    hand,
    streetState,
    bigBlind,
    onWizardStepChange,
    { initStreetState, positions }
  );

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
                        if (cardIdx < 2) {
                            setWizardStep((s) => s + 1);
                        }
                    }
                );
            };

            const handleTurnCardInput = (key: "rank" | "suit", val: string) => {
                applyCardInput({ zone: "turn" }, key, val);
            };

            const handleRiverCardInput = (key: "rank" | "suit", val: string) => {
                applyCardInput({ zone: "river" }, key, val);
            };

            const usedCardsFor = (slot: CardSlot) =>
                Array.from(getUsedCardKeys(hand, slot));

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
                            onClick={wizardStep > 3 ? goBack : onCancel}
                            className="p-1.5 hover:bg-slate-900 rounded-lg transition-colors text-slate-400"
                        >
                            {wizardStep > 3 ? <ChevronLeft className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </button>
                        <div className="text-center">
                            <span className="text-[9px] text-poker-accent font-extrabold uppercase tracking-widest">Hand Wizard</span>
                            <h3 className="font-extrabold text-sm text-white">{getStepTitle(wizardStep, hand, selectedVillainIndex)}</h3>
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
                        
                        {(wizardStep === 3 || wizardStep === 4 || wizardStep === 8) && (
                            <WizardStepSetup
                                wizardStep={wizardStep}
                                hand={hand}
                                bigBlind={bigBlind}
                                tableSize={tableSize}
                                positions={positions}
                                onHandChange={(updates) =>
                                    setHand((h) => ({ ...h, ...updates }))
                                }
                                onNext={goNext}
                                onNavigateToStep={setWizardStep}
                            />
                        )}

                        {wizardStep === 5 && (
                            <WizardCardInput
                                label="Select Rank & Suit for Hero Card 1."
                                card={hand.heroCards[0]}
                                usedCards={usedCardsFor({ zone: "hero", index: 0 })}
                                onCardChange={(key, val) => handleHeroCardInput(0, key, val)}
                                getSuitColor={getSuitColor}
                            />
                        )}

                        {wizardStep === 6 && (
                            <WizardCardInput
                                label="Select Rank & Suit for Hero Card 2."
                                card={hand.heroCards[1]}
                                usedCards={usedCardsFor({ zone: "hero", index: 1 })}
                                onCardChange={(key, val) => handleHeroCardInput(1, key, val)}
                                getSuitColor={getSuitColor}
                                preview={
                                    <div className="flex gap-2 justify-center mb-1">
                                        <CardFacePreview
                                            card={hand.heroCards[0]}
                                            getSuitColor={getSuitColor}
                                            size="small"
                                            dimmed
                                        />
                                        <CardFacePreview
                                            card={hand.heroCards[1]}
                                            getSuitColor={getSuitColor}
                                        />
                                    </div>
                                }
                            />
                        )}

                        {wizardStep === 7 && (
                            <WizardStepHeroPreflop
                                hand={hand}
                                bigBlind={bigBlind}
                                onActionChange={(action, amount) =>
                                    setHand((h) => ({
                                        ...h,
                                        preflopAction: action,
                                        preflopAmount:
                                            amount !== undefined
                                                ? amount
                                                : h.preflopAmount,
                                        ...(action === "Fold"
                                            ? { preflopFolded: true }
                                            : {}),
                                    }))
                                }
                                onNext={() => setWizardStep(8)}
                            />
                        )}

                        {wizardStep === 9 && (
                            <WizardStepVillainProfile
                                hand={hand}
                                selectedVillainIndex={selectedVillainIndex}
                                setSelectedVillainIndex={setSelectedVillainIndex}
                                bigBlind={bigBlind}
                                villainPositionOptions={
                                    villainPositionOptions.length > 0
                                        ? villainPositionOptions
                                        : positions
                                }
                                villainPositionHint={villainPositionHint}
                                onVillainChange={(villains) =>
                                    setHand((h) => ({ ...h, villains }))
                                }
                                onNext={goNext}
                            />
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

                        {wizardStep === 11 && (
                            <>
                                <WizardCardInput
                                    label="Select Rank & Suit for Flop Card 1."
                                    card={hand.boardFlop[0]}
                                    usedCards={usedCardsFor({ zone: "flop", index: 0 })}
                                    onCardChange={(key, val) =>
                                        handleFlopCardInput(0, key, val)
                                    }
                                    getSuitColor={getSuitColor}
                                />
                                <button
                                    type="button"
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </>
                        )}

                        {wizardStep === 12 && (
                            <>
                                <WizardCardInput
                                    label="Select Rank & Suit for Flop Card 2."
                                    card={hand.boardFlop[1]}
                                    usedCards={usedCardsFor({ zone: "flop", index: 1 })}
                                    onCardChange={(key, val) =>
                                        handleFlopCardInput(1, key, val)
                                    }
                                    getSuitColor={getSuitColor}
                                    preview={
                                        <div className="flex gap-2 justify-center mb-1">
                                            <CardFacePreview
                                                card={hand.boardFlop[0]}
                                                getSuitColor={getSuitColor}
                                                size="small"
                                                dimmed
                                            />
                                            <CardFacePreview
                                                card={hand.boardFlop[1]}
                                                getSuitColor={getSuitColor}
                                            />
                                        </div>
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </>
                        )}

                        {wizardStep === 13 && (
                            <>
                                <WizardCardInput
                                    label="Select Rank & Suit for Flop Card 3."
                                    card={hand.boardFlop[2]}
                                    usedCards={usedCardsFor({ zone: "flop", index: 2 })}
                                    onCardChange={(key, val) =>
                                        handleFlopCardInput(2, key, val)
                                    }
                                    getSuitColor={getSuitColor}
                                    preview={
                                        <div className="flex gap-2 justify-center mb-1">
                                            <CardFacePreview
                                                card={hand.boardFlop[0]}
                                                getSuitColor={getSuitColor}
                                                size="small"
                                                dimmed
                                            />
                                            <CardFacePreview
                                                card={hand.boardFlop[1]}
                                                getSuitColor={getSuitColor}
                                                size="small"
                                                dimmed
                                            />
                                            <CardFacePreview
                                                card={hand.boardFlop[2]}
                                                getSuitColor={getSuitColor}
                                            />
                                        </div>
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </>
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

                        {wizardStep === 15 && (
                            <>
                                <WizardCardInput
                                    label="Select Rank & Suit for the Turn Board Card."
                                    card={hand.boardTurn}
                                    usedCards={usedCardsFor({ zone: "turn" })}
                                    onCardChange={(key, val) => handleTurnCardInput(key, val)}
                                    getSuitColor={getSuitColor}
                                />
                                <button
                                    type="button"
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </>
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

                        {wizardStep === 17 && (
                            <>
                                <WizardCardInput
                                    label="Select Rank & Suit for the River Board Card."
                                    card={hand.boardRiver}
                                    usedCards={usedCardsFor({ zone: "river" })}
                                    onCardChange={(key, val) => handleRiverCardInput(key, val)}
                                    getSuitColor={getSuitColor}
                                />
                                <button
                                    type="button"
                                    onClick={skipToOutcome}
                                    className="w-full mt-2 py-2 bg-slate-900 border border-slate-800 text-xs text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition-colors"
                                >
                                    Hand Terminated Early? Skip to Result
                                </button>
                            </>
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

                        {(wizardStep === 19 || wizardStep === 20) && (
                            <WizardStepOutcome
                                wizardStep={wizardStep}
                                hand={hand}
                                onHandChange={(updates) =>
                                    setHand((h) => ({ ...h, ...updates }))
                                }
                                onSave={() =>
                                    onSave({
                                        ...hand,
                                        potByStreet: {
                                            ...hand.potByStreet,
                                            ...streetState.potByStreet,
                                        },
                                    })
                                }
                                onBack={goBack}
                                isEditing={isEditing}
                            />
                        )}

                    </div>

                    {/* Navigation Buttons Row */}
                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={wizardStep > 3 ? goBack : onCancel}
                            className="flex-1 py-3.5 bg-slate-950 border border-slate-900 hover:border-slate-800 rounded-xl font-bold text-xs text-slate-400"
                        >
                            {wizardStep > 3 ? "Back" : "Cancel"}
                        </button>
                        
                        {shouldShowContinueButton(wizardStep, hand) &&
                            wizardStep !== 9 &&
                            wizardStep !== 20 && (
                                <button
                                    type="button"
                                    onClick={goNext}
                                    disabled={!isStepComplete(wizardStep, hand)}
                                    className="flex-1 py-3.5 bg-poker-primary text-slate-950 font-black rounded-xl text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Continue
                                </button>
                            )}
                    </div>
                </div>
            );
        }

        