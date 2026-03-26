import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOKEN_KEY } from '../../api/axiosInstance';
import { SCENARIO_KEYS } from '../../mocks/handlers';
import { DashboardPage } from '../DashboardPage';

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

const renderDashboardPage = () => {
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/admin" element={<div>Admin Stub</div>} />
                <Route path="/login" element={<div>Login Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('DashboardPage', () => {
    beforeEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
        localStorage.setItem(TOKEN_KEY, 'fake.jwt.token');
    });

    afterEach(() => {
        authRefs.mockAuthValue = createMockAuthValue();
        vi.restoreAllMocks();
    });

    describe('前端元素', () => {
        it('一般使用者進入儀表板後應顯示歡迎資訊與商品區塊基本元素', async () => {
            renderDashboardPage();

            expect(screen.getByRole('heading', { name: '儀表板' })).toBeInTheDocument();
            expect(await screen.findByRole('heading', { name: 'Welcome, dean 👋' })).toBeInTheDocument();
            expect(screen.getByText('一般用戶')).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: '商品列表' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
        });
    });

    describe('驗證權限', () => {
        it('admin 角色進入儀表板時應顯示管理後台連結', async () => {
            authRefs.mockAuthValue = createMockAuthValue({
                user: { username: 'dean', role: 'admin' },
            });

            renderDashboardPage();

            await screen.findByRole('heading', { name: 'Welcome, dean 👋' });

            const adminLink = screen.getByRole('link', { name: '🛠️ 管理後台' });
            expect(adminLink).toHaveAttribute('href', '/admin');
        });

        it('一般 user 角色進入儀表板時不應顯示管理後台連結', async () => {
            authRefs.mockAuthValue = createMockAuthValue({
                user: { username: 'dean', role: 'user' },
            });

            renderDashboardPage();

            await screen.findByRole('heading', { name: 'Welcome, dean 👋' });

            expect(screen.queryByRole('link', { name: '🛠️ 管理後台' })).not.toBeInTheDocument();
        });
    });

    describe('Mock API', () => {
        it('商品資料載入中時應顯示 loading 畫面', async () => {
            localStorage.setItem(SCENARIO_KEYS.delay, '200');

            renderDashboardPage();

            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
            expect(screen.queryByText('筆記型電腦')).not.toBeInTheDocument();

            await screen.findByText('筆記型電腦');
        });

        it('商品 API 成功時應顯示商品列表內容', async () => {
            renderDashboardPage();

            expect(await screen.findByText('筆記型電腦')).toBeInTheDocument();
            expect(screen.getByText('無線滑鼠')).toBeInTheDocument();
            expect(screen.getByText('輕薄高效能筆記型電腦，適合工作與娛樂')).toBeInTheDocument();
            expect(screen.getByText('NT$ 25,000')).toBeInTheDocument();
        });

        it('商品 API 發生 server error 時應顯示錯誤訊息', async () => {
            localStorage.setItem(SCENARIO_KEYS.products, 'server_error');

            renderDashboardPage();

            expect(await screen.findByText('伺服器錯誤，請稍後再試')).toBeInTheDocument();
            expect(screen.queryByText('筆記型電腦')).not.toBeInTheDocument();
        });

        it('商品 API 回傳 401 時不應顯示一般錯誤訊息且 loading 應結束', async () => {
            localStorage.removeItem(TOKEN_KEY);

            renderDashboardPage();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.queryByText('無法載入商品資料')).not.toBeInTheDocument();
            expect(screen.queryByText('伺服器錯誤，請稍後再試')).not.toBeInTheDocument();
            expect(screen.queryByText('筆記型電腦')).not.toBeInTheDocument();
        });
    });

    describe('function 邏輯', () => {
        it('點擊登出後應呼叫 logout 並導向登入頁', async () => {
            const user = userEvent.setup();
            const logout = vi.fn();
            authRefs.mockAuthValue = createMockAuthValue({ logout });

            renderDashboardPage();

            await user.click(screen.getByRole('button', { name: '登出' }));

            expect(logout).toHaveBeenCalledTimes(1);
            expect(await screen.findByText('Login Stub')).toBeInTheDocument();
        });
    });
});