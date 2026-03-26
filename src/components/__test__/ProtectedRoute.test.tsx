import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';

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
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
    authExpiredMessage: null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    checkAuth: vi.fn().mockResolvedValue(false),
    clearAuthExpiredMessage: vi.fn(),
    ...overrides,
});

const renderProtectedRoute = () => {
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <div>Protected Content</div>
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<div>Login Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('ProtectedRoute', () => {
    beforeEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
    });

    afterEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
        vi.restoreAllMocks();
    });

    it('載入驗證中時應顯示 loading 畫面', () => {
        authRefs.mockAuthValue = createMockAuthValue({ isLoading: true });

        renderProtectedRoute();

        expect(screen.getByText('驗證中...')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('未登入時應重新導向到登入頁', async () => {
        authRefs.mockAuthValue = createMockAuthValue({
            isLoading: false,
            isAuthenticated: false,
        });

        renderProtectedRoute();

        expect(await screen.findByText('Login Stub')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('已登入時應渲染受保護內容', () => {
        authRefs.mockAuthValue = createMockAuthValue({
            user: { username: 'dean', role: 'admin' },
            token: 'fake.jwt.token',
            isAuthenticated: true,
        });

        renderProtectedRoute();

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});