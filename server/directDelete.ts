import { Pool } from '@neondatabase/serverless';

// Function to directly delete an invoice and all related records
export async function directDeleteInvoice(pool: Pool, invoiceId: number): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Log the deletion attempt
    console.log(`Direct deletion attempt for invoice ${invoiceId}`);
    
    // First check if the invoice exists
    const checkResult = await client.query(
      'SELECT id FROM invoices WHERE id = $1',
      [invoiceId]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`Invoice ${invoiceId} not found, nothing to delete`);
      await client.query('ROLLBACK');
      return false;
    }
    
    // Delete all related records in order
    // 1. Invoice items
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
    
    // 2. Activities
    await client.query('DELETE FROM activities WHERE invoice_id = $1', [invoiceId]);
    
    // 3. Transactions
    await client.query('DELETE FROM transactions WHERE invoice_id = $1', [invoiceId]);
    
    // 4. Finally the invoice itself
    const deleteResult = await client.query('DELETE FROM invoices WHERE id = $1', [invoiceId]);
    
    // Verify deletion was successful
    if (deleteResult.rowCount === 0) {
      console.log(`Failed to delete invoice ${invoiceId}`);
      await client.query('ROLLBACK');
      return false;
    }
    
    // Double-check invoice is gone
    const verifyResult = await client.query('SELECT id FROM invoices WHERE id = $1', [invoiceId]);
    if (verifyResult.rows.length > 0) {
      console.log(`Verification failed - invoice ${invoiceId} still exists after deletion`);
      await client.query('ROLLBACK');
      return false;
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log(`Successfully deleted invoice ${invoiceId} and all related records`);
    return true;
  } catch (error) {
    // Log the error and rollback
    console.error(`Error deleting invoice ${invoiceId}:`, error);
    await client.query('ROLLBACK');
    return false;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}