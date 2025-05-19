import { db } from "@db";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { or } from "drizzle-orm";

// Add type definition for SessionStore
declare module 'express-session' {
  interface SessionStore {
    destroy: (sid: string, callback: (err: any) => void) => void;
    get: (sid: string, callback: (err: any, session: any) => void) => void;
    set: (sid: string, session: session.SessionData, callback?: (err?: any) => void) => void;
    touch: (sid: string, session: session.SessionData, callback?: (err?: any) => void) => void;
  }
}
import { 
  users, 
  parties, 
  invoices, 
  invoiceItems, 
  transactions, 
  activities,
  InsertUser,
  User,
  InsertParty,
  Party,
  InsertInvoice,
  InsertInvoiceItem,
  InsertTransaction,
  InsertActivity,
  Invoice,
  InvoiceItem,
  Transaction,
  Activity
} from "@shared/schema";
import { pool } from "@db";
import { eq, and, desc, asc, gt, lt, gte, lte, isNull, isNotNull, sql, SQL, count, sum, max } from "drizzle-orm";
import { addDays, format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isBefore } from "date-fns";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  
  // Party methods
  getAllParties(): Promise<Party[]>;
  getPartyById(id: number): Promise<Party | undefined>;
  createParty(data: InsertParty): Promise<Party>;
  updateParty(id: number, data: Partial<InsertParty>): Promise<Party | undefined>;
  deleteParty(id: number): Promise<void>;
  
  // Invoice methods
  getAllInvoices(): Promise<Invoice[]>;
  getRecentInvoices(limit: number): Promise<Invoice[]>;
  getInvoiceById(id: number): Promise<Invoice | undefined>;
  createInvoice(data: InsertInvoice, items: Array<Omit<InsertInvoiceItem, "invoiceId">>): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  updateInvoiceNotes(id: number, notes: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  getInvoicesByPartyId(partyId: number): Promise<Invoice[]>;
  
  // Transaction methods
  getTransactionsByPartyId(partyId: number): Promise<Transaction[]>;
  createTransaction(data: InsertTransaction): Promise<Transaction>;
  
  // Activity methods
  createActivity(data: InsertActivity): Promise<Activity>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  
  // Report methods
  getOutstandingInvoices(fromDate?: Date, toDate?: Date): Promise<Invoice[]>;
  getClosedInvoices(fromDate?: Date, toDate?: Date, status?: string): Promise<Invoice[]>;
  getSalesReport(fromDate?: Date, toDate?: Date, groupBy?: string): Promise<any>;
  getDashboardStats(dateRange: string): Promise<any>;
  
  // Session store
  sessionStore: session.SessionStore;
}

const PostgresSessionStore = connectPg(session);

