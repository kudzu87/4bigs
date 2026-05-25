"use client";

import { useState } from "react";
import { ChevronLeft, XCircle } from "lucide-react";
import {
  ACTIONS,
  PROFILE_TAGS,
  RANKS,
  REVIEW_TAGS,
  SUITS,
} from "@/lib/constants";
import { playHaptic } from "@/lib/haptics";
import { getPostflopWeight } from "@/lib/positions";
import type { Hand, StreetState } from "@/lib/types";
import { PostflopLiveActionLogger } from "./PostflopLiveActionLogger";

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
}: HandWizardProps) {
  const [hand, setHand] = useState<Hand>(initialHand);

  const [streetState, setStreetState] = useState<StreetState>({
    street: "flop",
    players: [],
    history: [],
    currentActorIndex: 0,
    highestBet: 0,
    lastRaiserId: null,
    showBetSizes: false,
    currentActionPending: "",
  });

            

            const positions = getPositionsForSize(tableSize);

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
                if (wizardStep === 12) {
                    initStreetState('flop');
                } else if (wizardStep === 14) {
                    initStreetState('turn');
                } else if (wizardStep === 16) {
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
                setWizardStep(18); // Hand Outcome screen is now Step 18 due to Hero Card Split Screen
            };

            const initStreetState = (streetName: "flop" | "turn" | "river") => {
                // Determine who is still active at the start of this street
                let roster = [];

                // 1. Hero
                const heroFoldedPreflop = hand.preflopAction === 'Fold';
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

                setStreetState({
                    street: streetName,
                    players: sortedActive,
                    history: [],
                    currentActorIndex: 0,
                    highestBet: 0,
                    lastRaiserId: null,
                    showBetSizes: false,
                    currentActionPending: ''
                });
            };

            const handlePlayerAction = (actionType: string, sizing = "") => {
                const currentActor = streetState.players[streetState.currentActorIndex];
                const updatedPlayers = streetState.players.map((p, idx) => {
                    if (idx === streetState.currentActorIndex) {
                        let finalContribution = p.contribution;
                        let lastAct = actionType;
                        
                        if (actionType === 'Check') {
                            lastAct = 'Check';
                        } else if (actionType === 'Bet') {
                            lastAct = 'Bet';
                            finalContribution = 1; // Simple bet index matching
                        } else if (actionType === 'Call') {
                            lastAct = 'Call';
                            finalContribution = streetState.highestBet;
                        } else if (actionType === 'Raise') {
                            lastAct = 'Raise';
                            finalContribution = streetState.highestBet + 1;
                        }

                        return {
                            ...p,
                            lastAction: lastAct,
                            contribution: finalContribution,
                            actedThisRound: true,
                            folded: actionType === 'Fold' ? true : p.folded
                        };
                    }
                    return p;
                });

                // Compute overall histories & action details
                let actionText = `${currentActor.label} (${currentActor.position}) ${actionType}`;
                if (sizing) {
                    actionText += ` [${sizing}]`;
                }
                const updatedHistory = [...streetState.history, actionText];

                // Calculate updated state limits
                let nextHighestBet = streetState.highestBet;
                let nextLastRaiserId = streetState.lastRaiserId;

                if (actionType === 'Bet') {
                    nextHighestBet = 1;
                    nextLastRaiserId = currentActor.id;
                } else if (actionType === 'Raise') {
                    nextHighestBet = streetState.highestBet + 1;
                    nextLastRaiserId = currentActor.id;
                } else if (actionType === 'Fold') {
                    // Update main hand fold configurations globally
                    if (currentActor.isHero) {
                        setHand(prev => ({ ...prev, [`${streetState.street}Folded`]: true }));
                    } else {
                        const vIndex = parseInt(currentActor.id.replace('villain_', ''));
                        const updatedVillains = [...hand.villains];
                        updatedVillains[vIndex][`${streetState.street}Folded`] = true;
                        setHand(prev => ({ ...prev, villains: updatedVillains }));
                    }
                }

                // Check remaining active players who are not folded
                const activeRemaining = updatedPlayers.filter(p => !p.folded);

                // Early check: if only 1 player remains in the hand, skip directly to the Outcomes result screen (Step 18)
                if (activeRemaining.length <= 1) {
                    playHaptic('success');
                    setHand(prev => ({
                        ...prev,
                        [`${streetState.street}Actions`]: updatedHistory
                    }));
                    setTimeout(() => {
                        setWizardStep(18); // Outcomes step (was 17)
                    }, 400);
                    return;
                }

                // Find next actor's index
                let nextIdx = (streetState.currentActorIndex + 1) % updatedPlayers.length;
                while (updatedPlayers[nextIdx].folded) {
                    nextIdx = (nextIdx + 1) % updatedPlayers.length;
                }

                // Determine if betting round is fully satisfied:
                let roundComplete = false;

                if (nextHighestBet === 0) {
                    // Unopened street: satisfied if everyone active has checked once
                    const allActed = updatedPlayers.filter(p => !p.folded).every(p => p.actedThisRound);
                    if (allActed) {
                        roundComplete = true;
                    }
                } else {
                    // Opened street: satisfied if the next actor's contribution matches the highest bet and they have already acted
                    const nextActor = updatedPlayers[nextIdx];
                    if (nextActor.contribution === nextHighestBet && nextActor.actedThisRound) {
                        roundComplete = true;
                    }
                }

                if (roundComplete) {
                    playHaptic('success');
                    // Save actions log directly to the hand state
                    const savedHand = {
                        ...hand,
                        [`${streetState.street}Actions`]: updatedHistory
                    };
                    setHand(savedHand);

                    // Move to next stage step in order
                    setTimeout(() => {
                        if (streetState.street === 'flop') {
                            setWizardStep(14); // Turn Board Card Setup (was 13)
                        } else if (streetState.street === 'turn') {
                            setWizardStep(16); // River Board Card Setup (was 15)
                        } else if (streetState.street === 'river') {
                            setWizardStep(18); // Outcomes screen (was 17)
                        }
                    }, 400);
                } else {
                    // Continue the active betting street round
                    setStreetState(prev => ({
                        ...prev,
                        players: updatedPlayers,
                        history: updatedHistory,
                        currentActorIndex: nextIdx,
                        highestBet: nextHighestBet,
                        lastRaiserId: nextLastRaiserId,
                        showBetSizes: false,
                        currentActionPending: ''
                    }));
                }
            };

            const getStepTitle = (s: number) => {
                switch(s) {
                    case 3: return "Step 3: Effective Stack";
                    case 4: return "Step 4: Your Position";
                    case 5: return "Step 5: Hero Card 1";
                    case 6: return "Step 6: Hero Card 2";
                    case 7: return "Step 7: Preflop Action";
                    case 8: return "Step 8: Villain Count";
                    case 9: return `Step 9: Villain Profile (${selectedVillainIndex + 1}/${hand.villainCount})`;
                    case 10: return "Step 10: Flop Card 1";
                    case 11: return "Step 11: Flop Card 2";
                    case 12: return "Step 12: Flop Card 3";
                    case 13: return "Step 13: Flop Live Action";
                    case 14: return "Step 14: Turn Board Card";
                    case 15: return "Step 15: Turn Live Action";
                    case 16: return "Step 16: River Board Card";
                    case 17: return "Step 17: River Live Action";
                    case 18: return "Step 18: Hand Outcome";
                    case 19: return "Step 19: Notes & Analysis";
                    default: return "Configure Hand";
                }
            };

            const handleHeroCardInput = (cardIdx: number, key: "rank" | "suit", val: string) => {
                playHaptic('card');
                const updatedCards = [...hand.heroCards];
                updatedCards[cardIdx] = { ...updatedCards[cardIdx], [key]: val };
                
                setHand(prev => {
                    const next = { ...prev, heroCards: updatedCards };
                    const isCompleted = next.heroCards[cardIdx].rank && next.heroCards[cardIdx].suit;
                    if (isCompleted) {
                        setTimeout(() => {
                            setWizardStep(prevStep => prevStep + 1);
                        }, 250);
                    }
                    return next;
                });
            };

            const handleFlopCardInput = (cardIdx: number, key: "rank" | "suit", val: string) => {
                playHaptic('card');
                const updatedFlop = [...hand.boardFlop];
                updatedFlop[cardIdx] = { ...updatedFlop[cardIdx], [key]: val };
                
                setHand(prev => {
                    const next = { ...prev, boardFlop: updatedFlop };
                    const isCompleted = next.boardFlop[cardIdx].rank && next.boardFlop[cardIdx].suit;
                    if (isCompleted) {
                        setTimeout(() => {
                            if (cardIdx === 2) {
                                initStreetState('flop');
                            }
                            setWizardStep(prevStep => prevStep + 1);
                        }, 250);
                    }
                    return next;
                });
            };

            const handleTurnCardInput = (key: "rank" | "suit", val: string) => {
                playHaptic('card');
                const updatedTurn = { ...hand.boardTurn, [key]: val };
                
                setHand(prev => {
                    const next = { ...prev, boardTurn: updatedTurn };
                    if (next.boardTurn.rank && next.boardTurn.suit) {
                        setTimeout(() => {
                            initStreetState('turn');
                            setWizardStep(15); // Turn Live Action (was 14)
                        }, 250);
                    }
                    return next;
                });
            };

            const handleRiverCardInput = (key: "rank" | "suit", val: string) => {
                playHaptic('card');
                const updatedRiver = { ...hand.boardRiver, [key]: val };
                
                setHand(prev => {
                    const next = { ...prev, boardRiver: updatedRiver };
                    if (next.boardRiver.rank && next.boardRiver.suit) {
                        setTimeout(() => {
                            initStreetState('river');
                            setWizardStep(17); // River Live Action (was 16)
                        }, 250);
                    }
                    return next;
                });
            };

            const shouldShowContinueButton = () => {
                // Returns true if step needs a bottom Continue/Save button (not auto-advanced on tap grids)
                return ![3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17].includes(wizardStep);
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
                        {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(s => (
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
                                                    onClick={() => handleHeroCardInput(0, 'rank', r)}
                                                    className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                                                        hand.heroCards[0].rank === r ? 'bg-poker-primary text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                                    }`}
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
                                                    onClick={() => handleHeroCardInput(0, 'suit', s.symbol)}
                                                    className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                                                        hand.heroCards[0].suit === s.symbol ? `${s.bg} border-2` : 'bg-slate-900 border-slate-900 text-slate-400'
                                                    }`}
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
                                                    onClick={() => handleHeroCardInput(1, 'rank', r)}
                                                    className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                                                        hand.heroCards[1].rank === r ? 'bg-poker-primary text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                                    }`}
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
                                                    onClick={() => handleHeroCardInput(1, 'suit', s.symbol)}
                                                    className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                                                        hand.heroCards[1].suit === s.symbol ? `${s.bg} border-2` : 'bg-slate-900 border-slate-900 text-slate-400'
                                                    }`}
                                                >
                                                    <span className={s.color}>{s.symbol} {s.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 7: Preflop Action & Sizing Selection (was Step 6) */}
                        {wizardStep === 7 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Select your preflop action details.</p>
                                
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
                                                        preflopAmount: ''
                                                    }));
                                                    setTimeout(() => setWizardStep(8), 150);
                                                } else {
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
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-semibold block">Select Bet Sizing</label>
                                        
                                        <div className="grid grid-cols-4 gap-2">
                                            {['Small', 'Standard', 'Large', 'All-In'].map(size => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => {
                                                        playHaptic('success');
                                                        updateHandState('preflopAmount', size);
                                                        setTimeout(() => setWizardStep(8), 150);
                                                    }}
                                                    className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                                                        hand.preflopAmount === size 
                                                            ? 'bg-poker-accent text-slate-950 border-poker-accent glow-gold' 
                                                            : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-800'
                                                    }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Or custom action amount</span>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 15 BB or $30"
                                                    value={['Small', 'Standard', 'Large', 'All-In'].includes(hand.preflopAmount) ? '' : hand.preflopAmount}
                                                    onChange={(e) => updateHandState('preflopAmount', e.target.value)}
                                                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-900 focus:border-poker-primary text-white text-xs focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (hand.preflopAmount) {
                                                            playHaptic('success');
                                                            setWizardStep(8);
                                                        }
                                                    }}
                                                    className="px-4 bg-poker-primary text-slate-950 rounded-xl font-bold text-xs"
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 8: Villain Count (was Step 7) */}
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
                                                    setTimeout(() => setWizardStep(19), 200); // Direct jump to hand outcome notes screen (Step 19)
                                                } else {
                                                    updateHandState('villainCount', cnt);
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

                        {/* STEP 9: Villain Entries Loop (was Step 8) */}
                        {wizardStep === 9 && (
                            <div className="space-y-4 flex-1 animate-fadeIn">
                                <p className="text-xs text-slate-400 text-center">Specify attributes and action for Villain {selectedVillainIndex + 1}.</p>
                                
                                <div className="space-y-4">
                                    {/* Villain Position Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Villain Seat Position</label>
                                        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                                            {positions.map((pos, idx) => {
                                                const currentV = hand.villains[selectedVillainIndex] || {};
                                                const isSelected = currentV.position === pos;
                                                return (
                                                    <button
                                                        key={idx}
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

                                    {/* Villain Preflop Action */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preflop Action</label>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {['Fold', 'Call', 'Raise', '3-Bet', 'All-In'].map(act => {
                                                const currentV = hand.villains[selectedVillainIndex] || {};
                                                const isSelected = currentV.action === act;
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
                                                            isSelected ? 'bg-poker-accent text-slate-950 font-black' : 'bg-slate-950 border border-slate-900 text-slate-400 hover:bg-slate-900'
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

                        {/* STEP 10: Flop Card 1 Input (was Step 9) */}
                        {wizardStep === 10 && (
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
                                                    onClick={() => handleFlopCardInput(0, 'rank', r)}
                                                    className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                                                        hand.boardFlop[0].rank === r ? 'bg-poker-primary text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                                    }`}
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
                                                    onClick={() => handleFlopCardInput(0, 'suit', s.symbol)}
                                                    className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                                                        hand.boardFlop[0].suit === s.symbol ? `${s.bg} border-2` : 'bg-slate-900 border-slate-900 text-slate-400'
                                                    }`}
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

                        {/* STEP 11: Flop Card 2 Input (was Step 10) */}
                        {wizardStep === 11 && (
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
                                                    onClick={() => handleFlopCardInput(1, 'rank', r)}
                                                    className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                                                        hand.boardFlop[1].rank === r ? 'bg-poker-primary text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                                    }`}
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
                                                    onClick={() => handleFlopCardInput(1, 'suit', s.symbol)}
                                                    className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                                                        hand.boardFlop[1].suit === s.symbol ? `${s.bg} border-2` : 'bg-slate-900 border-slate-900 text-slate-400'
                                                    }`}
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

                        {/* STEP 12: Flop Card 3 Input (was Step 11) */}
                        {wizardStep === 12 && (
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
                                                    onClick={() => handleFlopCardInput(2, 'rank', r)}
                                                    className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                                                        hand.boardFlop[2].rank === r ? 'bg-poker-primary text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                                    }`}
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
                                                    onClick={() => handleFlopCardInput(2, 'suit', s.symbol)}
                                                    className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                                                        hand.boardFlop[2].suit === s.symbol ? `${s.bg} border-2` : 'bg-slate-900 border-slate-900 text-slate-400'
                                                    }`}
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

                        {/* STEP 13: FLOP LIVE ACTION STATE MACHINE (was Step 12) */}
                        {wizardStep === 13 && (
                            <PostflopLiveActionLogger 
                                streetState={streetState}
                                setStreetState={setStreetState}
                                handlePlayerAction={handlePlayerAction}
                                skipToOutcome={skipToOutcome}
                                getSuitColor={getSuitColor}
                                hand={hand}
                            />
                        )}

                        {/* STEP 14: Turn Board Card (was Step 13) */}
                        {wizardStep === 14 && (
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
                                                    onClick={() => handleTurnCardInput('rank', r)}
                                                    className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                                                        hand.boardTurn.rank === r ? 'bg-poker-primary text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                                    }`}
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
                                                    onClick={() => handleTurnCardInput('suit', s.symbol)}
                                                    className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                                                        hand.boardTurn.suit === s.symbol ? `${s.bg} border-2` : 'bg-slate-900 border-slate-900 text-slate-400'
                                                    }`}
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

                        {/* STEP 15: TURN LIVE ACTION STATE MACHINE (was Step 14) */}
                        {wizardStep === 15 && (
                            <PostflopLiveActionLogger 
                                streetState={streetState}
                                setStreetState={setStreetState}
                                handlePlayerAction={handlePlayerAction}
                                skipToOutcome={skipToOutcome}
                                getSuitColor={getSuitColor}
                                hand={hand}
                            />
                        )}

                        {/* STEP 16: River Board Card (was Step 15) */}
                        {wizardStep === 16 && (
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
                                                    onClick={() => handleRiverCardInput('rank', r)}
                                                    className={`px-2.5 py-1.5 rounded text-xs font-bold font-mono shrink-0 transition-all ${
                                                        hand.boardRiver.rank === r ? 'bg-poker-primary text-slate-950' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                                                    }`}
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
                                                    onClick={() => handleRiverCardInput('suit', s.symbol)}
                                                    className={`p-2.5 rounded-xl border text-sm text-center transition-all ${
                                                        hand.boardRiver.suit === s.symbol ? `${s.bg} border-2` : 'bg-slate-900 border-slate-900 text-slate-400'
                                                    }`}
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

                        {/* STEP 17: RIVER LIVE ACTION STATE MACHINE (was Step 16) */}
                        {wizardStep === 17 && (
                            <PostflopLiveActionLogger 
                                streetState={streetState}
                                setStreetState={setStreetState}
                                handlePlayerAction={handlePlayerAction}
                                skipToOutcome={skipToOutcome}
                                getSuitColor={getSuitColor}
                                hand={hand}
                            />
                        )}

                        {/* STEP 18: Hand Performance Outcome (was Step 17) */}
                        {wizardStep === 18 && (
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

                        {/* STEP 19: Notes & Review Strategy (was Step 18) */}
                        {wizardStep === 19 && (
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

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Review Tags</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {REVIEW_TAGS.map(tag => {
                                            const isSelected = hand.tags.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => {
                                                        playHaptic('click');
                                                        const activeTags = [...hand.tags];
                                                        if (isSelected) {
                                                            const filtered = activeTags.filter(t => t !== tag);
                                                            updateHandState('tags', filtered);
                                                        } else {
                                                            activeTags.push(tag);
                                                            updateHandState('tags', activeTags);
                                                        }
                                                    }}
                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        isSelected ? 'bg-poker-primary/20 text-poker-primary border border-poker-primary/40' : 'bg-slate-950 text-slate-500 hover:bg-slate-900 border border-transparent'
                                                    }`}
                                                >
                                                    #{tag}
                                                </button>
                                            );
                                        })}
                                    </div>
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
                            ) : wizardStep === 19 ? (
                                <button
                                    type="button"
                                    onClick={() => onSave(hand)}
                                    className="flex-1 py-3.5 bg-poker-primary text-slate-950 font-black rounded-xl text-xs transition-colors glow-green"
                                >
                                    SAVE HAND
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

        