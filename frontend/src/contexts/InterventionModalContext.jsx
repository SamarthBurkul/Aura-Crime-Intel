import React, { createContext, useContext, useState, useCallback } from 'react';

const InterventionModalContext = createContext(null);

export function InterventionModalProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [payload, setPayload] = useState(null);

    const openIntervention = useCallback((newPayload) => {
        setPayload(newPayload);
        setIsOpen(true);
    }, []);

    const closeIntervention = useCallback(() => {
        setIsOpen(false);
        // Keep payload until fully closed so exit animation sees it
        setTimeout(() => setPayload(null), 350);
    }, []);

    return (
        <InterventionModalContext.Provider
            value={{ isOpen, payload, openIntervention, closeIntervention }}
        >
            {children}
        </InterventionModalContext.Provider>
    );
}

export function useInterventionModal() {
    const ctx = useContext(InterventionModalContext);
    if (!ctx) {
        throw new Error('useInterventionModal must be used inside <InterventionModalProvider>');
    }
    return ctx;
}
