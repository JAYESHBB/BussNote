import { Pool } from '@neondatabase/serverless';

/**
 * Simple, direct SQL-only function to delete an invoice and related records
 * This bypasses all Drizzle ORM code completely
 */
export async function rawDeleteInvoice(pool: Pool, invoiceId: number): Promise<boolean> {
  // Get a client from pool
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // First check if invoice exists
    const checkQuery = `SELECT id FROM invoices WHERE id = $1`;
    const checkResult = await client.query(checkQuery, [invoiceId]);
    
    if (checkResult.rowCount === 0) {
      console.log(`Invoice ${invoiceId} not found`);
      await client.query('ROLLBACK');
      return false;
    }
    
    // Delete in correct order - no ORM, just plain SQL
    const deleteItems = `DELETE FROM invoice_items WHERE invoice_id = $1`;
    await client.query(deleteItems, [invoiceId]);
    
    const deleteActivities = `DELETE FROM activities WHERE invoice_id = $1`;
    await client.query(deleteActivities, [invoiceId]);
    
    const deleteTransactions = `DELETE FROM transactions WHERE invoice_id = $1`;
    await client.query(deleteTransactions, [invoiceId]);
    
    const deleteInvoice = `DELETE FROM invoices WHERE id = $1`;
    const result = await client.query(deleteInvoice, [invoiceId]);
    
    // Check if invoice was actually deleted
    if (result.rowCount === 0) {
      console.log(`No invoice with ID ${invoiceId} was deleted`);
      await client.query('ROLLBACK');
      return false;
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log(`Successfully deleted invoice ${invoiceId}`);
    return true;
  } catch (error) {
    // Log any errors and rollback
    console.error(`Error deleting invoice ${invoiceId}:`, error);
    await client.query('ROLLBACK');
    return false;
  } finally {
    // Always release the client
    client.release();
  }
}