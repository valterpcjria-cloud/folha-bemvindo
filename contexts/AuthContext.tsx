import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/mockApi';
import { THEME } from '../constants/theme';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    selectedCompanyId: number | null;
    setCompanyContext: (id: number | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos de inatividade

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(api.getCompanyContext());
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const logout = useCallback(() => {
        api.logout();
        api.setCompanyContext(null);
        setUser(null);
        setSelectedCompanyId(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    // Reinicia o timer de inatividade a cada ação do usuário
    const resetInactivityTimer = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            logout();
        }, SESSION_TIMEOUT_MS);
    }, [logout]);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = api.getCurrentUser();
            if (storedUser) {
                setUser(storedUser);
                setSelectedCompanyId(api.getCompanyContext());
            }
            setTimeout(() => setIsLoading(false), THEME.animation.initFade);
        };
        initAuth();
    }, []);

    // Monitora atividade do usuário apenas quando autenticado
    useEffect(() => {
        if (!user) return;
        const events = ['mousemove', 'keydown', 'click', 'scroll'];
        events.forEach(e => window.addEventListener(e, resetInactivityTimer));
        resetInactivityTimer();
        return () => {
            events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [user, resetInactivityTimer]);

    const login = (userData: User) => {
        setUser(userData);
    };

    const setCompanyContext = (id: number | null) => {
        setSelectedCompanyId(id);
        api.setCompanyContext(id);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            logout,
            selectedCompanyId,
            setCompanyContext
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
