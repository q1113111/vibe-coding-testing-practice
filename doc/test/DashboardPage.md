---
description: DashboardPage 測試案例
---

> 狀態：初始為 [ ]、完成為 [x]
> 注意：狀態只能在測試通過後由流程更新。
> 測試類型：前端元素、function 邏輯、Mock API、驗證權限

---

## [x] 【前端元素】一般使用者進入儀表板後應顯示歡迎資訊與商品區塊基本元素
**範例輸入**：使用者資料為 `username: dean`、`role: user`，成功進入 DashboardPage
**期待輸出**：畫面顯示「儀表板」、`Welcome, dean 👋`、`一般用戶` 標籤、`商品列表` 標題與 `登出` 按鈕

---

## [x] 【驗證權限】admin 角色進入儀表板時應顯示管理後台連結
**範例輸入**：使用者資料為 `username: dean`、`role: admin`，成功進入 DashboardPage
**期待輸出**：頁首導覽顯示 `🛠️ 管理後台` 連結，且連結目標為 `/admin`

---

## [x] 【驗證權限】一般 user 角色進入儀表板時不應顯示管理後台連結
**範例輸入**：使用者資料為 `username: dean`、`role: user`，成功進入 DashboardPage
**期待輸出**：頁首導覽不顯示 `🛠️ 管理後台` 連結

---

## [x] 【Mock API】商品資料載入中時應顯示 loading 畫面
**範例輸入**：進入 DashboardPage 時設定 Mock API 延遲，商品資料尚未回傳
**期待輸出**：畫面顯示 `載入商品中...` 與 loading 樣式，商品卡片尚未出現

---

## [x] 【Mock API】商品 API 成功時應顯示商品列表內容
**範例輸入**：進入 DashboardPage，Mock API 成功回傳商品資料
**期待輸出**：畫面顯示商品名稱、商品描述與格式化後價格，例如 `筆記型電腦`、`無線滑鼠`、`NT$ 25,000`

---

## [x] 【Mock API】商品 API 發生 server error 時應顯示錯誤訊息
**範例輸入**：進入 DashboardPage，Mock API 回傳 `伺服器錯誤，請稍後再試`
**期待輸出**：畫面顯示錯誤區塊與 `伺服器錯誤，請稍後再試` 訊息，不顯示商品卡片

---

## [x] 【Mock API】商品 API 回傳 401 時不應顯示一般錯誤訊息且 loading 應結束
**範例輸入**：進入 DashboardPage，商品 API 回傳 401 未授權
**期待輸出**：元件不顯示 `無法載入商品資料` 或 server error 訊息，loading 狀態結束並交由授權流程處理

---

## [x] 【function 邏輯】點擊登出後應呼叫 logout 並導向登入頁
**範例輸入**：使用者已在 DashboardPage，點擊 `登出`
**期待輸出**：`logout` 應被呼叫一次，並導向 `/login`