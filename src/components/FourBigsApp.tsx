"use client";

import { useEffect, useState } from "react";
import { playHaptic } from "@/lib/haptics";
import { getPositionsForSize } from "@/lib/positions";
import { createEmptyHand, loadSessions, saveSessions } from "@/lib/storage";
import type { AppStep, Hand, Session, SessionSetup } from "@/lib/types";
import { ActiveSessionView } from "./ActiveSessionView";
import { HandWizard } from "./HandWizard";
import { HomeView } from "./HomeView";
import { InstallPrompt } from "./InstallPrompt";
import { StartSessionView } from "./StartSessionView";
import { isStandaloneMode } from "@/lib/pwa";

export function FourBigsApp() {
  const [step, setStep] = useState<AppStep>("HOME");
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [wizardStep, setWizardStep] = useState(3);
  const [currentHand, setCurrentHand] = useState<Hand | null>(null);
  const [selectedVillainIndex, setSelectedVillainIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  useEffect(() => {
    setPastSessions(loadSessions());
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsInstalled(isStandaloneMode());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const saveSessionsToStorage = (updated: Session[]) => {
    saveSessions(updated);
    setPastSessions(updated);
  };

  const handleStartSession = (setupData: SessionSetup) => {
    playHaptic("success");
    const newSession: Session = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      stakes: setupData.stakes,
      tableSize: Number(setupData.tableSize),
      roomName: setupData.roomName || "Unnamed Poker Room",
      startingStack: setupData.startingStack || "100 BB",
      hands: [],
      netAmount: 0,
    };
    setActiveSession(newSession);
    setStep("ACTIVE_SESSION");
  };

  const startNewHand = () => {
    playHaptic("click");
    setSelectedVillainIndex(0);
    setCurrentHand(createEmptyHand());
    setWizardStep(3);
    setStep("HAND_WIZARD");
  };

  const handleSaveHand = (handData: Hand) => {
    if (!activeSession) return;
    playHaptic("success");
    const updatedHands = [handData, ...activeSession.hands];

    const netChange = Number(handData.resultAmount) || 0;
    let outcomeMultiplier = 1;
    if (handData.result === "Lost") outcomeMultiplier = -1;
    else if (handData.result === "Split") outcomeMultiplier = 0.5;

    const actualHandChange = netChange * outcomeMultiplier;
    const newNet = activeSession.netAmount + actualHandChange;

    setActiveSession({
      ...activeSession,
      hands: updatedHands,
      netAmount: newNet,
    });
    setStep("ACTIVE_SESSION");
  };

  const handleEndSession = () => {
    if (!activeSession) return;
    playHaptic("success");
    const finalizedSession: Session = {
      ...activeSession,
      endTime: new Date().toISOString(),
    };
    const updatedList = [finalizedSession, ...pastSessions];
    saveSessionsToStorage(updatedList);
    setActiveSession(null);
    setStep("HOME");
    setShowEndConfirm(false);
  };

  const handleDeleteSession = (id: string) => {
    playHaptic("delete");
    const filter = pastSessions.filter((s) => s.id !== id);
    saveSessionsToStorage(filter);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#090d16] border-x border-slate-900 shadow-2xl relative">
      <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md px-4 py-3 border-b border-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <span className="font-extrabold text-emerald-500 text-lg">4</span>
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              4 BIGS
            </h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase">Poker Log Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOffline ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Offline
            </span>
          ) : isInstalled ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Installed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Online
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-8">
        {step === "HOME" && (
          <HomeView
            pastSessions={pastSessions}
            onStartClick={() => {
              playHaptic("click");
              setStep("START_SESSION");
            }}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {step === "START_SESSION" && (
          <StartSessionView
            onStart={handleStartSession}
            onCancel={() => {
              playHaptic("click");
              setStep("HOME");
            }}
          />
        )}

        {step === "ACTIVE_SESSION" && activeSession && (
          <ActiveSessionView
            session={activeSession}
            onAddHand={startNewHand}
            onEndClick={() => {
              playHaptic("click");
              setShowEndConfirm(true);
            }}
          />
        )}

        {step === "HAND_WIZARD" && activeSession && currentHand && (
          <HandWizard
            initialHand={currentHand}
            tableSize={activeSession.tableSize}
            getPositionsForSize={getPositionsForSize}
            wizardStep={wizardStep}
            setWizardStep={setWizardStep}
            selectedVillainIndex={selectedVillainIndex}
            setSelectedVillainIndex={setSelectedVillainIndex}
            onSave={handleSaveHand}
            onCancel={() => {
              playHaptic("click");
              setStep("ACTIVE_SESSION");
            }}
          />
        )}
      </main>

      <InstallPrompt />

      {showEndConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Finalize Live Session?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will close the active tracking metrics, summarize your records, and archive the session locally.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-sm transition-all"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleEndSession}
                className="py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
