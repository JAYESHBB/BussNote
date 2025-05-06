import { pgTable, text, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  address: text("address"),
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  fullName: (schema) => schema.min(2, "Full name is required"),
  mobile: (schema) => schema.regex(/^\+?[0-9\s-]{10,15}$/, "Please enter a valid mobile number"),
  email: (schema) => schema.email("Please enter a valid email address"),
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Parties table (customers/clients)
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  gstin: text("gstin"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const partiesInsertSchema = createInsertSchema(parties, {
  name: (schema) => schema.min(2, "Party name must be at least 2 characters"),
  contactPerson: (schema) => schema.min(2, "Contact person name is required"),
  phone: (schema) => schema.regex(/^\+?[0-9\s-]{10,15}$/, "Please enter a valid phone number"),
  email: (schema) => schema.optional().nullable(),
  address: (schema) => schema.optional().nullable(),
  gstin: (schema) => schema.optional().nullable(),
  notes: (schema) => schema.optional().nullable(),
});
export type InsertParty = z.infer<typeof partiesInsertSchema>;
export type Party = typeof parties.$inferSelect & { outstanding?: number; lastTransactionDate?: Date };

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceNo: text("invoice_no"), // Added custom invoice number field
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDays: integer("due_days").default(0), // Added due days field
  terms: text("terms").default("Days"), // Added terms field (Days, Days Fix, Days D/A, Days B/D, Days A/D)
  dueDate: timestamp("due_date").notNull(),
  currency: text("currency").default("INR"), // Added currency field (INR, USD, EUR, etc.)
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 2 }).default("1.00"), // Exchange rate against INR
  remarks: text("remarks"), // Added remarks field for additional information
  status: text("status").notNull().default("pending"), // pending, paid, cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(), // Brokerage amount
  brokerageInINR: decimal("brokerage_inr", { precision: 10, scale: 2 }).default("0.00"), // Brokerage in INR
  receivedBrokerage: decimal("received_brokerage", { precision: 10, scale: 2 }).default("0.00"), // Received brokerage amount
  balanceBrokerage: decimal("balance_brokerage", { precision: 10, scale: 2 }).default("0.00"), // Balance brokerage amount
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  paymentDate: timestamp("payment_date"),
  userId: integer("user_id").references(() => users.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(), // Seller
  buyerId: integer("buyer_id").references(() => parties.id).notNull(), // Buyer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoicesInsertSchema = createInsertSchema(invoices);

export type InsertInvoice = z.infer<typeof invoicesInsertSchema>;
export type Invoice = typeof invoices.$inferSelect & { partyName?: string; buyerName?: string; items?: InvoiceItem[]; daysOverdue?: number; closedDate?: Date };

// Invoice Items table
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceItemsInsertSchema = createInsertSchema(invoiceItems);
export type InsertInvoiceItem = z.infer<typeof invoiceItemsInsertSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // payment, refund, etc.
  notes: text("notes"),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactionsInsertSchema = createInsertSchema(transactions);
export type InsertTransaction = z.infer<typeof transactionsInsertSchema>;
export type Transaction = typeof transactions.$inferSelect & { invoiceNumber?: string };

// Activities table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // invoice_created, payment_received, party_added, etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  partyId: integer("party_id").references(() => parties.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activitiesInsertSchema = createInsertSchema(activities);
export type InsertActivity = z.infer<typeof activitiesInsertSchema>;
export type Activity = typeof activities.$inferSelect;

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  invoices: many(invoices),
  activities: many(activities),
  transactions: many(transactions),
}));

export const partiesRelations = relations(parties, ({ many }) => ({
  invoices: many(invoices),
  transactions: many(transactions),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  party: one(parties, { fields: [invoices.partyId], references: [parties.id] }),
  items: many(invoiceItems),
  transactions: many(transactions),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  party: one(parties, { fields: [transactions.partyId], references: [parties.id] }),
  invoice: one(invoices, { fields: [transactions.invoiceId], references: [invoices.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
  party: one(parties, { fields: [activities.partyId], references: [parties.id] }),
  invoice: one(invoices, { fields: [activities.invoiceId], references: [invoices.id] }),
}));
