---
description: LoginPage 測試案例
---

> 狀態：初始為 [ ]、完成為 [x]
> 注意：狀態只能在測試通過後由流程更新。
> 測試類型：前端元素、function 邏輯、Mock API、驗證權限

---

## [x] 【前端元素】首次進入登入頁時應顯示登入表單基本元素與測試帳號提示
**範例輸入**：使用者進入 `/login`，尚未輸入任何欄位，且專案未設定 `VITE_API_URL`
**期待輸出**：畫面顯示「歡迎回來」、「請登入以繼續」、電子郵件欄位、密碼欄位、登入按鈕，以及「測試帳號：任意 email 格式 / 密碼需包含英數且8位以上」提示文字

---

## [x] 【function 邏輯】送出非法 Email 時應顯示 Email 格式錯誤且不呼叫登入流程
**範例輸入**：Email 輸入 `invalid-email`，密碼輸入 `abc12345`，點擊登入
**期待輸出**：畫面顯示「請輸入有效的 Email 格式」，不顯示 API 錯誤訊息，且不應送出登入請求

---

## [x] 【function 邏輯】送出少於 8 碼的密碼時應顯示密碼長度錯誤且不呼叫登入流程
**範例輸入**：Email 輸入 `user@example.com`，密碼輸入 `abc1234`，點擊登入
**期待輸出**：畫面顯示「密碼必須至少 8 個字元」，不顯示 API 錯誤訊息，且不應送出登入請求

---

## [x] 【function 邏輯】送出未同時包含英文字母與數字的密碼時應顯示格式錯誤且不呼叫登入流程
**範例輸入**：Email 輸入 `user@example.com`，密碼輸入 `abcdefgh`，點擊登入
**期待輸出**：畫面顯示「密碼必須包含英文字母和數字」，不顯示 API 錯誤訊息，且不應送出登入請求

---

## [x] 【Mock API】登入請求進行中時應停用欄位與按鈕並顯示登入中狀態
**範例輸入**：設定 Mock API 延遲，Email 輸入 `user@example.com`，密碼輸入 `abc12345`，點擊登入
**期待輸出**：送出後電子郵件欄位、密碼欄位與登入按鈕皆為 disabled，按鈕文字顯示「登入中...」並帶有 loading 樣式

---

## [x] 【Mock API】登入成功時應呼叫 login 並導向 dashboard
**範例輸入**：Email 輸入 `user@example.com`，密碼輸入 `abc12345`，Mock API 回傳登入成功
**期待輸出**：登入流程完成後導向 `/dashboard`，登入頁內容不再顯示

---

## [x] 【Mock API】登入失敗時應顯示後端錯誤訊息並結束 loading 狀態
**範例輸入**：Email 輸入 `user@example.com`，密碼輸入 `abc12345`，Mock API 回傳 `帳號不存在` 或 `密碼錯誤`
**期待輸出**：畫面以 alert 顯示後端回傳錯誤訊息，欄位與登入按鈕恢復可操作，按鈕文字回到「登入」

---

## [x] 【驗證權限】當 AuthContext 提供 authExpiredMessage 時應顯示訊息並於讀取後清除
**範例輸入**：登入頁初始化時 `authExpiredMessage` 為 `登入已過期，請重新登入`
**期待輸出**：畫面顯示對應錯誤 banner，且 `clearAuthExpiredMessage` 應被呼叫一次以清除訊息

---

## [x] 【驗證權限】已登入使用者進入登入頁時應直接重新導向到 dashboard
**範例輸入**：登入頁初始化時 `isAuthenticated` 為 `true`
**期待輸出**：元件掛載後立即導向 `/dashboard`，避免已登入使用者停留在登入頁