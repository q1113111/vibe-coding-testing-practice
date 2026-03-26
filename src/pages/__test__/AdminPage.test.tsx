import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from '../AdminPage';

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
    user: { username: 'dean', role: 'admin' as const },
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

const renderAdminPage = () => {
    render(
        <MemoryRouter initialEntries={['/admin']}>
            <Routes>
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/dashboard" element={<div>Dashboard Stub</div>} />
                <Route path="/login" element={<div>Login Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('AdminPage', () => {
    beforeEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
    });

    afterEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
        vi.restoreAllMocks();
    });

    describe('前端元素', () => {
        it('進入管理後台時應顯示頁面標題與管理員說明內容', () => {
            renderAdminPage();

            expect(screen.getByRole('heading', { name: '🛠️ 管理後台' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: '管理員專屬頁面' })).toBeInTheDocument();
            expect(screen.getByText('只有 admin 角色可以訪問')).toBeInTheDocument();
            expect(screen.getByText('user 角色會被重定向')).toBeInTheDocument();
            expect(screen.getByText('受路由守衛保護')).toBeInTheDocument();
        });

        it('進入管理後台時應顯示返回儀表板連結與登出按鈕', () => {
            renderAdminPage();

            const backLink = screen.getByRole('link', { name: '← 返回' });
            expect(backLink).toHaveAttribute('href', '/dashboard');
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
        });
    });

    describe('驗證權限', () => {
        it('管理員進入管理後台時應顯示管理員角色標籤', () => {
            authRefs.mockAuthValue = createMockAuthValue({
                user: { username: 'dean', role: 'admin' },
            });

            renderAdminPage();

            expect(screen.getByText('管理員')).toBeInTheDocument();
        });

        it('若以非 admin 使用者資料渲染頁面時應顯示一般用戶角色標籤', () => {
            authRefs.mockAuthValue = createMockAuthValue({
                user: { username: 'dean', role: 'user' },
            });

            renderAdminPage();

            expect(screen.getByText('一般用戶')).toBeInTheDocument();
        });
    });

    describe('function 邏輯', () => {
        it('點擊返回連結時應可導向儀表板', async () => {
            const user = userEvent.setup();

            renderAdminPage();

            await user.click(screen.getByRole('link', { name: '← 返回' }));

            expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
        });

        it('點擊登出後應呼叫 logout 並導向登入頁', async () => {
            const user = userEvent.setup();
            const logout = vi.fn();
            authRefs.mockAuthValue = createMockAuthValue({ logout });

            renderAdminPage();

            await user.click(screen.getByRole('button', { name: '登出' }));

            expect(logout).toHaveBeenCalledTimes(1);
            expect(await screen.findByText('Login Stub')).toBeInTheDocument();
        });
    });
});