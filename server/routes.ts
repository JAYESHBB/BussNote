import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { eq, desc, and, gte, lte, isNull, isNotNull } from "drizzle-orm";
import { db } from "../db";
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
      
      // Calculate brokerage rate if not available
      let brokerageRate = invoice.brokerageRate;
      if (!brokerageRate && invoice.subtotal && invoice.tax) {
        const subtotal = parseFloat(invoice.subtotal);
        const tax = parseFloat(invoice.tax);
        if (!isNaN(subtotal) && !isNaN(tax) && subtotal > 0) {
          brokerageRate = ((tax / subtotal) * 100).toFixed(2);
        } else {
          brokerageRate = "0.75"; // Default brokerage rate
        }
      }
      
      // Return complete invoice data with all fields needed for editing
      const completeInvoice = {
        ...invoice,
        items,
        brokerageRate: typeof brokerageRate === 'string' ? brokerageRate : "0.75", // Ensure it's a string
        exchangeRate: (parseFloat(invoice.exchangeRate || "1.00")).toFixed(2), // Ensure exchange rate is a string
        remarks: invoice.notes || "", // Use notes field for remarks if missing
      };
      
      res.json(completeInvoice);
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

  // Update invoice (full edit)
  app.patch(`${apiPrefix}/invoices/:id`, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      console.log('Update invoice request body:', JSON.stringify(req.body, null, 2));
      
      // Extract the items array, notes/remarks and dates from the request body
      const { items, notes, invoiceDate, dueDate, ...updateData } = req.body;
      
      // Fix dates if they're strings
      if (invoiceDate && typeof invoiceDate === 'string') {
        updateData.invoiceDate = new Date(invoiceDate);
      }
      
      if (dueDate && typeof dueDate === 'string') {
        updateData.dueDate = new Date(dueDate);
      }
      
      // If notes field is provided, include it in the update data
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      // First, let's get the current invoice to verify it exists
      const existingInvoice = await storage.getInvoiceById(invoiceId);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Prepare the data for validation - convert any number strings to numbers
      const processedData = {...updateData};
      
      // Clean up the data for validation
      if (processedData.partyId && typeof processedData.partyId === 'string') {
        processedData.partyId = parseInt(processedData.partyId);
      }
      
      if (processedData.buyerId && typeof processedData.buyerId === 'string') {
        processedData.buyerId = parseInt(processedData.buyerId);
      }
      
      // Ensure numeric fields are in the expected string format
      // The schema validation is expecting strings for these fields
      if (processedData.exchangeRate && typeof processedData.exchangeRate === 'number') {
        processedData.exchangeRate = processedData.exchangeRate.toString();
      }
      
      if (processedData.brokerageRate && typeof processedData.brokerageRate === 'number') {
        processedData.brokerageRate = processedData.brokerageRate.toString();
      }
      
      if (processedData.subtotal && typeof processedData.subtotal === 'string') {
        processedData.subtotal = processedData.subtotal;
      }
      
      if (processedData.tax && typeof processedData.tax === 'string') {
        processedData.tax = processedData.tax;
      }
      
      if (processedData.brokerageInINR && typeof processedData.brokerageInINR === 'string') {
        processedData.brokerageInINR = processedData.brokerageInINR;
      }
      
      if (processedData.receivedBrokerage && typeof processedData.receivedBrokerage === 'string') {
        processedData.receivedBrokerage = processedData.receivedBrokerage;
      }
      
      if (processedData.balanceBrokerage && typeof processedData.balanceBrokerage === 'string') {
        processedData.balanceBrokerage = processedData.balanceBrokerage;
      }
      
      if (processedData.total && typeof processedData.total === 'string') {
        processedData.total = processedData.total;
      }
      
      // For boolean fields
      if (processedData.isClosed !== undefined) {
        // Ensure it's a proper boolean
        processedData.isClosed = Boolean(processedData.isClosed);
      }
      
      // Log the data we're trying to validate
      console.log('Data to be validated:', JSON.stringify(processedData, null, 2));
      
      // Validate the core invoice data
      let validatedUpdateData;
      try {
        validatedUpdateData = invoicesInsertSchema.partial().parse(processedData);
        console.log('Validation successful, validated data:', JSON.stringify(validatedUpdateData, null, 2));
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.log('Detailed validation error:', JSON.stringify(validationError.errors, null, 2));
        }
        // Rethrow to be caught by the outer catch
        throw validationError;
      }
      
      // Handle invoice items if provided
      if (items && Array.isArray(items)) {
        console.log('Updating invoice items:', items);
        
        // First, get the existing invoice items to handle deletion cleanly
        const existingItems = await storage.getInvoiceItems(invoiceId);
        
        // Delete existing items if we found any
        if (existingItems.length > 0) {
          await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
        }
        
        // Add new invoice items
        if (items.length > 0) {
          const itemsWithInvoiceId = items.map(item => ({
            description: item.description,
            quantity: item.quantity.toString(),
            rate: item.rate.toString(),
            invoiceId: invoiceId
          }));
          
          await db.insert(invoiceItems).values(itemsWithInvoiceId);
        }
      }
      
      // Update the invoice
      const updatedInvoice = await storage.updateInvoice(invoiceId, validatedUpdateData);
      
      if (!updatedInvoice) {
        return res.status(500).json({ message: "Failed to update invoice" });
      }
      
      // Create an activity for the invoice update
      await storage.createActivity({
        userId: req.user!.id,
        type: "invoice_updated",
        title: "Invoice Updated",
        description: `Invoice #${updatedInvoice.invoiceNumber} details updated`,
        timestamp: new Date(),
        partyId: updatedInvoice.partyId,
        invoiceId: updatedInvoice.id
      });
      
      // Get the updated invoice with items
      const fullUpdatedInvoice = await storage.getInvoiceById(invoiceId);
      
      if (fullUpdatedInvoice) {
        // Map notes to remarks for the response
        fullUpdatedInvoice.remarks = fullUpdatedInvoice.notes || "";
      }
      
      res.json(fullUpdatedInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('Validation error:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });
  
  // Delete invoice
  app.delete(`${apiPrefix}/invoices/:id`, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Get invoice details before deletion
      const invoice = await storage.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check invoice status - only pending invoices can be deleted
      if (invoice.status !== "pending") {
        return res.status(400).json({ 
          message: "Only pending invoices can be deleted. Please cancel the invoice first if needed." 
        });
      }
      
      // Store details for the response
      const invoiceNumber = invoice.invoiceNumber;
      const partyId = invoice.partyId;
      
      // Delete the invoice and all related records
      const success = await storage.deleteInvoice(invoiceId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete invoice" });
      }
      
      res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Get items for a specific invoice
  app.get(`${apiPrefix}/invoices/:id/items`, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const items = await storage.getInvoiceItems(invoiceId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ message: "Failed to fetch invoice items" });
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
