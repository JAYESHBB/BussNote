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
  updateInvoiceNotes(id: number, notes: string): Promise<Invoice | undefined>;
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
      createTableIfMissing: true,
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!result.length) {
      throw new Error(`User not found: ${id}`);
    }
    return result[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  
  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }
  
  // Party methods
  async getAllParties(): Promise<Party[]> {
    const partyList = await db.select().from(parties).orderBy(asc(parties.name));
    
    // For each party, calculate outstanding amount
    const partiesWithOutstanding = await Promise.all(
      partyList.map(async (party) => {
        const outstandingResult = await db
          .select({ total: sum(invoices.total) })
          .from(invoices)
          .where(and(
            eq(invoices.partyId, party.id),
            eq(invoices.status, "pending")
          ));
          
        const outstanding = outstandingResult[0]?.total || 0;
        
        // Get last transaction date
        const lastTransactionResult = await db
          .select({ date: max(transactions.date) })
          .from(transactions)
          .where(eq(transactions.partyId, party.id));
          
        const lastTransactionDate = lastTransactionResult[0]?.date;
        
        return {
          ...party,
          outstanding,
          lastTransactionDate
        };
      })
    );
    
    return partiesWithOutstanding;
  }
  
  async getPartyById(id: number): Promise<Party | undefined> {
    const result = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
    
    if (!result.length) {
      return undefined;
    }
    
    const party = result[0];
    
    // Calculate outstanding amount
    const outstandingResult = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(and(
        eq(invoices.partyId, party.id),
        eq(invoices.status, "pending")
      ));
      
    const outstanding = outstandingResult[0]?.total || 0;
    
    // Get last transaction date
    const lastTransactionResult = await db
      .select({ date: max(transactions.date) })
      .from(transactions)
      .where(eq(transactions.partyId, party.id));
      
    const lastTransactionDate = lastTransactionResult[0]?.date;
    
    return {
      ...party,
      outstanding,
      lastTransactionDate
    };
  }
  
  async createParty(data: InsertParty): Promise<Party> {
    const [party] = await db.insert(parties).values(data).returning();
    return party;
  }
  
  async updateParty(id: number, data: Partial<InsertParty>): Promise<Party | undefined> {
    const [updatedParty] = await db
      .update(parties)
      .set(data)
      .where(eq(parties.id, id))
      .returning();
      
    return updatedParty;
  }
  
  async deleteParty(id: number): Promise<void> {
    // First check if there are any invoices or transactions for this party
    const invoiceCount = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.partyId, id));
    
    const transactionCount = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.partyId, id));
    
    // If there are related records, throw an error
    if (invoiceCount[0].count > 0 || transactionCount[0].count > 0) {
      throw new Error("Cannot delete party with related invoices or transactions.");
    }
    
    // Delete the party
    await db.delete(parties).where(eq(parties.id, id));
  }
  
  // Invoice methods
  async getAllInvoices(): Promise<Invoice[]> {
    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        notes: invoices.notes,
        paymentDate: invoices.paymentDate,
        userId: invoices.userId,
        partyId: invoices.partyId,
        partyName: parties.name,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt
      })
      .from(invoices)
      .leftJoin(parties, eq(invoices.partyId, parties.id))
      .orderBy(desc(invoices.invoiceDate));
      
    return invoiceList;
  }
  
  async getRecentInvoices(limit: number): Promise<Invoice[]> {
    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        total: invoices.total,
        partyId: invoices.partyId,
        partyName: parties.name
      })
      .from(invoices)
      .leftJoin(parties, eq(invoices.partyId, parties.id))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
      
    return invoiceList;
  }
  
  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const result = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        notes: invoices.notes,
        paymentDate: invoices.paymentDate,
        userId: invoices.userId,
        partyId: invoices.partyId,
        buyerId: invoices.buyerId,
        partyName: parties.name,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt
      })
      .from(invoices)
      .leftJoin(parties, eq(invoices.partyId, parties.id))
      .where(eq(invoices.id, id))
      .limit(1);

    // Get buyer name if there is a buyerId
    let invoice = result[0];
    if (invoice && invoice.buyerId) {
      const buyer = await this.getPartyById(invoice.buyerId);
      invoice = {
        ...invoice,
        buyerName: buyer?.name || 'Unknown'
      };
    }
      
    return invoice;
  }
  
  async createInvoice(data: InsertInvoice, items: Array<Omit<InsertInvoiceItem, "invoiceId">>): Promise<Invoice> {
    // Generate invoice number
    const year = new Date().getFullYear();
    const latestInvoiceResult = await db
      .select({ maxNumber: sql<string | null>`MAX(${invoices.invoiceNumber})` })
      .from(invoices);
      
    let nextNumber = 1;
    
    if (latestInvoiceResult[0]?.maxNumber) {
      const lastNumStr = latestInvoiceResult[0].maxNumber.split('-')[2];
      if (lastNumStr) {
        nextNumber = parseInt(lastNumStr) + 1;
      }
    }
    
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    const invoiceNumber = `INV-${year}-${paddedNumber}`;
    
    // Create the invoice
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...data,
        invoiceNumber
      })
      .returning();
      
    // Add invoice items
    if (items.length > 0) {
      const itemsWithInvoiceId = items.map(item => ({
        ...item,
        invoiceId: invoice.id
      }));
      
      await db.insert(invoiceItems).values(itemsWithInvoiceId);
    }
    
    // Get seller and buyer names for response
    const seller = await this.getPartyById(invoice.partyId);
    const buyer = await this.getPartyById(invoice.buyerId);
    
    return {
      ...invoice,
      partyName: seller?.name || 'Unknown',
      buyerName: buyer?.name || 'Unknown'
    };
  }
  
  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const updateData: any = {
      status
    };
    
    if (status === 'paid') {
      updateData.paymentDate = new Date();
    }
    
    const [updatedInvoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
      
    if (!updatedInvoice) {
      return undefined;
    }
    
    // Get seller and buyer names
    const seller = await this.getPartyById(updatedInvoice.partyId);
    const buyer = await this.getPartyById(updatedInvoice.buyerId);
    
    return {
      ...updatedInvoice,
      partyName: seller?.name || 'Unknown',
      buyerName: buyer?.name || 'Unknown'
    };
  }
  
  async updateInvoiceNotes(id: number, notes: string): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ notes, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
      
    if (!updatedInvoice) {
      return undefined;
    }
    
    // Get seller and buyer names
    const seller = await this.getPartyById(updatedInvoice.partyId);
    const buyer = await this.getPartyById(updatedInvoice.buyerId);
    
    return {
      ...updatedInvoice,
      partyName: seller?.name || 'Unknown',
      buyerName: buyer?.name || 'Unknown'
    };
  }
  
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .orderBy(asc(invoiceItems.id));
      
    return items;
  }
  
  async getInvoicesByPartyId(partyId: number): Promise<Invoice[]> {
    // Get invoices where party is either seller or buyer
    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        notes: invoices.notes,
        paymentDate: invoices.paymentDate,
        userId: invoices.userId,
        partyId: invoices.partyId,
        buyerId: invoices.buyerId,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt
      })
      .from(invoices)
      .where(or(eq(invoices.partyId, partyId), eq(invoices.buyerId, partyId)))
      .orderBy(desc(invoices.invoiceDate));
      
    // Enhance with party names
    const enhancedInvoices = await Promise.all(invoiceList.map(async (invoice) => {
      const seller = await this.getPartyById(invoice.partyId);
      const buyer = await this.getPartyById(invoice.buyerId);
      return {
        ...invoice,
        partyName: seller?.name || 'Unknown',
        buyerName: buyer?.name || 'Unknown'
      };
    }));
    
    return enhancedInvoices;
  }
  
  // Transaction methods
  async getTransactionsByPartyId(partyId: number): Promise<Transaction[]> {
    const transactionList = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        date: transactions.date,
        type: transactions.type,
        notes: transactions.notes,
        partyId: transactions.partyId,
        invoiceId: transactions.invoiceId,
        userId: transactions.userId,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        invoiceNumber: invoices.invoiceNumber
      })
      .from(transactions)
      .leftJoin(invoices, eq(transactions.invoiceId, invoices.id))
      .where(eq(transactions.partyId, partyId))
      .orderBy(desc(transactions.date));
      
    return transactionList;
  }
  
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(data)
      .returning();
      
    // If related to an invoice, get the invoice number
    let invoiceNumber: string | undefined;
    
    if (transaction.invoiceId) {
      const invoice = await this.getInvoiceById(transaction.invoiceId);
      invoiceNumber = invoice?.invoiceNumber;
    }
    
    return {
      ...transaction,
      invoiceNumber
    };
  }
  
  // Activity methods
  async createActivity(data: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values({
        ...data,
        timestamp: new Date() // Fix: Pass a Date object directly, not a string
      })
      .returning();
      
    return activity;
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    const activityList = await db
      .select()
      .from(activities)
      .orderBy(desc(activities.timestamp))
      .limit(limit);
      
    return activityList;
  }
  
  // Report methods
  async getOutstandingInvoices(fromDate?: Date, toDate?: Date): Promise<Invoice[]> {
    let query = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        total: invoices.total,
        partyId: invoices.partyId,
        partyName: parties.name
      })
      .from(invoices)
      .leftJoin(parties, eq(invoices.partyId, parties.id))
      .where(eq(invoices.status, "pending"));
      
    if (fromDate) {
      query = query.where(gte(invoices.invoiceDate, fromDate));
    }
    
    if (toDate) {
      query = query.where(lte(invoices.invoiceDate, toDate));
    }
    
    const invoiceList = await query.orderBy(asc(invoices.dueDate));
    
    // Calculate days overdue
    const today = new Date();
    const result = invoiceList.map(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = isBefore(dueDate, today) 
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) 
        : 0;
      
      return {
        ...invoice,
        daysOverdue
      };
    });
    
    return result;
  }
  
  async getClosedInvoices(fromDate?: Date, toDate?: Date, status: string = "all"): Promise<Invoice[]> {
    let statusCondition: SQL<unknown>;
    
    if (status === "paid") {
      statusCondition = eq(invoices.status, "paid");
    } else if (status === "cancelled") {
      statusCondition = eq(invoices.status, "cancelled");
    } else {
      statusCondition = sql`${invoices.status} IN ('paid', 'cancelled')`;
    }
    
    let query = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        closedDate: invoices.paymentDate,
        status: invoices.status,
        total: invoices.total,
        partyId: invoices.partyId,
        partyName: parties.name
      })
      .from(invoices)
      .leftJoin(parties, eq(invoices.partyId, parties.id))
      .where(statusCondition);
      
    if (fromDate) {
      query = query.where(gte(invoices.paymentDate, fromDate));
    }
    
    if (toDate) {
      query = query.where(lte(invoices.paymentDate, toDate));
    }
    
    const invoiceList = await query.orderBy(desc(invoices.paymentDate));
    return invoiceList;
  }
  
  async getSalesReport(fromDate?: Date, toDate?: Date, groupBy: string = "monthly"): Promise<any> {
    // Default date range: current month
    const start = fromDate || startOfMonth(new Date());
    const end = toDate || endOfMonth(new Date());
    
    // Base query to get all relevant invoices
    const relevantInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        invoiceDate: invoices.invoiceDate,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        status: invoices.status
      })
      .from(invoices)
      .where(and(
        gte(invoices.invoiceDate, start),
        lte(invoices.invoiceDate, end),
        sql`${invoices.status} != 'cancelled'`
      ));
    
    // Group the data according to the specified grouping
    const periods: any[] = [];
    const periodMap = new Map();
    
    if (groupBy === "daily") {
      // Group by day
      for (const invoice of relevantInvoices) {
        const dateStr = format(new Date(invoice.invoiceDate), "yyyy-MM-dd");
        const label = format(new Date(invoice.invoiceDate), "MMM dd, yyyy");
        
        if (!periodMap.has(dateStr)) {
          periodMap.set(dateStr, {
            id: dateStr,
            label,
            invoiceCount: 0,
            grossSales: 0,
            tax: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(dateStr);
        period.invoiceCount += 1;
        period.grossSales += invoice.subtotal;
        period.tax += invoice.tax;
        period.netSales += invoice.total;
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
            tax: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(weekKey);
        period.invoiceCount += 1;
        period.grossSales += invoice.subtotal;
        period.tax += invoice.tax;
        period.netSales += invoice.total;
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
            tax: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(monthKey);
        period.invoiceCount += 1;
        period.grossSales += invoice.subtotal;
        period.tax += invoice.tax;
        period.netSales += invoice.total;
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
            tax: 0,
            netSales: 0
          });
        }
        
        const period = periodMap.get(quarterKey);
        period.invoiceCount += 1;
        period.grossSales += invoice.subtotal;
        period.tax += invoice.tax;
        period.netSales += invoice.total;
      }
    }
    
    // Convert map to array and sort
    for (const [key, value] of periodMap.entries()) {
      periods.push(value);
    }
    
    // Sort periods
    periods.sort((a, b) => a.id.localeCompare(b.id));
    
    // Calculate totals
    const totals = {
      invoiceCount: periods.reduce((sum, period) => sum + period.invoiceCount, 0),
      grossSales: periods.reduce((sum, period) => sum + period.grossSales, 0),
      tax: periods.reduce((sum, period) => sum + period.tax, 0),
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
        fromDate = subDays(new Date().setHours(0, 0, 0, 0), 1);
        break;
      case "week":
        fromDate = startOfWeek(today);
        break;
      case "month":
        fromDate = startOfMonth(today);
        break;
      case "quarter":
        fromDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        break;
      case "year":
        fromDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        // Default to "month"
        fromDate = startOfMonth(today);
    }
    
    // Calculate total sales
    const salesResult = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(and(
        gte(invoices.invoiceDate, fromDate),
        sql`${invoices.status} != 'cancelled'`
      ));
    
    const totalSales = salesResult[0]?.total || 0;
    
    // Calculate outstanding amount
    const outstandingResult = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(eq(invoices.status, "pending"));
      
    const outstanding = outstandingResult[0]?.total || 0;
    
    // Count active parties
    const activePartiesResult = await db
      .select({ count: count() })
      .from(parties);
      
    const activeParties = activePartiesResult[0]?.count || 0;
    
    // Count pending invoices
    const pendingResult = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.status, "pending"));
      
    const pendingInvoices = pendingResult[0]?.count || 0;
    
    return {
      totalSales,
      outstanding,
      activeParties,
      pendingInvoices,
      dateRange
    };
  }
}

export const storage = new DatabaseStorage();
