import React, { createContext, useContext } from 'react';
import { legacyApiAdapter, type LegacyApiAdapter } from './legacyBridge';

const VeloxAPIContext = createContext<LegacyApiAdapter>(legacyApiAdapter);

export const VeloxAPIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <VeloxAPIContext.Provider value={legacyApiAdapter}>
            {children}
        </VeloxAPIContext.Provider>
    );
};

export const useVeloxAPI = (): LegacyApiAdapter => useContext(VeloxAPIContext);
