import { pgTable, text, numeric, boolean, smallint, date, timestamp } from 'drizzle-orm/pg-core'

// ── PROFILES ─────────────────────────────────────────────────
export const profiles = pgTable('profiles', {
  id:            text('id').primaryKey(),
  userId:        text('user_id').notNull().unique(),
  fullName:      text('full_name').notNull(),
  monthlyIncome: numeric('monthly_income', { precision: 15, scale: 2 }).default('0'),
  balance:       numeric('balance', { precision: 15, scale: 2 }).default('0'),
  currency:      text('currency').notNull().default('IDR'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── CATEGORIES ───────────────────────────────────────────────
// allocation_type: 'pribadi' | 'keluarga' | 'tabungan'
export const categories = pgTable('categories', {
  id:             text('id').primaryKey(),
  userId:         text('user_id').notNull(),
  name:           text('name').notNull(),
  allocationType: text('allocation_type').notNull(),
  color:          text('color').notNull().default('#6366f1'),
  icon:           text('icon').notNull().default('wallet'),
  isSalary:       boolean('is_salary').notNull().default(false),
  isDefault:      boolean('is_default').notNull().default(false),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── ALLOCATION RULES ─────────────────────────────────────────
// Aturan % split gaji — total 3 tipe harus = 100
export const allocationRules = pgTable('allocation_rules', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull(),
  allocationType:   text('allocation_type').notNull(),
  percentage:       numeric('percentage', { precision: 5, scale: 2 }).notNull(),
  targetCategoryId: text('target_category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── TRANSACTIONS ─────────────────────────────────────────────
export const transactions = pgTable('transactions', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull(),
  categoryId:      text('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  type:            text('type').notNull(),            // income | expense
  allocationType:  text('allocation_type').notNull(), // pribadi | keluarga | tabungan
  amount:          numeric('amount', { precision: 15, scale: 2 }).notNull(),
  contextNote:     text('context_note'),
  isSalarySplit:   boolean('is_salary_split').notNull().default(false),
  transactionDate: date('transaction_date').notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── BUDGETS ──────────────────────────────────────────────────
export const budgets = pgTable('budgets', {
  id:           text('id').primaryKey(),
  userId:       text('user_id').notNull(),
  categoryId:   text('category_id').notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  limitAmount:  numeric('limit_amount', { precision: 15, scale: 2 }).notNull(),
  periodMonth:  smallint('period_month').notNull(),
  periodYear:   smallint('period_year').notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── RELATIONS (untuk .findMany with:) ────────────────────────
import { relations } from 'drizzle-orm'

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets:      many(budgets),
}))

export const allocationRulesRelations = relations(allocationRules, ({ one }) => ({
  targetCategory: one(categories, {
    fields:     [allocationRules.targetCategoryId],
    references: [categories.id],
  }),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields:     [transactions.categoryId],
    references: [categories.id],
  }),
}))

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields:     [budgets.categoryId],
    references: [categories.id],
  }),
}))
