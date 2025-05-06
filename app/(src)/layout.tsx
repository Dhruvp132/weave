'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import useWebContainer from './hooks/useWebContainer';
import WebContainerContext from './webcontainer-context';

export default function Layout({ children }: { children: React.ReactNode }) {
    const webcontainer = useWebContainer();

    return (
        <div>
            <WebContainerContext.Provider value={webcontainer}>
                {children}
            </WebContainerContext.Provider>
        </div>
    );
}