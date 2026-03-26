import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleBasedRoute } from '../RoleBasedRoute';

type AuthModule = typeof import('../../context/AuthContext');

const authRefs = vi.hoisted(() => ({
    mockAuthValue: null as {
        user: { username: string; role: 'admin' | 'user' } | null;
        token: string | null;
        isLoading: boolean;
        isAuthenticated: boolean;
        authExpiredMessage: string | null;
        login: (email: string, password: string) => Promise<void>;
        logout: () => void;
        checkAuth: () => Promise<boolean>;
        clearAuthExpiredMessage: () => void;
    } | null,
}));

vi.mock('../../context/AuthContext', async (importOriginal) => {
    const actual = await importOriginal<AuthModule>();

    return {
        ...actual,
        useAuth: () => {
            if (!authRefs.mockAuthValue) {
                throw new Error('mockAuthValue 尚未設定');
            }

            return authRefs.mockAuthValue;
        },
    };
});

const createMockAuthValue = (
    overrides?: Partial<NonNullable<typeof authRefs.mockAuthValue>>
) => ({
    user: { username: 'dean', role: 'user' as const },
    token: 'fake.jwt.token',
    isLoading: false,
    isAuthenticated: true,
    authExpiredMessage: null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    checkAuth: vi.fn().mockResolvedValue(true),
    clearAuthExpiredMessage: vi.fn(),
    ...overrides,
});

const renderRoleBasedRoute = () => {
    render(
        <MemoryRouter initialEntries={['/admin']}>
            <Routes>
                <Route
                    path="/admin"
                    element={
                        <RoleBasedRoute allowedRoles={['admin']}>
                            <div>Admin Content</div>
                        </RoleBasedRoute>
                    }
                />
                <Route path="/dashboard" element={<div>Dashboard Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('RoleBasedRoute', () => {
    beforeEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
    });

    afterEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
        vi.restoreAllMocks();
    });

    it('載入權限中時應顯示 loading 畫面', () => {
        authRefs.mockAuthValue = createMockAuthValue({ isLoading: true });

        renderRoleBasedRoute();

        expect(screen.getByText('驗證權限中...')).toBeInTheDocument();
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('角色不符時應重新導向到 dashboard', async () => {
        authRefs.mockAuthValue = createMockAuthValue({
            user: { username: 'dean', role: 'user' },
        });

        renderRoleBasedRoute();

        expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('角色符合時應渲染授權內容', () => {
        authRefs.mockAuthValue = createMockAuthValue({
            user: { username: 'dean', role: 'admin' },
        });

        renderRoleBasedRoute();

        expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
});