import api from '../lib/axios.js'

// ── Transactions ──────────────────────────────────────────────
export const transactionService = {
  getAll:      (params)       => api.get('/api/transactions', { params }),
  create:      (data)         => api.post('/api/transactions', data),
  bulkSalary:  (data)         => api.post('/api/transactions/bulk', data),
  update:      (id, data)     => api.put(`/api/transactions/${id}`, data),
  remove:      (id)           => api.delete(`/api/transactions/${id}`),
}

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardService = {
  getSummary:  (month, year)  => api.get('/api/dashboard/summary', { params: { month, year } }),
  getInsight:  (month, year)  => api.get('/api/dashboard/insight', { params: { month, year } }),
  getBudgets:  (month, year)  => api.get('/api/dashboard/budgets', { params: { month, year } }),
}

// ── Allocations ───────────────────────────────────────────────
export const allocationService = {
  getAll:      ()              => api.get('/api/allocations'),
  save:        (rules)         => api.post('/api/allocations', { rules }),
  preview:     (salary_amount) => api.post('/api/allocations/preview', { salary_amount }),
}

// ── Categories ────────────────────────────────────────────────
export const categoryService = {
  getAll:      ()              => api.get('/api/categories'),
  create:      (data)          => api.post('/api/categories', data),
  update:      (id, data)      => api.put(`/api/categories/${id}`, data),
  remove:      (id)            => api.delete(`/api/categories/${id}`),
}

// ── Budgets ───────────────────────────────────────────────────
export const budgetService = {
  getAll:      (month, year)   => api.get('/api/budgets', { params: { month, year } }),
  create:      (data)          => api.post('/api/budgets', data),
  update:      (id, amount)    => api.put(`/api/budgets/${id}`, { limit_amount: amount }),
  remove:      (id)            => api.delete(`/api/budgets/${id}`),
}

// ── Profiles ──────────────────────────────────────────────────
export const profileService = {
  getMe:       ()              => api.get('/api/profiles/me'),
  create:      (data)          => api.post('/api/profiles', data),
  update:      (data)          => api.put('/api/profiles/me', data),
}

// ── Balance ───────────────────────────────────────────────────
export const balanceService = {
  get:   ()            => api.get('/api/balance'),
  topup: (amount, categoryId) => api.post('/api/balance', { amount, category_id: categoryId || null }),
  set:   (amount)      => api.put('/api/balance', { amount }),
}

// ── Admin / Monitoring ────────────────────────────────────────
export const adminService = {
  getMe:   () => api.get('/api/admin/me'),
  monitor: () => api.get('/api/admin/monitor'),
}
