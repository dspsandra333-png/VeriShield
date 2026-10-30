import React, { createContext, useContext, useState, useCallback } from "react";

export interface DemoSteps {
  allowedSent: boolean;      // 1. Normal message ALLOWED
  redactedSent: boolean;     // 2. Private data REDACTED
  attackBlocked: boolean;    // 3. Attack BLOCKED
  outputCaught: boolean;     // 4. Output leak caught (OUTPUT_BLOCKED or OUTPUT_REDACTED)
  verifyPassed: boolean;     // 5. Verify passed
  tamperDetected: boolean;   // 6. Tamper detected (Verify FAIL after tamper)
  restoredPassed: boolean;   // 7. Restored and Verify passed again
}

interface DemoProgressContextType {
  steps: DemoSteps;
  hasTampered: boolean;
  markStep: (step: keyof DemoSteps) => void;
  setHasTampered: (val: boolean) => void;
  allDone: boolean;
  resetProgress: () => void;
}

const initialSteps: DemoSteps = {
  allowedSent: false,
  redactedSent: false,
  attackBlocked: false,
  outputCaught: false,
  verifyPassed: false,
  tamperDetected: false,
  restoredPassed: false,
};

const DemoProgressContext = createContext<DemoProgressContextType | undefined>(undefined);

export const DemoProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [steps, setSteps] = useState<DemoSteps>(initialSteps);
  const [hasTampered, setHasTampered] = useState<boolean>(false);

  const markStep = useCallback((step: keyof DemoSteps) => {
    setSteps((prev) => ({ ...prev, [step]: true }));
  }, []);

  const resetProgress = useCallback(() => {
    setSteps(initialSteps);
    setHasTampered(false);
  }, []);

  const allDone = Object.values(steps).every(Boolean);

  return (
    <DemoProgressContext.Provider
      value={{
        steps,
        hasTampered,
        markStep,
        setHasTampered,
        allDone,
        resetProgress,
      }}
    >
      {children}
    </DemoProgressContext.Provider>
  );
};

export function useDemoProgress(): DemoProgressContextType {
  const context = useContext(DemoProgressContext);
  if (!context) {
    throw new Error("useDemoProgress must be used within a DemoProgressProvider");
  }
  return context;
}

