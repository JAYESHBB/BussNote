import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { eq, desc, and, gte, lte, isNull, isNotNull } from "drizzle-orm";
import {
  parties,
  invoices,
  invoiceItems,
  transactions,
  activities,
  partiesInsertSchema,
  invoicesInsertSchema,
  transactionsInsertSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // API Routes
  const apiPrefix = "/api";
  
  // Username availability check
  app.get(`${apiPrefix}/check-username`, async (req: Request, res: Response) => {
    try {
      const username = req.query.username as string;
      
      if (!username || username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters", available: false });
      }
      
      // Check if username exists in database
      const existingUser = await storage.getUserByUsername(username);
      
      // Return result
      res.json({ available: !existingUser });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ message: "Failed to check username availability", available: false });
    }
  });

  // Party name availability check
  app.get(`${apiPrefix}/check-party-name`, async (req: Request, res: Response) => {
    try {
      const partyName = req.query.name as string;
      
      if (!partyName || partyName.length < 2) {
        return res.status(400).json({ message: "Party name must be at least 2 characters", available: false });
      }
      
      // Check if party name exists in database (case insensitive)
      const existingParties = await storage.getAllParties();
      const exists = existingParties.some(party => 
        party.name.toLowerCase() === partyName.toLowerCase()
      );
      
      // Return result
      res.json({ available: !exists });
    } catch (error) {
      console.error("Error checking party name:", error);
      res.status(500).json({ message: "Failed to check party name availability", available: false });
    }
  });

  // Parties (customers/clients)
  app.get(`${apiPrefix}/parties`, async (req, res) => {
    try {
      const allParties = await storage.getAllParties();
      res.json(allParties);
    } catch (error) {
      console.error("Error fetching parties:", error);
      res.status(500).json({ message: "Failed to fetch parties" });
    }
  });

  app.get(`${apiPrefix}/parties/:id`, async (req, res) => {
    try {
      const partyId = parseInt(req.params.id);
      const party = await storage.getPartyById(partyId);
      
      if (!party) {
        return res.status(404).json({ message: "Party not found" });
      }
      
      res.json(party);
    } catch (error) {
      console.error("Error fetching party:", error);
      res.status(500).json({ message: "Failed to fetch party" });
    }
  });

  app.post(`${apiPrefix}/parties`, async (req, res) => {
    try {
      const validatedData = partiesInsertSchema.parse(req.body);
      const newParty = await storage.createParty(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user!.id,
        type: "party_added",
        title: "New party added",
        description: `Added ${newParty.name} to party master`,
        partyId: newParty.id,
        timestamp: new Date() // Add timestamp explicitly
      });
      
      res.status(201).json(newParty);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating party:", error);
      res.status(500).json({ message: "Failed to create party" });
    }
  });

  app.patch(`${apiPrefix}/parties/:id`, async (req, res) => {
    try {
      const partyId = parseInt(req.params.id);
      const validatedData = partiesInsertSchema.partial().parse(req.body);
      
      const updatedParty = await storage.updateParty(partyId, validatedData);
      
      if (!updatedParty) {
        return res.status(404).json({ message: "Party not found" });
      }
      
      res.json(updatedParty);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating party:", error);
      res.status(500).json({ message: "Failed to update party" });
    }
  });
  
  app.delete(`${apiPrefix}/parties/:id`, async (req, res) => {
    try {
      const partyId = parseInt(req.params.id);
      
      // Get party details before deletion (for activity log)
      const party = await storage.getPartyById(partyId);
      
      if (!party) {
        return res.status(404).json({ message: "Party not found" });
      }
      
      await storage.deleteParty(partyId);
      
      // Log activity
      await storage.createActivity({
        userId: req.user!.id,
        type: "party_deleted",
        title: "Party deleted",
        description: `Deleted ${party.name} from party master`,
        timestamp: new Date()
      });
      
      res.status(200).json({ message: "Party deleted successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("related invoices")) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Error deleting party:", error);
      res.status(500).json({ message: typeof error === "object" && error instanceof Error ? error.message : "Failed to delete party" });
    }
  });

  // Invoices
  app.get(`${apiPrefix}/invoices`, async (req, res) => {
    try {
      const allInvoices = await storage.getAllInvoices();
      res.json(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get(`${apiPrefix}/invoices/recent`, async (req, res) => {
    try {
      const recentInvoices = await storage.getRecentInvoices(5);
      res.json(recentInvoices);
    } catch (error) {
      console.error("Error fetching recent invoices:", error);
      res.status(500).json({ message: "Failed to fetch recent invoices" });
    }
  });

  app.get(`${apiPrefix}/invoices/:id`, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get invoice items
      const items = await storage.getInvoiceItems(invoiceId);
      invoice.items = items;
      
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post(`${apiPrefix}/invoices`, async (req, res) => {
    try {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      const { items, ...invoiceData } = req.body;
      
      // Parse date fields - they need to be Date objects for the database
      // But they might be ISO strings from the frontend
      let parsedData = {
        ...invoiceData,
        partyId: parseInt(invoiceData.partyId), // Seller
        buyerId: parseInt(invoiceData.buyerId), // Buyer
        userId: req.user!.id,
        status: "pending",
        currency: invoiceData.currency || 'INR', // Default to INR if not provided
        remarks: invoiceData.remarks || '', // Default to empty string if not provided
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` // Generate invoice number
      };
      
      // Convert date strings to Date objects
      try {
        if (typeof parsedData.invoiceDate === 'string') {
          parsedData.invoiceDate = new Date(parsedData.invoiceDate);
        }
        if (typeof parsedData.dueDate === 'string') {
          parsedData.dueDate = new Date(parsedData.dueDate);
        }
      } catch (e) {
        console.error('Date parsing error:', e);
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      // Validate invoice data
      console.log('Validating with schema:', Object.keys(invoicesInsertSchema.shape));
      const validatedInvoiceData = invoicesInsertSchema.parse(parsedData);
      
      // Create invoice and items
      const newInvoice = await storage.createInvoice(validatedInvoiceData, items);
      
      // Log activity
      await storage.createActivity({
        userId: req.user!.id,
        type: "invoice_created",
        title: "New note created",
        description: `Note #${newInvoice.invoiceNumber} between seller ${newInvoice.partyName} and buyer ${newInvoice.buyerName}`,
        invoiceId: newInvoice.id,
        partyId: newInvoice.partyId,
        timestamp: new Date() // Add timestamp explicitly
      });
      
      res.status(201).json(newInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation error:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch(`${apiPrefix}/invoices/:id/status`, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["paid", "pending", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedInvoice = await storage.updateInvoiceStatus(invoiceId, status);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // If marked as paid, create a payment transaction
      if (status === "paid") {
        const transaction = await storage.createTransaction({
          invoiceId,
          amount: updatedInvoice.total,
          date: new Date(),
          type: "payment",
          notes: "Payment received",
          userId: req.user!.id,
          partyId: updatedInvoice.partyId,
        });
        
        // Log activity
        await storage.createActivity({
          userId: req.user!.id,
          type: "payment_received",
          title: "Payment received",
          description: `${formatCurrency(updatedInvoice.total)} from ${updatedInvoice.partyName}`,
          invoiceId: updatedInvoice.id,
          partyId: updatedInvoice.partyId,
          timestamp: new Date() // Add timestamp explicitly
        });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  // Update invoice notes
  app.patch(`${apiPrefix}/invoices/:id/notes`, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { notes } = req.body;
      
      if (typeof notes !== 'string') {
        return res.status(400).json({ message: "Notes must be a string" });
      }
      
      const updatedInvoice = await storage.updateInvoiceNotes(invoiceId, notes);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Create an activity for the note update
      await storage.createActivity({
        userId: req.user!.id,
        type: "invoice_note_updated",
        title: "Invoice Note Updated",
        description: `Invoice #${updatedInvoice.invoiceNumber} notes updated`,
        timestamp: new Date(),
        partyId: updatedInvoice.partyId,
        invoiceId: updatedInvoice.id
      });
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice notes:", error);
      res.status(500).json({ message: "Failed to update invoice notes" });
    }
  });

  // Get invoices for a specific party
  app.get(`${apiPrefix}/parties/:id/invoices`, async (req, res) => {
    try {
      const partyId = parseInt(req.params.id);
      const partyInvoices = await storage.getInvoicesByPartyId(partyId);
      res.json(partyInvoices);
    } catch (error) {
      console.error("Error fetching party invoices:", error);
      res.status(500).json({ message: "Failed to fetch party invoices" });
    }
  });

  // Transactions
  app.get(`${apiPrefix}/parties/:id/transactions`, async (req, res) => {
    try {
      const partyId = parseInt(req.params.id);
      const transactions = await storage.getTransactionsByPartyId(partyId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching party transactions:", error);
      res.status(500).json({ message: "Failed to fetch party transactions" });
    }
  });

  app.post(`${apiPrefix}/transactions`, async (req, res) => {
    try {
      const validatedData = transactionsInsertSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      
      const newTransaction = await storage.createTransaction(validatedData);
      
      // Update invoice status if this is a payment for an invoice
      if (validatedData.invoiceId && validatedData.type === "payment") {
        await storage.updateInvoiceStatus(validatedData.invoiceId, "paid");
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user!.id,
        type: "payment_received",
        title: "Payment recorded",
        description: `${formatCurrency(newTransaction.amount)} payment recorded`,
        invoiceId: newTransaction.invoiceId,
        partyId: newTransaction.partyId,
        timestamp: new Date() // Add timestamp explicitly
      });
      
      res.status(201).json(newTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Activities
  app.get(`${apiPrefix}/activities`, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Dashboard stats
  app.get(`${apiPrefix}/dashboard/stats`, async (req, res) => {
    try {
      const dateRange = req.query.dateRange as string || "month";
      const stats = await storage.getDashboardStats(dateRange);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Reports
  app.get(`${apiPrefix}/reports/outstanding`, async (req, res) => {
    try {
      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;
      
      const outstandingInvoices = await storage.getOutstandingInvoices(fromDate, toDate);
      res.json(outstandingInvoices);
    } catch (error) {
      console.error("Error fetching outstanding invoices:", error);
      res.status(500).json({ message: "Failed to fetch outstanding invoices" });
    }
  });

  app.get(`${apiPrefix}/reports/closed`, async (req, res) => {
    try {
      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;
      const status = req.query.status as string || "all";
      
      const closedInvoices = await storage.getClosedInvoices(fromDate, toDate, status);
      res.json(closedInvoices);
    } catch (error) {
      console.error("Error fetching closed invoices:", error);
      res.status(500).json({ message: "Failed to fetch closed invoices" });
    }
  });

  app.get(`${apiPrefix}/reports/sales`, async (req, res) => {
    try {
      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;
      const groupBy = req.query.groupBy as string || "monthly";
      
      const salesData = await storage.getSalesReport(fromDate, toDate, groupBy);
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching sales report:", error);
      res.status(500).json({ message: "Failed to fetch sales report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
