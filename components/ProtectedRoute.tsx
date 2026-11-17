import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPerfil } from '../types';

interface ProtectedRouteProps {
    allowedRoles?: UserPerfil[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return null; // Or a loading spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    // v4.57.0 (C5): troca de senha obrigatória bloqueia todo o sistema até ser feita
    if (user?.must_change_password && location.pathname !== '/trocar-senha') {
        return <Navigate to="/trocar-senha" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.perfil)) {
        // Redirect based on role if unauthorized for specific route
        if (user.perfil === 'COLABORADOR') return <Navigate to="/portal" replace />;
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
