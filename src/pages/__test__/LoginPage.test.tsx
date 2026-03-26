import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { LoginPage } from '../LoginPage';
import { SCENARIO_KEYS } from '../../mocks/handlers';

type AuthModule = typeof import('../../context/AuthContext');

const authRefs = vi.hoisted(() => ({
    actualUseAuth: null as AuthModule['useAuth'] | null,
    authMode: 'mock' as 'actual' | 'mock',
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
    authRefs.actualUseAuth = actual.useAuth;

    return {
        ...actual,
        useAuth: () => {
            if (authRefs.authMode === 'actual') {
                if (!authRefs.actualUseAuth) {
                    throw new Error('actual useAuth 尚未初始化');
                }
                return authRefs.actualUseAuth();
            }

            if (!authRefs.mockAuthValue) {
                throw new Error('mockAuthValue 尚未設定');
            }

            return authRefs.mockAuthValue;
        },
    };
});

const createMockAuthValue = (overrides?: Partial<NonNullable<typeof authRefs.mockAuthValue>>) => ({
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

const renderWithMockAuth = () => {
    render(
        <MemoryRouter initialEntries={['/login']}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<div>Dashboard Stub</div>} />
            </Routes>
        </MemoryRouter>
    );
};

const renderWithActualAuth = () => {
    authRefs.authMode = 'actual';

    render(
        <MemoryRouter initialEntries={['/login']}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<div>Dashboard Stub</div>} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>
    );
};

describe('LoginPage', () => {
    beforeEach(() => {
        authRefs.authMode = 'mock';
        authRefs.mockAuthValue = createMockAuthValue();
    });

    afterEach(() => {
        authRefs.authMode = 'mock';
        authRefs.mockAuthValue = createMockAuthValue();
        vi.restoreAllMocks();
    });

    describe('前端元素', () => {
        it('首次進入登入頁時應顯示登入表單基本元素與測試帳號提示', () => {
            renderWithMockAuth();

            expect(screen.getByRole('heading', { name: '歡迎回來' })).toBeInTheDocument();
            expect(screen.getByText('請登入以繼續')).toBeInTheDocument();
            expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
            expect(screen.getByLabelText('密碼')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
            expect(
                screen.getByText('測試帳號：任意 email 格式 / 密碼需包含英數且8位以上')
            ).toBeInTheDocument();
        });
    });

    describe('function 邏輯', () => {
        it('送出非法 Email 時應顯示 Email 格式錯誤且不呼叫登入流程', async () => {
            const user = userEvent.setup();
            const loginSpy = vi.fn().mockResolvedValue(undefined);
            authRefs.mockAuthValue = createMockAuthValue({ login: loginSpy });

            renderWithMockAuth();

            await user.type(screen.getByLabelText('電子郵件'), 'invalid-email');
            await user.type(screen.getByLabelText('密碼'), 'abc12345');
            await user.click(screen.getByRole('button', { name: '登入' }));

            expect(screen.getByText('請輸入有效的 Email 格式')).toBeInTheDocument();
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            expect(loginSpy).not.toHaveBeenCalled();
        });

        it('送出少於 8 碼的密碼時應顯示密碼長度錯誤且不呼叫登入流程', async () => {
            const user = userEvent.setup();
            const loginSpy = vi.fn().mockResolvedValue(undefined);
            authRefs.mockAuthValue = createMockAuthValue({ login: loginSpy });

            renderWithMockAuth();

            await user.type(screen.getByLabelText('電子郵件'), 'user@example.com');
            await user.type(screen.getByLabelText('密碼'), 'abc1234');
            await user.click(screen.getByRole('button', { name: '登入' }));

            expect(screen.getByText('密碼必須至少 8 個字元')).toBeInTheDocument();
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            expect(loginSpy).not.toHaveBeenCalled();
        });

        it('送出未同時包含英文字母與數字的密碼時應顯示格式錯誤且不呼叫登入流程', async () => {
            const user = userEvent.setup();
            const loginSpy = vi.fn().mockResolvedValue(undefined);
            authRefs.mockAuthValue = createMockAuthValue({ login: loginSpy });

            renderWithMockAuth();

            await user.type(screen.getByLabelText('電子郵件'), 'user@example.com');
            await user.type(screen.getByLabelText('密碼'), 'abcdefgh');
            await user.click(screen.getByRole('button', { name: '登入' }));

            expect(screen.getByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            expect(loginSpy).not.toHaveBeenCalled();
        });
    });

    describe('Mock API', () => {
        it('登入請求進行中時應停用欄位與按鈕並顯示登入中狀態', async () => {
            const user = userEvent.setup();
            localStorage.setItem(SCENARIO_KEYS.delay, '200');

            renderWithActualAuth();

            await user.type(screen.getByLabelText('電子郵件'), 'user@example.com');
            await user.type(screen.getByLabelText('密碼'), 'abc12345');
            await user.click(screen.getByRole('button', { name: '登入' }));

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: /登入中\.\.\./ });

            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(submitButton).toBeDisabled();
            expect(submitButton.querySelector('.button-spinner')).toBeInTheDocument();
        });

        it('登入成功時應呼叫 login 並導向 dashboard', async () => {
            const user = userEvent.setup();

            renderWithActualAuth();

            await user.type(screen.getByLabelText('電子郵件'), 'user@example.com');
            await user.type(screen.getByLabelText('密碼'), 'abc12345');
            await user.click(screen.getByRole('button', { name: '登入' }));

            await waitFor(() => {
                expect(screen.getByText('Dashboard Stub')).toBeInTheDocument();
            });

            expect(screen.queryByRole('heading', { name: '歡迎回來' })).not.toBeInTheDocument();
        });

        it('登入失敗時應顯示後端錯誤訊息並結束 loading 狀態', async () => {
            const user = userEvent.setup();
            localStorage.setItem(SCENARIO_KEYS.login, 'email_not_found');

            renderWithActualAuth();

            await user.type(screen.getByLabelText('電子郵件'), 'user@example.com');
            await user.type(screen.getByLabelText('密碼'), 'abc12345');
            await user.click(screen.getByRole('button', { name: '登入' }));

            const alert = await screen.findByRole('alert');

            expect(alert).toHaveTextContent('帳號不存在');
            expect(screen.getByLabelText('電子郵件')).not.toBeDisabled();
            expect(screen.getByLabelText('密碼')).not.toBeDisabled();
            expect(screen.getByRole('button', { name: '登入' })).toBeEnabled();
        });
    });

    describe('驗證權限', () => {
        it('當 AuthContext 提供 authExpiredMessage 時應顯示訊息並於讀取後清除', async () => {
            const clearAuthExpiredMessage = vi.fn();
            authRefs.mockAuthValue = createMockAuthValue({
                authExpiredMessage: '登入已過期，請重新登入',
                clearAuthExpiredMessage,
            });

            renderWithMockAuth();

            expect(await screen.findByRole('alert')).toHaveTextContent('登入已過期，請重新登入');
            expect(clearAuthExpiredMessage).toHaveBeenCalledTimes(1);
        });

        it('已登入使用者進入登入頁時應直接重新導向到 dashboard', async () => {
            authRefs.mockAuthValue = createMockAuthValue({
                user: { username: 'dean', role: 'admin' },
                token: 'fake.jwt.token',
                isAuthenticated: true,
            });

            renderWithMockAuth();

            await waitFor(() => {
                expect(screen.getByText('Dashboard Stub')).toBeInTheDocument();
            });

            expect(screen.queryByRole('heading', { name: '歡迎回來' })).not.toBeInTheDocument();
        });
    });
});