import { Request, Response } from "express";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { addMonths, format, subMonths, subYears } from "date-fns";

/**
 * Generate brokerage analytics data
 */
export async function getBrokerageAnalytics(req: Request, res: Response) {
  try {
    const fromDateStr = req.query.fromDate as string;
    const toDateStr = req.query.toDate as string;
    
    console.log("Received date params:", { fromDateStr, toDateStr });
    
    // Check if we have valid dates, then parse them
    const fromDate = fromDateStr && fromDateStr !== "undefined" && fromDateStr !== "null" 
      ? new Date(fromDateStr) 
      : subYears(new Date(), 1);
      
    const toDate = toDateStr && toDateStr !== "undefined" && toDateStr !== "null" 
      ? new Date(toDateStr) 
      : new Date();
    
    console.log("Parsed dates:", { fromDate, toDate });
    
    // Generate brokerage analytics with SQL
    const result = await db.execute(sql`
      SELECT 
        COALESCE(currency, 'INR') AS currency,
        SUM(CAST(brokerage_rate AS NUMERIC)) AS total_brokerage_rate,
        SUM(CAST(brokerage_inr AS NUMERIC)) AS total_brokerage_inr,
        SUM(CAST(received_brokerage AS NUMERIC)) AS total_received,
        SUM(CAST(brokerage_inr AS NUMERIC)) - SUM(CAST(received_brokerage AS NUMERIC)) AS total_pending,
        COUNT(*) AS invoice_count,
        SUM(CAST(subtotal AS NUMERIC)) AS total_sales,
        ROUND(
          (SUM(CAST(brokerage_inr AS NUMERIC)) / 
          NULLIF(SUM(CASE WHEN total > 0 THEN CAST(total AS NUMERIC) ELSE CAST(subtotal AS NUMERIC) END), 0)) * 100, 
        2) AS brokerage_percentage
      FROM invoices
      WHERE invoice_date BETWEEN ${fromDate} AND ${toDate}
      GROUP BY currency
      ORDER BY total_sales DESC
    `);
    
    // Total metrics across all currencies
    const totalsResult = await db.execute(sql`
      SELECT 
        SUM(CAST(brokerage_inr AS NUMERIC)) AS total_brokerage_inr,
        SUM(CAST(received_brokerage AS NUMERIC)) AS total_received,
        SUM(CAST(brokerage_inr AS NUMERIC)) - SUM(CAST(received_brokerage AS NUMERIC)) AS total_pending,
        COUNT(*) AS invoice_count,
        SUM(CAST(subtotal AS NUMERIC)) AS total_sales,
        ROUND(
          (SUM(CAST(brokerage_inr AS NUMERIC)) / 
          NULLIF(SUM(CASE WHEN total > 0 THEN CAST(total AS NUMERIC) ELSE CAST(subtotal AS NUMERIC) END), 0)) * 100, 
        2) AS average_brokerage_percentage
      FROM invoices
      WHERE invoice_date BETWEEN ${fromDate} AND ${toDate}
    `);
    
    // Monthly trend of brokerage vs sales
    const monthlyTrend = await db.execute(sql`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', invoice_date::date), 'YYYY-MM') AS month,
        SUM(CAST(brokerage_inr AS NUMERIC)) AS brokerage_inr,
        SUM(CAST(received_brokerage AS NUMERIC)) AS received_brokerage,
        SUM(CASE WHEN total > 0 THEN CAST(total AS NUMERIC) ELSE CAST(subtotal AS NUMERIC) END) AS sales
      FROM invoices
      WHERE invoice_date BETWEEN ${fromDate} AND ${toDate}
      GROUP BY month
      ORDER BY month
    `);
    
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
    
    console.log("Party Sales: Received date params:", { fromDateStr, toDateStr });
    
    // Check if we have valid dates, then parse them
    const fromDate = fromDateStr && fromDateStr !== "undefined" && fromDateStr !== "null" 
      ? new Date(fromDateStr) 
      : subYears(new Date(), 1);
      
    const toDate = toDateStr && toDateStr !== "undefined" && toDateStr !== "null" 
      ? new Date(toDateStr) 
      : new Date();
    
    console.log("Party Sales: Parsed dates:", { fromDate, toDate });
    
    // Top parties by sales amount
    const topParties = await db.execute(sql`
      SELECT 
        p.id,
        p.name,
        COUNT(i.id) AS invoice_count,
        SUM(i.subtotal) AS total_sales,
        MAX(i.invoice_date) AS last_invoice_date,
        STRING_AGG(DISTINCT COALESCE(i.currency, 'INR'), ',') AS currencies
      FROM invoices i
      JOIN parties p ON i.party_id = p.id
      WHERE i.invoice_date BETWEEN ${fromDate} AND ${toDate}
      GROUP BY p.id, p.name
      ORDER BY total_sales DESC
      LIMIT ${limit}
    `);
    
    // Party contribution to total sales
    const salesDistribution = await db.execute(sql`
      WITH total_sales AS (
        SELECT SUM(subtotal) AS amount
        FROM invoices
        WHERE invoice_date BETWEEN ${fromDate} AND ${toDate}
      )
      SELECT 
        p.id,
        p.name,
        SUM(i.subtotal) AS sales_amount,
        ROUND(
          (SUM(i.subtotal) / 
           NULLIF((SELECT amount FROM total_sales), 0)) * 100, 
        2) AS contribution_percentage
      FROM invoices i
      JOIN parties p ON i.party_id = p.id
      WHERE i.invoice_date BETWEEN ${fromDate} AND ${toDate}
      GROUP BY p.id, p.name
      ORDER BY sales_amount DESC
      LIMIT ${limit}
    `);
    
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
    const periodType = req.query.periodType as string || "monthly";
    // Check both possible parameter names (for compatibility)
    const fromDateStr = (req.query.from || req.query.fromDate) as string;
    const toDateStr = (req.query.to || req.query.toDate) as string;
    
    console.log("Sales Trends: Received date params:", { fromDateStr, toDateStr, periodType });
    console.log("Full query params:", req.query);
    
    // Check if we have valid dates, then parse them
    const fromDate = fromDateStr && fromDateStr !== "undefined" && fromDateStr !== "null" 
      ? new Date(fromDateStr) 
      : subYears(new Date(), 1);
      
    const toDate = toDateStr && toDateStr !== "undefined" && toDateStr !== "null" 
      ? new Date(toDateStr) 
      : new Date();
    
    console.log("Sales Trends: Parsed dates:", { fromDate, toDate, periodType });
    
    // Set up time grouping based on period type
    let timeGroup;
    let timeFormat;
    let compareGroup;
    let compareFormat;
    let compareLabel;
    
    // Default to monthly periods
    timeGroup = `DATE_TRUNC('month', invoice_date::date)`;
    timeFormat = `TO_CHAR(DATE_TRUNC('month', invoice_date::date), 'YYYY-MM')`;
    compareGroup = `DATE_PART('month', invoice_date::date)`;
    compareFormat = `TO_CHAR(invoice_date::date, 'MM')`;
    compareLabel = 'month';
    
    switch (periodType) {
      case "weekly":
        timeGroup = `DATE_TRUNC('week', invoice_date::date)`;
        timeFormat = `TO_CHAR(DATE_TRUNC('week', invoice_date::date), 'YYYY-WW')`;
        compareGroup = `DATE_PART('week', invoice_date::date)`;
        compareFormat = `TO_CHAR(invoice_date::date, 'WW')`;
        compareLabel = 'week';
        break;
      case "monthly":
        // Use defaults (already set)
        break;
      case "quarterly":
        timeGroup = `DATE_TRUNC('quarter', invoice_date::date)`;
        timeFormat = `TO_CHAR(DATE_TRUNC('quarter', invoice_date::date), 'YYYY-Q"Q"')`;
        compareGroup = `DATE_PART('quarter', invoice_date::date)`;
        compareFormat = `TO_CHAR(DATE_TRUNC('quarter', invoice_date::date), 'Q')`;
        compareLabel = 'quarter';
        break;
      case "yearly":
        timeGroup = `DATE_TRUNC('year', invoice_date::date)`;
        timeFormat = `TO_CHAR(DATE_TRUNC('year', invoice_date::date), 'YYYY')`;
        compareGroup = `DATE_PART('year', invoice_date::date)`;
        compareFormat = `TO_CHAR(invoice_date::date, 'YYYY')`;
        compareLabel = 'year';
        break;
    }
    
    console.log(`Fetching sales trends with date range: ${fromDate.toISOString()} to ${toDate.toISOString()}, period type: ${periodType}`);
    
    // Get sales trends data using user-selected date range with currency breakdown
    const trendData = await db.execute(sql`
      SELECT 
        ${timeFormat} AS period,
        SUM(CAST(subtotal AS NUMERIC)) AS totalSales,
        COUNT(*) AS invoiceCount,
        SUM(CAST(brokerage_inr AS NUMERIC)) AS totalBrokerage,
        SUM(CAST(received_brokerage AS NUMERIC)) AS receivedBrokerage,
        ROUND(AVG(CAST(exchange_rate AS NUMERIC)), 2) AS avgExchangeRate,
        COALESCE(currency, 'INR') AS currency
      FROM invoices
      WHERE invoice_date BETWEEN ${fromDate} AND ${toDate}
      GROUP BY ${timeGroup}, currency
      ORDER BY ${timeGroup}, currency
    `);
    
    // Get year-over-year comparison data
    const comparisonData = await db.execute(sql`
      WITH sales_data AS (
        SELECT 
          DATE_PART('year', invoice_date::date) AS year,
          ${compareGroup} AS period_num,
          ${compareFormat} AS period,
          SUM(CASE WHEN total > 0 THEN CAST(total AS NUMERIC) ELSE CAST(subtotal AS NUMERIC) END) AS total
        FROM invoices
        WHERE invoice_date BETWEEN ${fromDate} AND ${toDate}
        GROUP BY year, period_num, period
      )
      SELECT 
        period,
        period_num,
        jsonb_object_agg(year::text, total) AS yearly_sales
      FROM sales_data
      GROUP BY period, period_num
      ORDER BY period_num
    `);
    
    // Transform data into the expected format for the frontend with currency info
    const trendsData = trendData.rows.map(row => ({
      period: row.period as string,
      totalSales: parseFloat(row.totalsales as string || "0"),
      totalBrokerage: parseFloat(row.totalbrokerage as string || "0"),
      receivedBrokerage: parseFloat(row.receivedbrokerage as string || "0"),
      invoiceCount: parseInt(row.invoicecount as string || "0"),
      avgExchangeRate: parseFloat(row.avgexchangerate as string || "0"),
      currency: row.currency as string || "INR"
    }));
    
    // Group data by period to combine multiple currencies in same period
    interface TrendItem {
      period: string;
      totalSales: number;
      totalBrokerage: number;
      receivedBrokerage: number;
      invoiceCount: number;
      avgExchangeRate: number;
      currency: string;
      currencies?: string[];
      [key: string]: any; // For dynamic currency-specific fields
    }
    
    const groupedTrends: TrendItem[] = trendsData.reduce((acc: TrendItem[], curr: TrendItem) => {
      const existingPeriod = acc.find(item => item.period === curr.period);
      
      if (existingPeriod) {
        // Append currency-specific data
        existingPeriod[`sales_${curr.currency}`] = curr.totalSales;
        existingPeriod[`brokerage_${curr.currency}`] = curr.totalBrokerage;
        existingPeriod[`received_${curr.currency}`] = curr.receivedBrokerage;
        
        // Update totals
        existingPeriod.totalSales += curr.totalSales;
        existingPeriod.totalBrokerage += curr.totalBrokerage;
        existingPeriod.receivedBrokerage += curr.receivedBrokerage;
        existingPeriod.currencies = [...(existingPeriod.currencies || []), curr.currency];
      } else {
        // Create new period entry with currency data
        acc.push({
          ...curr,
          [`sales_${curr.currency}`]: curr.totalSales,
          [`brokerage_${curr.currency}`]: curr.totalBrokerage,
          [`received_${curr.currency}`]: curr.receivedBrokerage,
          currencies: [curr.currency]
        });
      }
      
      return acc;
    }, []);

    res.json({
      data: groupedTrends,
      comparison: {
        data: comparisonData.rows,
        periodType: compareLabel
      },
      periodType,
      fromDate,
      toDate
    });
  } catch (error) {
    console.error("Error generating sales trends:", error);
    res.status(500).json({ message: "Failed to generate sales trends" });
  }
}