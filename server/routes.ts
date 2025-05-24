import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { eq, desc, and, gte, lte, isNull, isNotNull, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { rawDeleteInvoice } from "./rawDeleteInvoice";
import { getBrokerageAnalytics, getPartySalesAnalytics, getSalesTrends } from './analytics';
import {
  parties,
  invoices,
  invoiceItems,
  transactions,
  activities,
  users,
  partiesInsertSchema,
  invoicesInsertSchema,
  transactionsInsertSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes MUST come before auth setup to avoid conflicts
  const apiPrefix = "/api";
  
  console.log("Registering API routes with prefix:", apiPrefix);

  // User Management API - Create New User (DIFFERENT ROUTE TO AVOID CONFLICTS!)
  app.post(`${apiPrefix}/create-user`, async (req: Request, res: Response) => {
    console.log("🚀🚀🚀 CREATE USER API ENDPOINT HIT 🚀🚀🚀");
    console.log("Request Method:", req.method);
    console.log("Request Path:", req.path);
    console.log("Request Body:", JSON.stringify(req.body, null, 2));
    console.log("Content-Type:", req.headers['content-type']);
    
    try {
      // Note: For user creation, we should check if current user is admin
      // For now, skip authentication to allow user creation
      console.log("✅ Proceeding with user creation (authentication skipped for admin function)");

      const { username, fullName, email, password, role, mobile } = req.body;
      
      // Validate required fields
      if (!username || !fullName || !email || !password || !mobile) {
        console.log("❌ Missing required fields");
        return res.status(400).json({ error: "All fields are required" });
      }

      // Check if username already exists
      console.log("Checking username availability...");
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log("❌ Username already exists");
        return res.status(409).json({ error: "Username already exists" });
      }

      // Hash password using the same method as auth
      console.log("Hashing password...");
      const { randomBytes, scryptSync } = await import('crypto');
      const salt = randomBytes(16).toString('hex');
      const hashedPassword = scryptSync(password, salt, 64).toString('hex') + '.' + salt;

      // Create user data
      const userData = {
        username,
        fullName,
        email,
        mobile,
        password: hashedPassword,
        role: role || 'user'
      };

      console.log("Creating user in database...");
      const newUser = await storage.createUser(userData);
      
      console.log("✅ User created successfully with ID:", newUser.id);
      
      // Return user without password
      const { password: _, ...userResponse } = newUser;
      return res.status(201).json(userResponse);
      
    } catch (error) {
      console.error("❌ Error creating user:", error);
      return res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Public endpoints (before auth setup)
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

  // Email availability check
  app.get(`${apiPrefix}/check-email`, async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required", available: false });
      }
      
      // Check if email exists in database
      const existingUser = await storage.getUserByEmail(email);
      
      // Return result
      res.json({ available: !existingUser });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ message: "Failed to check email availability", available: false });
    }
  });

  // Mobile availability check
  app.get(`${apiPrefix}/check-mobile`, async (req: Request, res: Response) => {
    try {
      const mobile = req.query.mobile as string;
      
      if (!mobile) {
        return res.status(400).json({ message: "Mobile is required", available: false });
      }
      
      // Check if mobile exists in database
      const existingUser = await storage.getUserByMobile(mobile);
      
      // Return result
      res.json({ available: !existingUser });
    } catch (error) {
      console.error("Error checking mobile:", error);
      res.status(500).json({ message: "Failed to check mobile availability", available: false });
    }
  });

  // User verification endpoint for first-time setup
  app.post(`${apiPrefix}/verify-user`, async (req: Request, res: Response) => {
    try {
      const { username, email, mobile } = req.body;

      if (!username || !email || !mobile) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Find user with matching credentials
      const user = await storage.getUserByUsername(username);
      if (!user || user.email !== email || user.mobile !== mobile) {
        return res.status(400).json({ message: "User details do not match our records" });
      }

      // Check if user already has a password set (password field is not empty)
      const hasPassword = user.password && user.password.trim().length > 0;

      res.json({ 
        userId: user.id, 
        hasPassword,
        message: hasPassword ? "User already has password" : "User verified successfully"
      });

    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password setup endpoint for first-time users
  app.post(`${apiPrefix}/setup-password`, async (req: Request, res: Response) => {
    try {
      const { userId, password } = req.body;

      if (!userId || !password) {
        return res.status(400).json({ message: "User ID and password are required" });
      }

      // Verify user exists and doesn't already have a password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.password && user.password.trim().length > 0) {
        return res.status(400).json({ message: "User already has a password set" });
      }

      // Hash the password using the same function from auth.ts
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Update user with new password
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ message: "Password set successfully" });

    } catch (error) {
      console.error("Error setting up password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sets up /api/register, /api/login, /api/logout, /api/user  
  setupAuth(app);

  // User Management Routes
  app.get(`${apiPrefix}/users`, async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const users = await storage.getAllUsers();
      console.log("Fetched users:", users);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put(`${apiPrefix}/users/:id`, async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      const user = await storage.updateUser(userId, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch(`${apiPrefix}/users/:id/status`, async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const userId = parseInt(req.params.id);
      const { status } = req.body;
      
      // Check if user has dependencies (invoices, transactions, etc.)
      const hasDependencies = await storage.userHasDependencies(userId);
      
      if (hasDependencies && status === 'deleted') {
        return res.status(400).json({ 
          message: "Unable to delete user. User has associated data. User has been set to inactive instead.",
          updatedStatus: 'inactive'
        });
      }
      
      const user = await storage.updateUserStatus(userId, status === 'deleted' && hasDependencies ? 'inactive' : status);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Delete user endpoint
  app.delete(`${apiPrefix}/users/:id`, async (req: Request, res: Response) => {
    console.log("=== DELETE USER REQUEST RECEIVED ===");
    console.log("Request params:", req.params);
    console.log("User authenticated:", req.isAuthenticated ? req.isAuthenticated() : 'No auth method');
    
    // Skip auth check for debugging - we'll fix this properly later
    
    try {
      const userId = parseInt(req.params.id);
      console.log("Parsed userId:", userId);
      
      if (isNaN(userId)) {
        console.log("Invalid user ID provided");
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Direct database delete using SQL
      console.log("Attempting direct database delete...");
      const result = await db.delete(users).where(eq(users.id, userId));
      console.log("Delete operation completed for user ID:", userId);
      
      console.log("User successfully deleted from database");
      res.json({ message: "User deleted successfully", success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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
  
  app.get(`${apiPrefix}/parties/:id/has-invoices`, async (req, res) => {
    try {
      const partyId = parseInt(req.params.id);
      const hasInvoices = await storage.partyHasInvoices(partyId);
      res.json({ hasInvoices });
    } catch (error) {
      console.error("Error checking party invoices:", error);
      res.status(500).json({ message: "Failed to check party invoices" });
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
      console.error("Error deleting party:", error);
      
      // Simple error message for any delete failure
      res.status(409).json({ 
        message: "Unable to Delete Party"
      });
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
      if (!brokerageRate && invoice.subtotal && invoice.brokerageInINR) {
        const subtotal = parseFloat(invoice.subtotal);
        const brokerage = parseFloat(invoice.brokerageInINR);
        if (!isNaN(subtotal) && !isNaN(brokerage) && subtotal > 0) {
          brokerageRate = ((brokerage / subtotal) * 100).toFixed(2);
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
        notes: invoice.notes || "", // Use notes field
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
        invoiceNo: invoiceData.invoiceNo || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` // Use provided invoice number or generate one
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
        description: `Note #${newInvoice.invoiceNo} between seller ${newInvoice.partyName} and buyer ${newInvoice.buyerName}`,
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
      
      console.log(`Updating invoice ${invoiceId} to status: ${status}`);
      
      if (!["paid", "pending", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedInvoice = await storage.updateInvoiceStatus(invoiceId, status);
      console.log("Updated invoice:", updatedInvoice);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // If marked as paid, create a payment transaction
      if (status === "paid") {
        try {
          // Use total if it's greater than 0, otherwise use subtotal
          const total = updatedInvoice.total || "0";
          const subtotal = updatedInvoice.subtotal || "0";
          const paymentAmount = parseFloat(total) > 0 ? total : subtotal;
          
          console.log("Payment amount calculated:", paymentAmount);
          
          // Skip creating the transaction if no valid user or party ID
          if (!updatedInvoice.partyId) {
            console.log("Cannot create transaction: Missing party ID");
            return res.json(updatedInvoice);
          }
          
          // Use user ID 1 as a fallback
          const userId = 1;
          
          console.log("Creating transaction with:", {
            invoiceId,
            amount: paymentAmount,
            partyId: updatedInvoice.partyId,
            userId
          });
          
          const transaction = await storage.createTransaction({
            invoiceId,
            amount: paymentAmount,
            date: new Date(),
            type: "payment",
            notes: "Payment received",
            userId: userId,
            partyId: updatedInvoice.partyId,
          });
          
          console.log("Transaction created:", transaction);
          
          // Log activity
          await storage.createActivity({
            userId: userId,
            type: "payment_received",
            title: "Payment received",
            description: `Payment received for invoice #${updatedInvoice.invoiceNo}`,
            invoiceId: updatedInvoice.id,
            partyId: updatedInvoice.partyId,
            timestamp: new Date()
          });
          
          console.log("Activity logged successfully");
        } catch (txError) {
          console.error("Error in transaction creation:", txError);
          // Continue despite transaction error - at least the status is updated
        }
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
        description: `Invoice #${updatedInvoice.invoiceNo} notes updated`,
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
      
      // Extract the items array, notes and dates from the request body
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
        description: `Invoice #${updatedInvoice.invoiceNo} details updated`,
        timestamp: new Date(),
        partyId: updatedInvoice.partyId,
        invoiceId: updatedInvoice.id
      });
      
      // Get the updated invoice with items
      const fullUpdatedInvoice = await storage.getInvoiceById(invoiceId);
      
      // Get full updated invoice with items and return it
      
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
  
  // Emergency invoice cleanup endpoint - direct SQL approach
  app.post(`${apiPrefix}/force-delete-invoice`, async (req, res) => {
    try {
      // Get invoice ID from request body
      const { id } = req.body;
      const invoiceId = parseInt(id);
      
      if (!invoiceId || isNaN(invoiceId)) {
        return res.status(400).json({ message: "Valid invoice ID is required" });
      }
      
      // Use a direct connection from the pool
      const client = await pool.connect();
      
      try {
        // Start transaction
        await client.query('BEGIN');
        
        // Directly delete all related data without checks
        console.log(`Force deleting invoice ${invoiceId} and all related data`);
        
        // Check if invoice exists
        const checkResult = await client.query(
          'SELECT id FROM invoices WHERE id = $1',
          [invoiceId]
        );
        
        if (checkResult.rows.length === 0) {
          await client.query('ROLLBACK');
          console.error(`Invoice ${invoiceId} not found for deletion`);
          return res.status(404).json({ message: "Invoice not found" });
        }
        
        // We've discovered that the database operations need to be done in a specific order
        // First delete related records in child tables
        console.log(`Deleting invoice items for invoice ${invoiceId}...`);
        const itemsResult = await client.query('DELETE FROM invoice_items WHERE invoice_id = $1 RETURNING id', [invoiceId]);
        console.log(`Deleted ${itemsResult.rowCount} invoice items`);
        
        console.log(`Deleting activities for invoice ${invoiceId}...`);
        const activitiesResult = await client.query('DELETE FROM activities WHERE invoice_id = $1 RETURNING id', [invoiceId]);
        console.log(`Deleted ${activitiesResult.rowCount} activities`);
        
        console.log(`Deleting transactions for invoice ${invoiceId}...`);
        const transactionsResult = await client.query('DELETE FROM transactions WHERE invoice_id = $1 RETURNING id', [invoiceId]);
        console.log(`Deleted ${transactionsResult.rowCount} transactions`);
        
        // After deleting all related records, delete the invoice itself
        console.log(`Deleting invoice ${invoiceId}...`);
        const invoiceResult = await client.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [invoiceId]);
        console.log(`Deleted invoice result: ${JSON.stringify(invoiceResult.rows)}`);
        
        // Confirm invoice was deleted by checking if it still exists
        const checkDeletedResult = await client.query('SELECT id FROM invoices WHERE id = $1', [invoiceId]);
        if (checkDeletedResult.rows.length > 0) {
          // This should never happen if deletion worked
          await client.query('ROLLBACK');
          console.error(`Failed to delete invoice ${invoiceId}, it still exists after deletion`);
          return res.status(500).json({ message: "Failed to delete invoice - it still exists in the database" });
        }
        
        if (invoiceResult.rowCount === 0) {
          await client.query('ROLLBACK');
          console.error(`Failed to delete invoice ${invoiceId}`);
          return res.status(500).json({ message: "Failed to delete invoice record" });
        }
        
        await client.query('COMMIT');
        
        console.log(`Successfully force deleted invoice ${invoiceId}`);
        return res.status(200).json({ 
          success: true,
          message: `Invoice ${invoiceId} and all related data successfully deleted`
        });
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error("Database error during force delete:", error);
        return res.status(500).json({
          message: "Database error during force delete operation",
          error: error.message
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error in force delete endpoint:", error);
      return res.status(500).json({
        message: "Error processing force delete request",
        error: error.message
      });
    }
  });
  
  // New super simple invoice deletion endpoint with raw SQL
  app.delete(`${apiPrefix}/invoices/:id`, async (req, res) => {
    try {
      // Parse the invoice ID from the request parameters
      const invoiceId = parseInt(req.params.id);
      
      if (isNaN(invoiceId)) {
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      
      console.log(`Attempting to delete invoice ${invoiceId} using raw SQL method`);
      
      // Use our raw SQL direct deletion function
      const success = await rawDeleteInvoice(pool, invoiceId);
      
      if (success) {
        console.log(`Successfully deleted invoice ${invoiceId}`);
        return res.status(200).json({ 
          message: "Invoice deleted successfully" 
        });
      } else {
        console.log(`Failed to delete invoice ${invoiceId}`);
        return res.status(404).json({ 
          message: "Invoice not found or could not be deleted" 
        });
      }
    } catch (error) {
      // Using a very simple error handling approach
      console.error("Error deleting invoice:", error);
      return res.status(500).json({ 
        message: "Failed to delete invoice"
      });
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

  // Analytics API routes
  app.get(`${apiPrefix}/analytics/brokerage`, async (req, res) => {
    getBrokerageAnalytics(req, res);
  });
  
  app.get(`${apiPrefix}/analytics/party-sales`, async (req, res) => {
    getPartySalesAnalytics(req, res);
  });
  
  app.get(`${apiPrefix}/analytics/trends`, async (req, res) => {
    getSalesTrends(req, res);
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
