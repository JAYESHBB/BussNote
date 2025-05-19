import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { addDays, addHours, subDays, subHours } from "date-fns";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting seed process...");
    
    // Create admin user
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "admin")
    });
    
    let adminUser;
    if (!existingUser) {
      console.log("Creating admin user...");
      const hashedPassword = await hashPassword("password123");
      const [user] = await db.insert(schema.users).values({
        username: "admin",
        password: hashedPassword,
      }).returning();
      adminUser = user;
      console.log("Admin user created with id:", adminUser.id);
    } else {
      adminUser = existingUser;
      console.log("Admin user already exists with id:", adminUser.id);
    }
    
    // Create sample parties
    const partyNames = [
      { name: "Sharma Enterprises", contactPerson: "Rajesh Sharma", phone: "+91 9876543210", email: "rajesh@sharma.com" },
      { name: "Gupta Trading Co.", contactPerson: "Anil Gupta", phone: "+91 9871234567", email: "anil@guptatrading.com" },
      { name: "Patel & Sons", contactPerson: "Suresh Patel", phone: "+91 9988776655", email: "suresh@patelsons.com" },
      { name: "Singh Hardware", contactPerson: "Manpreet Singh", phone: "+91 9856324170", email: "manpreet@singhhardware.com" },
      { name: "Kumar Textiles", contactPerson: "Vijay Kumar", phone: "+91 9012345678", email: "vijay@kumartextiles.com" },
    ];
    
    const existingParties = await db.query.parties.findMany();
    const existingPartyNames = new Set(existingParties.map(p => p.name));
    
    const parties: schema.Party[] = [];
    
    for (const partyData of partyNames) {
      if (!existingPartyNames.has(partyData.name)) {
        console.log(`Creating party: ${partyData.name}...`);
        const [party] = await db.insert(schema.parties).values({
          ...partyData,
          address: `123 Main Street, Mumbai, India`,
          gstin: `GSTIN${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          notes: `Important client since ${new Date().getFullYear() - Math.floor(Math.random() * 5)}`
        }).returning();
        parties.push(party);
      } else {
        const party = existingParties.find(p => p.name === partyData.name)!;
        parties.push(party);
        console.log(`Party already exists: ${party.name} with id: ${party.id}`);
      }
    }
    
    // Check if we have existing invoices
    const existingInvoiceCount = await db.query.invoices.findMany({
      limit: 1
    });
    
    if (existingInvoiceCount.length === 0) {
      console.log("Creating sample invoices...");
      
      // Create sample invoices and invoice items
      const now = new Date();
      const invoiceData = [
        {
          partyId: parties[0].id,
          status: "paid",
          invoiceDate: subDays(now, 5),
          dueDate: addDays(subDays(now, 5), 15),
          paymentDate: subDays(now, 2),
          total: 4500,
          items: [
            { description: "Website Development", quantity: 1, rate: 4500 }
          ]
        },
        {
          partyId: parties[1].id,
          status: "pending",
          invoiceDate: subDays(now, 6),
          dueDate: addDays(subDays(now, 6), 15),
          total: 7200,
          items: [
            { description: "Mobile App Development", quantity: 1, rate: 6000 },
            { description: "Extra Feature", quantity: 4, rate: 300 }
          ]
        },
        {
          partyId: parties[2].id,
          status: "pending",
          invoiceDate: subDays(now, 8),
          dueDate: subDays(now, 1),
          total: 3800,
          items: [
            { description: "Logo Design", quantity: 1, rate: 2000 },
            { description: "Business Card Design", quantity: 3, rate: 600 }
          ]
        },
        {
          partyId: parties[3].id,
          status: "paid",
          invoiceDate: subDays(now, 10),
          dueDate: addDays(subDays(now, 10), 15),
          paymentDate: subDays(now, 5),
          total: 5950,
          items: [
            { description: "SEO Services", quantity: 1, rate: 3500 },
            { description: "Content Writing", quantity: 5, rate: 490 }
          ]
        },
        {
          partyId: parties[4].id,
          status: "paid",
          invoiceDate: subDays(now, 12),
          dueDate: addDays(subDays(now, 12), 15),
          paymentDate: subDays(now, 7),
          total: 6050,
          items: [
            { description: "Social Media Campaign", quantity: 1, rate: 5000 },
            { description: "Banner Design", quantity: 3, rate: 350 }
          ]
        }
      ];
      
      for (const [index, data] of invoiceData.entries()) {
        // Generate invoice number
        const year = new Date().getFullYear();
        const paddedNumber = (index + 38).toString().padStart(4, '0');
        const invoiceNo = `INV-${year}-${paddedNumber}`;
        
        // Calculate tax and subtotal
        const subtotal = data.total / 1.18; // Assuming 18% tax
        const tax = data.total - subtotal;
        
        // Create the invoice
        const [invoice] = await db.insert(schema.invoices).values({
          invoiceNo,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          status: data.status,
          subtotal: subtotal,
          tax: tax,
          total: data.total,
          userId: adminUser.id,
          partyId: data.partyId,
          paymentDate: data.status === "paid" ? data.paymentDate : null,
          notes: "Thank you for your business!"
        }).returning();
        
        console.log(`Created invoice: ${invoice.invoiceNo} with id: ${invoice.id}`);
        
        // Add invoice items
        for (const item of data.items) {
          await db.insert(schema.invoiceItems).values({
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate
          });
        }
        
        // If paid, create a transaction
        if (data.status === "paid") {
          const [transaction] = await db.insert(schema.transactions).values({
            amount: data.total,
            date: data.paymentDate!,
            type: "payment",
            notes: "Payment received",
            partyId: data.partyId,
            invoiceId: invoice.id,
            userId: adminUser.id
          }).returning();
          
          console.log(`Created transaction for invoice: ${invoice.invoiceNo}`);
          
          // Log activity for payment
          await db.insert(schema.activities).values({
            userId: adminUser.id,
            type: "payment_received",
            title: "Payment received",
            description: `₹${data.total} from ${parties.find(p => p.id === data.partyId)?.name}`,
            timestamp: subHours(data.paymentDate!, 2).toISOString(),
            partyId: data.partyId,
            invoiceId: invoice.id
          });
        }
        
        // Log activity for invoice creation
        await db.insert(schema.activities).values({
          userId: adminUser.id,
          type: "invoice_created",
          title: "New invoice created",
          description: `Invoice #${invoiceNumber} for ${parties.find(p => p.id === data.partyId)?.name}`,
          timestamp: subHours(data.invoiceDate, 1).toISOString(),
          partyId: data.partyId,
          invoiceId: invoice.id
        });
      }
      
      // Create a party added activity
      await db.insert(schema.activities).values({
        userId: adminUser.id,
        type: "party_added",
        title: "New party added",
        description: `Added Joshi Textiles to party master`,
        timestamp: subDays(now, 1).toISOString(),
        partyId: parties[0].id
      });
      
      // Create a payment reminder activity
      await db.insert(schema.activities).values({
        userId: adminUser.id,
        type: "payment_reminder",
        title: "Payment reminder sent",
        description: `For invoice #INV-2023-0040 to Patel & Sons`,
        timestamp: subDays(now, 1).toISOString(),
        partyId: parties[2].id
      });
      
      // Create a report generated activity
      await db.insert(schema.activities).values({
        userId: adminUser.id,
        type: "report_generated",
        title: "Report generated",
        description: `Monthly sales report for ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
        timestamp: subDays(now, 2).toISOString()
      });
      
      console.log("Seed completed successfully!");
    } else {
      console.log("Skipping invoice creation as invoices already exist.");
    }
  } catch (error) {
    console.error("Error during seed process:", error);
  }
}

seed();
