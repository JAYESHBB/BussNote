import { Request, Response } from "express";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { invoices, parties } from "@shared/schema";

// Analytics API endpoints handler functions

/**
 * Generate brokerage analytics data
 */
export async function getBrokerageAnalytics(req: Request, res: Response) {
  try {
    const fromDateStr = req.query.fromDate as string;
    const toDateStr = req.query.toDate as string;
    
    const fromDate = fromDateStr ? new Date(fromDateStr) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1);
    const toDate = toDateStr ? new Date(toDateStr) : new Date();
    
    // Brokerage metrics with currency grouping
    const result = await db.execute(sql.raw(`
      SELECT 
        COALESCE(currency, 'INR') AS currency,
        SUM(CAST(brokerage_amount AS NUMERIC)) AS total_brokerage,
        SUM(CAST(brokerage_in_inr AS NUMERIC)) AS total_brokerage_inr,
        SUM(CAST(received_brokerage AS NUMERIC)) AS total_received,
        SUM(CAST(brokerage_in_inr AS NUMERIC)) - SUM(CAST(received_brokerage AS NUMERIC)) AS total_pending,
        COUNT(*) AS invoice_count,
        SUM(CASE WHEN total > 0 THEN total ELSE subtotal END) AS total_sales,
        ROUND(
          (SUM(CAST(brokerage_in_inr AS NUMERIC)) / 
          NULLIF(SUM(CASE WHEN total > 0 THEN total ELSE subtotal END), 0)) * 100, 
        2) AS brokerage_percentage
      FROM invoices
      WHERE invoice_date BETWEEN $1 AND $2
      GROUP BY currency
      ORDER BY total_sales DESC
    `), [fromDate, toDate]);
    
    // Total metrics across all currencies
    const totalsResult = await db.execute(sql.raw(`
      SELECT 
        SUM(CAST(brokerage_in_inr AS NUMERIC)) AS total_brokerage_inr,
        SUM(CAST(received_brokerage AS NUMERIC)) AS total_received,
        SUM(CAST(brokerage_in_inr AS NUMERIC)) - SUM(CAST(received_brokerage AS NUMERIC)) AS total_pending,
        COUNT(*) AS invoice_count,
        SUM(CASE WHEN total > 0 THEN total ELSE subtotal END) AS total_sales,
        ROUND(
          (SUM(CAST(brokerage_in_inr AS NUMERIC)) / 
          NULLIF(SUM(CASE WHEN total > 0 THEN total ELSE subtotal END), 0)) * 100, 
        2) AS average_brokerage_percentage
      FROM invoices
      WHERE invoice_date BETWEEN $1 AND $2
    `), [fromDate, toDate]);
    
    // Monthly trend of brokerage vs sales
    const monthlyTrend = await db.execute(sql.raw(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', invoice_date::date), 'YYYY-MM') AS month,
        SUM(CAST(brokerage_in_inr AS NUMERIC)) AS brokerage_inr,
        SUM(CAST(received_brokerage AS NUMERIC)) AS received_brokerage,
        SUM(CASE WHEN total > 0 THEN total ELSE subtotal END) AS sales
      FROM invoices
      WHERE invoice_date BETWEEN $1 AND $2
      GROUP BY month
      ORDER BY month
    `), [fromDate, toDate]);
    
    res.json({
      byCurrency: result.rows,
      totals: totalsResult.rows[0],
      monthlyTrend: monthlyTrend.rows,
      fromDate,
      toDate
    });
  } catch (error) {
    console.error("Error generating brokerage analytics:", error);
    res.status(500).json({ message: "Failed to generate brokerage analytics" });
  }
}

/**
 * Generate party sales analytics data
 */
export async function getPartySalesAnalytics(req: Request, res: Response) {
  try {
    const fromDateStr = req.query.fromDate as string;
    const toDateStr = req.query.toDate as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const fromDate = fromDateStr ? new Date(fromDateStr) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1);
    const toDate = toDateStr ? new Date(toDateStr) : new Date();
    
    // Top parties by sales amount
    const topParties = await db.execute(sql.raw(`
      SELECT 
        p.id,
        p.name,
        COUNT(i.id) AS invoice_count,
        SUM(CASE WHEN i.total > 0 THEN i.total ELSE i.subtotal END) AS total_sales,
        MAX(i.invoice_date) AS last_invoice_date,
        STRING_AGG(DISTINCT COALESCE(i.currency, 'INR'), ',') AS currencies
      FROM invoices i
      JOIN parties p ON i.party_id = p.id
      WHERE i.invoice_date BETWEEN $1 AND $2
      GROUP BY p.id, p.name
      ORDER BY total_sales DESC
      LIMIT $3
    `), [fromDate, toDate, limit]);
    
    // Party contribution to total sales
    const salesDistribution = await db.execute(sql.raw(`
      WITH total_sales AS (
        SELECT SUM(CASE WHEN total > 0 THEN total ELSE subtotal END) AS amount
        FROM invoices
        WHERE invoice_date BETWEEN $1 AND $2
      )
      SELECT 
        p.id,
        p.name,
        SUM(CASE WHEN i.total > 0 THEN i.total ELSE i.subtotal END) AS sales_amount,
        ROUND(
          (SUM(CASE WHEN i.total > 0 THEN i.total ELSE i.subtotal END) / 
           NULLIF((SELECT amount FROM total_sales), 0)) * 100, 
        2) AS contribution_percentage
      FROM invoices i
      JOIN parties p ON i.party_id = p.id
      WHERE i.invoice_date BETWEEN $1 AND $2
      GROUP BY p.id, p.name
      ORDER BY sales_amount DESC
      LIMIT $3
    `), [fromDate, toDate, limit]);
    
    res.json({
      topParties: topParties.rows,
      salesDistribution: salesDistribution.rows,
      fromDate,
      toDate
    });
  } catch (error) {
    console.error("Error generating party sales analytics:", error);
    res.status(500).json({ message: "Failed to generate party sales analytics" });
  }
}

/**
 * Generate sales trends data
 */
export async function getSalesTrends(req: Request, res: Response) {
  try {
    const period = req.query.period as string || "yearly";
    
    // Calculate time ranges based on period
    let timeGroup;
    let timeFormat;
    let periodCount;
    let compareGroup;
    let compareFormat;
    let compareLabel;
    const today = new Date();
    
    switch (period) {
      case "weekly":
        timeGroup = `DATE_TRUNC('week', invoice_date::date)`;
        timeFormat = `TO_CHAR(DATE_TRUNC('week', invoice_date::date), 'YYYY-WW')`;
        periodCount = 12; // Last 12 weeks
        compareGroup = `DATE_PART('week', invoice_date::date)`;
        compareFormat = `TO_CHAR(invoice_date::date, 'WW')`;
        compareLabel = 'week';
        break;
      case "monthly":
        timeGroup = `DATE_TRUNC('month', invoice_date::date)`;
        timeFormat = `TO_CHAR(DATE_TRUNC('month', invoice_date::date), 'YYYY-MM')`;
        periodCount = 12; // Last 12 months
        compareGroup = `DATE_PART('month', invoice_date::date)`;
        compareFormat = `TO_CHAR(invoice_date::date, 'MM')`;
        compareLabel = 'month';
        break;
      case "quarterly":
        timeGroup = `DATE_TRUNC('quarter', invoice_date::date)`;
        timeFormat = `TO_CHAR(DATE_TRUNC('quarter', invoice_date::date), 'YYYY-Q"Q"')`;
        periodCount = 8; // Last 8 quarters
        compareGroup = `DATE_PART('quarter', invoice_date::date)`;
        compareFormat = `TO_CHAR(DATE_TRUNC('quarter', invoice_date::date), 'Q')`;
        compareLabel = 'quarter';
        break;
      case "yearly":
      default:
        timeGroup = `DATE_TRUNC('year', invoice_date::date)`;
        timeFormat = `TO_CHAR(DATE_TRUNC('year', invoice_date::date), 'YYYY')`;
        periodCount = 5; // Last 5 years
        compareGroup = `DATE_PART('month', invoice_date::date)`;
        compareFormat = `TO_CHAR(invoice_date::date, 'MM')`;
        compareLabel = 'month';
        break;
    }
    
    // Calculate fromDate based on period
    let fromDate;
    switch (period) {
      case "weekly":
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - (7 * periodCount));
        break;
      case "monthly":
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - periodCount);
        break;
      case "quarterly":
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - (3 * periodCount));
        break;
      case "yearly":
      default:
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - periodCount);
        break;
    }
    
    // Get sales trends data
    const trendData = await db.execute(sql.raw(`
      SELECT 
        ${timeFormat} AS time_period,
        SUM(CASE WHEN total > 0 THEN total ELSE subtotal END) AS sales,
        COUNT(*) AS invoice_count,
        SUM(CAST(brokerage_in_inr AS NUMERIC)) AS brokerage,
        ROUND(AVG(CAST(exchange_rate AS NUMERIC)), 2) AS avg_exchange_rate
      FROM invoices
      WHERE invoice_date >= $1
      GROUP BY ${timeGroup}
      ORDER BY ${timeGroup}
    `), [fromDate]);
    
    // Get year-over-year comparison
    const comparisonData = await db.execute(sql.raw(`
      WITH sales_data AS (
        SELECT 
          DATE_PART('year', invoice_date::date) AS year,
          ${compareGroup} AS period_num,
          ${compareFormat} AS period,
          SUM(CASE WHEN total > 0 THEN total ELSE subtotal END) AS total
        FROM invoices
        WHERE invoice_date >= $1
        GROUP BY year, period_num, period
      )
      SELECT 
        period,
        period_num,
        jsonb_object_agg(year::text, total) AS yearly_sales
      FROM sales_data
      GROUP BY period, period_num
      ORDER BY period_num
    `), [fromDate]);
    
    res.json({
      trends: trendData.rows,
      comparison: {
        data: comparisonData.rows,
        periodType: compareLabel
      },
      period,
      fromDate
    });
  } catch (error) {
    console.error("Error generating sales trends:", error);
    res.status(500).json({ message: "Failed to generate sales trends" });
  }
}