class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }
  
  async getAllParties(): Promise<Party[]> {
    const allParties = await db.select().from(parties).orderBy(asc(parties.name));
    
    // Get outstanding amounts for each party
    const partiesWithExtras = await Promise.all(allParties.map(async (party) => {
      // Get last transaction date
      const lastTransaction = await db
        .select({ date: transactions.date })
        .from(transactions)
        .where(eq(transactions.partyId, party.id))
        .orderBy(desc(transactions.date))
        .limit(1);
      
      // Calculate outstanding amount
      const outstandingResult = await db
        .select({ total: sql`SUM(CASE WHEN ${invoices.total} > 0 THEN ${invoices.total} ELSE ${invoices.subtotal} END)` })
        .from(invoices)
        .where(and(
          eq(invoices.partyId, party.id),
          eq(invoices.status, "pending")
        ));
      
      const outstanding = Number(outstandingResult[0]?.total || 0);
      const lastTransactionDate = lastTransaction.length > 0 ? lastTransaction[0].date : null;
      
      return {
        ...party,
        outstanding,
        lastTransactionDate
      };
    }));
    
    return partiesWithExtras;
  }
  
  async getPartyById(id: number): Promise<Party | undefined> {
    const result = await db.select().from(parties).where(eq(parties.id, id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    const party = result[0];
    
    // Get last transaction date
    const lastTransaction = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(eq(transactions.partyId, party.id))
      .orderBy(desc(transactions.date))
      .limit(1);
    
    // Calculate outstanding amount
    const outstandingResult = await db
      .select({ total: sql`SUM(CASE WHEN ${invoices.total} > 0 THEN ${invoices.total} ELSE ${invoices.subtotal} END)` })
      .from(invoices)
      .where(and(
        eq(invoices.partyId, party.id),
        eq(invoices.status, "pending")
      ));
    
    const outstanding = Number(outstandingResult[0]?.total || 0);
    const lastTransactionDate = lastTransaction.length > 0 ? lastTransaction[0].date : null;
    
    return {
      ...party,
      outstanding,
      lastTransactionDate
    };
  }
  
  async createParty(data: InsertParty): Promise<Party> {
    const result = await db.insert(parties).values(data).returning();
    return {
      ...result[0],
      outstanding: 0,
      lastTransactionDate: undefined
    };
  }
  
  async updateParty(id: number, data: Partial<InsertParty>): Promise<Party | undefined> {
    const result = await db.update(parties).set(data).where(eq(parties.id, id)).returning();
    
    if (result.length === 0) {
      return undefined;
    }
    
    // Get last transaction date
    const lastTransaction = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(eq(transactions.partyId, id))
      .orderBy(desc(transactions.date))
      .limit(1);
    
    // Calculate outstanding amount
    const outstandingResult = await db
      .select({ total: sql`SUM(CASE WHEN ${invoices.total} > 0 THEN ${invoices.total} ELSE ${invoices.subtotal} END)` })
      .from(invoices)
      .where(and(
        eq(invoices.partyId, id),
        eq(invoices.status, "pending")
      ));
    
    const outstanding = Number(outstandingResult[0]?.total || 0);
    const lastTransactionDate = lastTransaction.length > 0 ? lastTransaction[0].date : null;
    
    return {
      ...result[0],
      outstanding,
      lastTransactionDate
    };
  }
  
  async deleteParty(id: number): Promise<void> {
    await db.delete(parties).where(eq(parties.id, id));
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    const allInvoices = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      subtotal: invoices.subtotal,
      brokerageInINR: invoices.brokerageInINR,
      total: invoices.total,
      notes: invoices.notes,
      partyId: invoices.partyId,
      buyerId: invoices.buyerId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    }).from(invoices)
      .orderBy(desc(invoices.invoiceDate));

    // Get party names for each invoice
    const invoicesWithPartyNames = await Promise.all(allInvoices.map(async (invoice) => {
      const party = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.partyId));
      
      const buyer = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.buyerId));
      
      return {
        ...invoice,
        partyName: party[0]?.name || "Unknown Party",
        partyEmail: party[0]?.email || null,
        buyerName: buyer[0]?.name || "Unknown Buyer",
        buyerEmail: buyer[0]?.email || null
      };
    }));
    
    return invoicesWithPartyNames;
  }
  
  async getRecentInvoices(limit: number): Promise<Invoice[]> {
    const recentInvoices = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      subtotal: invoices.subtotal,
      brokerageInINR: invoices.brokerageInINR,
      total: invoices.total,
      notes: invoices.notes,
      partyId: invoices.partyId,
      buyerId: invoices.buyerId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    }).from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
    
    // Get party names for each invoice
    const invoicesWithPartyNames = await Promise.all(recentInvoices.map(async (invoice) => {
      const party = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.partyId));
      
      const buyer = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.buyerId));
      
      return {
        ...invoice,
        partyName: party[0]?.name || "Unknown Party",
        partyEmail: party[0]?.email || null,
        buyerName: buyer[0]?.name || "Unknown Buyer",
        buyerEmail: buyer[0]?.email || null
      };
    }));
    
    return invoicesWithPartyNames;
  }
  
  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    const invoice = result[0];
    
    // Get party name
    const party = await db.select({
      name: parties.name,
      email: parties.email
    }).from(parties).where(eq(parties.id, invoice.partyId));
    
    // Get buyer name
    const buyer = await db.select({
      name: parties.name,
      email: parties.email
    }).from(parties).where(eq(parties.id, invoice.buyerId));
    
    // Get invoice items
    const items = await this.getInvoiceItems(id);
    
    // Calculate days overdue if status is pending and due date is in the past
    let daysOverdue: number | undefined = undefined;
    if (invoice.status === "pending" && invoice.dueDate && isBefore(new Date(invoice.dueDate), new Date())) {
      const today = new Date();
      const dueDate = new Date(invoice.dueDate);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return {
      ...invoice,
      partyName: party[0]?.name || "Unknown Party",
      partyEmail: party[0]?.email || null,
      buyerName: buyer[0]?.name || "Unknown Buyer",
      buyerEmail: buyer[0]?.email || null,
      items,
      daysOverdue
    };
  }
  
  async createInvoice(data: InsertInvoice, items: Array<Omit<InsertInvoiceItem, "invoiceId">>): Promise<Invoice> {
    // Insert the invoice
    const result = await db.insert(invoices).values(data).returning();
    const invoice = result[0];
    
    // Insert the invoice items
    if (items.length > 0) {
      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoiceId: invoice.id
      }));
      
      await db.insert(invoiceItems).values(itemsWithInvoiceId);
    }
    
    // Get party name
    const party = await db.select({
      name: parties.name,
      email: parties.email
    }).from(parties).where(eq(parties.id, data.partyId));
    
    // Get buyer name
    const buyer = await db.select({
      name: parties.name,
      email: parties.email
    }).from(parties).where(eq(parties.id, data.buyerId));
    
    // Return the invoice with party name and items
    return {
      ...invoice,
      partyName: party[0]?.name || "Unknown Party",
      partyEmail: party[0]?.email || null,
      buyerName: buyer[0]?.name || "Unknown Buyer",
      buyerEmail: buyer[0]?.email || null,
      items: [] // Empty array for now, items just inserted
    };
  }
  
  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    // Get current invoice to check if it needs closing date
    const currentInvoice = await db.select().from(invoices).where(eq(invoices.id, id));
    
    if (currentInvoice.length === 0) {
      return undefined;
    }
    
    // If status changed to paid/closed, set payment date to today
    let updateData: Partial<Invoice> = { status };
    if ((status === "paid" || status === "closed") && currentInvoice[0].status !== "paid" && currentInvoice[0].status !== "closed") {
      updateData.paymentDate = new Date();
    }
    
    // If status changed from paid/closed to something else, clear payment date
    if (status !== "paid" && status !== "closed" && (currentInvoice[0].status === "paid" || currentInvoice[0].status === "closed")) {
      updateData.paymentDate = null;
    }
    
    // Update the invoice
    const result = await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning();
    
    if (result.length === 0) {
      return undefined;
    }
    
    return this.getInvoiceById(id);
  }
  
  async updateInvoice(id: number, updateData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices).set(updateData).where(eq(invoices.id, id)).returning();
    
    if (result.length === 0) {
      return undefined;
    }
    
    return this.getInvoiceById(id);
  }
  
  async updateInvoiceNotes(id: number, notes: string): Promise<Invoice | undefined> {
    const result = await db.update(invoices).set({ notes }).where(eq(invoices.id, id)).returning();
    
    if (result.length === 0) {
      return undefined;
    }
    
    return this.getInvoiceById(id);
  }
  
  async deleteInvoice(id: number): Promise<boolean> {
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Delete invoice items first (foreign key constraint)
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        
        // Delete transactions related to this invoice
        await tx.delete(transactions).where(eq(transactions.invoiceId, id));
        
        // Delete activities related to this invoice
        await tx.delete(activities).where(eq(activities.invoiceId, id));
        
        // Finally, delete the invoice
        await tx.delete(invoices).where(eq(invoices.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting invoice:", error);
      return false;
    }
  }
  
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.id));
  }
  
  async getInvoicesByPartyId(partyId: number): Promise<Invoice[]> {
    const partyInvoices = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      subtotal: invoices.subtotal,
      brokerageInINR: invoices.brokerageInINR,
      total: invoices.total,
      notes: invoices.notes,
      partyId: invoices.partyId,
      buyerId: invoices.buyerId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    }).from(invoices)
      .where(or(
        eq(invoices.partyId, partyId),
        eq(invoices.buyerId, partyId)
      ))
      .orderBy(desc(invoices.invoiceDate));
    
    // Get party names for each invoice
    const invoicesWithPartyNames = await Promise.all(partyInvoices.map(async (invoice) => {
      const party = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.partyId));
      
      const buyer = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.buyerId));
      
      // Calculate days overdue if status is pending and due date is in the past
      let daysOverdue: number | undefined = undefined;
      if (invoice.status === "pending" && invoice.dueDate && isBefore(new Date(invoice.dueDate), new Date())) {
        const today = new Date();
        const dueDate = new Date(invoice.dueDate);
        const diffTime = Math.abs(today.getTime() - dueDate.getTime());
        daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      return {
        ...invoice,
        partyName: party[0]?.name || "Unknown Party",
        partyEmail: party[0]?.email || null,
        buyerName: buyer[0]?.name || "Unknown Buyer",
        buyerEmail: buyer[0]?.email || null,
        daysOverdue
      };
    }));
    
    return invoicesWithPartyNames;
  }
  
  async getTransactionsByPartyId(partyId: number): Promise<Transaction[]> {
    const partyTransactions = await db.select().from(transactions)
      .where(eq(transactions.partyId, partyId))
      .orderBy(desc(transactions.date));
    
    // Get invoice numbers for each transaction
    const transactionsWithInvoiceNumbers = await Promise.all(partyTransactions.map(async (transaction) => {
      if (transaction.invoiceId) {
        const invoice = await db.select({
          invoiceNumber: invoices.invoiceNumber
        }).from(invoices).where(eq(invoices.id, transaction.invoiceId));
        
        return {
          ...transaction,
          invoiceNumber: invoice[0]?.invoiceNumber || "Unknown Invoice"
        };
      }
      
      return {
        ...transaction,
        invoiceNumber: "N/A"
      };
    }));
    
    return transactionsWithInvoiceNumbers;
  }
  
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(data).returning();
    const transaction = result[0];
    
    // Fetch invoice number if this transaction is related to an invoice
    if (transaction.invoiceId) {
      const invoice = await db.select({
        invoiceNumber: invoices.invoiceNumber
      }).from(invoices).where(eq(invoices.id, transaction.invoiceId));
      
      return {
        ...transaction,
        invoiceNumber: invoice[0]?.invoiceNumber || "Unknown Invoice"
      };
    }
    
    return {
      ...transaction,
      invoiceNumber: "N/A"
    };
  }
  
  async createActivity(data: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(data).returning();
    return result[0];
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    return db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit);
  }
  
  async getOutstandingInvoices(fromDate?: Date, toDate?: Date): Promise<Invoice[]> {
    const today = new Date();
    fromDate = fromDate || new Date(today.getFullYear() - 1, today.getMonth(), 1);
    toDate = toDate || today;
    
    // Get all pending invoices within the date range
    const outstandingInvoices = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      subtotal: invoices.subtotal,
      brokerageInINR: invoices.brokerageInINR,
      total: invoices.total,
      notes: invoices.notes,
      partyId: invoices.partyId,
      buyerId: invoices.buyerId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    }).from(invoices)
      .where(and(
        gte(invoices.invoiceDate, fromDate),
        lte(invoices.invoiceDate, toDate),
        eq(invoices.status, "pending")
      ))
      .orderBy(asc(invoices.dueDate));
    
    // Get party names for each invoice
    const invoicesWithPartyNames = await Promise.all(outstandingInvoices.map(async (invoice) => {
      const party = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.partyId));
      
      const buyer = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.buyerId));
      
      // Calculate days overdue if due date is in the past
      let daysOverdue: number | undefined = undefined;
      if (invoice.dueDate && isBefore(new Date(invoice.dueDate), today)) {
        const dueDate = new Date(invoice.dueDate);
        const diffTime = Math.abs(today.getTime() - dueDate.getTime());
        daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      return {
        ...invoice,
        partyName: party[0]?.name || "Unknown Party",
        partyEmail: party[0]?.email || null,
        buyerName: buyer[0]?.name || "Unknown Buyer",
        buyerEmail: buyer[0]?.email || null,
        daysOverdue
      };
    }));
    
    return invoicesWithPartyNames;
  }
  
  async getClosedInvoices(fromDate?: Date, toDate?: Date, status: string = "all"): Promise<Invoice[]> {
    const today = new Date();
    fromDate = fromDate || new Date(today.getFullYear() - 1, today.getMonth(), 1);
    toDate = toDate || today;
    
    // Build the query based on status filter
    let query = db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      subtotal: invoices.subtotal,
      brokerageInINR: invoices.brokerageInINR,
      total: invoices.total,
      notes: invoices.notes,
      partyId: invoices.partyId,
      buyerId: invoices.buyerId,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      paymentDate: invoices.paymentDate
    }).from(invoices)
      .where(and(
        gte(invoices.invoiceDate, fromDate),
        lte(invoices.invoiceDate, toDate)
      ));
    
    // Add status filter if not "all"
    if (status !== "all") {
      query = query.where(eq(invoices.status, status));
    } else {
      // For "all", only include paid, closed, and cancelled
      query = query.where(or(
        eq(invoices.status, "paid"),
        eq(invoices.status, "closed"),
        eq(invoices.status, "cancelled")
      ));
    }
    
    const closedInvoices = await query.orderBy(desc(invoices.paymentDate));
    
    // Get party names for each invoice
    const invoicesWithPartyNames = await Promise.all(closedInvoices.map(async (invoice) => {
      const party = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.partyId));
      
      const buyer = await db.select({
        name: parties.name,
        email: parties.email
      }).from(parties).where(eq(parties.id, invoice.buyerId));
      
      return {
        ...invoice,
        partyName: party[0]?.name || "Unknown Party",
        partyEmail: party[0]?.email || null,
        buyerName: buyer[0]?.name || "Unknown Buyer",
        buyerEmail: buyer[0]?.email || null,
        closedDate: invoice.paymentDate
      };
    }));
    
    return invoicesWithPartyNames;
  }
  
  async getSalesReport(fromDate?: Date, toDate?: Date, groupBy: string = "monthly"): Promise<any> {
    const today = new Date();
    fromDate = fromDate || new Date(today.getFullYear() - 1, today.getMonth(), 1);
    toDate = toDate || today;
    
    // Group by options: monthly, quarterly, yearly
    const start = fromDate;
    const end = toDate;
    
    // Get all invoices in the date range with status 'paid'
    const allInvoices = await db
      .select()
      .from(invoices)
      .where(and(
        gte(invoices.invoiceDate, start),
        lte(invoices.invoiceDate, end),
        eq(invoices.status, "paid")
      ));
    
    const relevantInvoices = allInvoices;
    
    // Group the invoices by period based on the groupBy parameter
    const periodMap = new Map();
    const periods = [];
    
    if (groupBy === "daily") {
      // Group by day
      for (const invoice of relevantInvoices) {
        const dayKey = format(new Date(invoice.invoiceDate), "yyyy-MM-dd");
        const label = format(new Date(invoice.invoiceDate), "MMM dd, yyyy");
        
        if (!periodMap.has(dayKey)) {
          periodMap.set(dayKey, {
            id: dayKey,
            label,
            invoiceCount: 0,
            grossSales: 0,
            brokerage: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(dayKey);
        period.invoiceCount += 1;
        period.grossSales += Number(parseFloat(invoice.subtotal as any) || 0);
        period.brokerage += Number(parseFloat(invoice.brokerageInINR as any) || 0);
        period.netSales += Number(invoice.total > 0 ? parseFloat(invoice.total as any) : parseFloat(invoice.subtotal as any)) || 0;
      }
    } else if (groupBy === "weekly") {
      // Group by week
      for (const invoice of relevantInvoices) {
        const invoiceDate = new Date(invoice.invoiceDate);
        const weekStart = startOfWeek(invoiceDate);
        const weekEnd = endOfWeek(invoiceDate);
        const weekKey = format(weekStart, "yyyy-MM-dd");
        const label = `${format(weekStart, "MMM dd")} - ${format(weekEnd, "MMM dd, yyyy")}`;
        
        if (!periodMap.has(weekKey)) {
          periodMap.set(weekKey, {
            id: weekKey,
            label,
            invoiceCount: 0,
            grossSales: 0,
            brokerage: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(weekKey);
        period.invoiceCount += 1;
        period.grossSales += Number(parseFloat(invoice.subtotal as any) || 0);
        period.brokerage += Number(parseFloat(invoice.brokerageInINR as any) || 0);
        period.netSales += Number(invoice.total > 0 ? parseFloat(invoice.total as any) : parseFloat(invoice.subtotal as any)) || 0;
      }
    } else if (groupBy === "monthly") {
      // Group by month
      for (const invoice of relevantInvoices) {
        const monthKey = format(new Date(invoice.invoiceDate), "yyyy-MM");
        const label = format(new Date(invoice.invoiceDate), "MMMM yyyy");
        
        if (!periodMap.has(monthKey)) {
          periodMap.set(monthKey, {
            id: monthKey,
            label,
            invoiceCount: 0,
            grossSales: 0,
            brokerage: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(monthKey);
        period.invoiceCount += 1;
        period.grossSales += Number(parseFloat(invoice.subtotal as any) || 0);
        period.brokerage += Number(parseFloat(invoice.brokerageInINR as any) || 0);
        period.netSales += Number(invoice.total > 0 ? parseFloat(invoice.total as any) : parseFloat(invoice.subtotal as any)) || 0;
      }
    } else if (groupBy === "quarterly") {
      // Group by quarter
      for (const invoice of relevantInvoices) {
        const date = new Date(invoice.invoiceDate);
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear();
        const quarterKey = `${year}-Q${quarter}`;
        const label = `Q${quarter} ${year}`;
        
        if (!periodMap.has(quarterKey)) {
          periodMap.set(quarterKey, {
            id: quarterKey,
            label,
            invoiceCount: 0,
            grossSales: 0,
            brokerage: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(quarterKey);
        period.invoiceCount += 1;
        period.grossSales += Number(parseFloat(invoice.subtotal as any) || 0);
        period.brokerage += Number(parseFloat(invoice.brokerageInINR as any) || 0);
        period.netSales += Number(invoice.total > 0 ? parseFloat(invoice.total as any) : parseFloat(invoice.subtotal as any)) || 0;
      }
    }
    
    // Convert map to array and sort
    for (const [_, value] of periodMap.entries()) {
      periods.push(value);
    }
    
    // Sort periods
    periods.sort((a, b) => a.id.localeCompare(b.id));
    
    // Calculate totals
    const totals = {
      invoiceCount: periods.reduce((sum, period) => sum + period.invoiceCount, 0),
      grossSales: periods.reduce((sum, period) => sum + period.grossSales, 0),
      brokerage: periods.reduce((sum, period) => sum + period.brokerage, 0),
      netSales: periods.reduce((sum, period) => sum + period.netSales, 0)
    };
    
    return {
      periods,
      totals,
      fromDate: start,
      toDate: end,
      groupBy
    };
  }
  
  async getDashboardStats(dateRange: string): Promise<any> {
    let fromDate: Date;
    const today = new Date();
    
    // Determine date range based on input
    switch (dateRange) {
      case "today":
        fromDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case "yesterday":
        fromDate = subDays(new Date(today).setHours(0, 0, 0, 0), 1) as Date;
        break;
      case "week":
        fromDate = startOfWeek(today);
        break;
      case "month":
        fromDate = startOfMonth(today);
        break;
      case "year":
        fromDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        // Default to month
        fromDate = startOfMonth(today);
    }
    
    // Total sales amount for the period - use subtotal when total is zero
    const salesResult = await db
      .select({ 
        totalSales: sql`COALESCE(SUM(CASE WHEN ${invoices.total} > 0 THEN ${invoices.total} ELSE ${invoices.subtotal} END), 0)`
      })
      .from(invoices)
      .where(and(
        gte(invoices.invoiceDate, fromDate),
        lte(invoices.invoiceDate, today),
        eq(invoices.status, "paid")
      ));
      
    const totalSales = Number(salesResult[0]?.totalSales || 0);
    
    // Get sales by currency
    const salesByCurrencyQuery = db
      .select({ 
        currency: invoices.currency,
        amount: sql`COALESCE(SUM(CASE WHEN ${invoices.total} > 0 THEN ${invoices.total} ELSE ${invoices.subtotal} END), 0)`
      })
      .from(invoices)
      .where(and(
        gte(invoices.invoiceDate, fromDate),
        lte(invoices.invoiceDate, today),
        eq(invoices.status, "paid")
      ))
      .groupBy(invoices.currency);
    
    const salesByCurrencyResult = await salesByCurrencyQuery;
    
    // Convert to a more usable format for the frontend
    const salesByCurrency = salesByCurrencyResult.reduce((acc, row) => {
      const currency = row.currency || 'INR'; // Default to INR if no currency specified
      acc[currency] = Number(row.amount);
      return acc;
    }, {} as Record<string, number>);
    
    // Outstanding amount (all pending invoices) - use subtotal when total is zero
    const outstandingResult = await db
      .select({ 
        outstanding: sql`COALESCE(SUM(CASE WHEN ${invoices.total} > 0 THEN ${invoices.total} ELSE ${invoices.subtotal} END), 0)`
      })
      .from(invoices)
      .where(eq(invoices.status, "pending"));
      
    const outstanding = Number(outstandingResult[0]?.outstanding || 0);
    
    // Get outstanding by currency
    const outstandingByCurrencyQuery = db
      .select({ 
        currency: invoices.currency,
        amount: sql`COALESCE(SUM(CASE WHEN ${invoices.total} > 0 THEN ${invoices.total} ELSE ${invoices.subtotal} END), 0)`
      })
      .from(invoices)
      .where(eq(invoices.status, "pending"))
      .groupBy(invoices.currency);
    
    const outstandingByCurrencyResult = await outstandingByCurrencyQuery;
    
    // Convert outstanding by currency to a usable format for the frontend
    const outstandingByCurrency = outstandingByCurrencyResult.reduce((acc, row) => {
      const currency = row.currency || 'INR'; // Default to INR if no currency specified
      acc[currency] = Number(row.amount);
      return acc;
    }, {} as Record<string, number>);
    
    // Total invoices for the period
    const invoiceCountResult = await db
      .select({ count: count() })
      .from(invoices)
      .where(and(
        gte(invoices.invoiceDate, fromDate),
        lte(invoices.invoiceDate, today)
      ));
      
    const totalInvoices = Number(invoiceCountResult[0].count);
    
    // Pending invoices
    const pendingCountResult = await db
      .select({ count: count() })
      .from(invoices)
      .where(and(
        gte(invoices.invoiceDate, fromDate),
        lte(invoices.invoiceDate, today),
        eq(invoices.status, "pending")
      ));
      
    const pendingInvoices = Number(pendingCountResult[0].count);
    
    // Active parties in the period
    const activePartiesResult = await db
      .select({ count: count() })
      .from(parties)
      .where(
        sql`EXISTS (
          SELECT 1 FROM ${invoices}
          WHERE ${invoices.partyId} = ${parties.id}
          AND ${invoices.invoiceDate} BETWEEN ${fromDate} AND ${today}
        )`
      );
      
    const activeParties = Number(activePartiesResult[0].count);
    
    return {
      totalSales,
      salesByCurrency,
      outstanding,
      outstandingByCurrency,
      totalInvoices,
      activeParties,
      pendingInvoices,
      dateRange
    };
  }
}

export const storage = new DatabaseStorage();
