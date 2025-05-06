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
      const { items, ...invoiceData } = req.body;
      
      // Validate invoice data
      const validatedInvoiceData = invoicesInsertSchema.parse({
        ...invoiceData,
        partyId: parseInt(invoiceData.partyId),
        userId: req.user!.id,
        status: "pending",
      });
      
      // Create invoice and items
      const newInvoice = await storage.createInvoice(validatedInvoiceData, items);
      
      // Log activity
      await storage.createActivity({
        userId: req.user!.id,
        type: "invoice_created",
        title: "New invoice created",
        description: `Invoice #${newInvoice.invoiceNumber} for ${newInvoice.partyName}`,
        invoiceId: newInvoice.id,
        partyId: newInvoice.partyId,
      });
      
      res.status(201).json(newInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
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
        });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ message: "Failed to update invoice status" });
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
