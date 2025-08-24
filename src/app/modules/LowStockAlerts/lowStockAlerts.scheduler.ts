import cron from 'node-cron';
import pool from '../../../utils/dbClient';
import { logger } from '../../../shared/logger';

type ItemWithStock = {
  id: number;
  name: string;
  stock_quantity: string | number;
  min_stock: string | number;
  max_stock: string | number;
};

class LowStockAlertScheduler {
  private static instance: LowStockAlertScheduler;

  public static getInstance(): LowStockAlertScheduler {
    if (!LowStockAlertScheduler.instance) {
      LowStockAlertScheduler.instance = new LowStockAlertScheduler();
    }
    return LowStockAlertScheduler.instance;
  }

  /**
   * Check all items and create/update low stock alerts
   */
  public async checkAllItemsForLowStock(): Promise<void> {
    try {
      logger.info('🔄 Starting hourly low stock check...');

      // Get all items with their stock information
      const itemsQuery = `
        SELECT
          id,
          name,
          stock_quantity,
          min_stock,
          max_stock
        FROM items
        WHERE status = 'active'
      `;

      const itemsResult = await pool.query(itemsQuery);
      const items: ItemWithStock[] = itemsResult.rows;

      logger.info(`📊 Checking ${items.length} active items for low stock alerts`);

      let alertsCreated = 0;
      let alertsUpdated = 0;

      for (const item of items) {
        // Ensure proper decimal comparison by converting to numbers
        const stockQty = parseFloat(String(item.stock_quantity));
        const minStock = parseFloat(String(item.min_stock));
        const isLowStock = stockQty < minStock;

        // Check if alert already exists for this item
        const existingAlertQuery = `
          SELECT id, resolved, notes
          FROM low_stock_alerts
          WHERE item_id = $1
        `;

        const existingAlertResult = await pool.query(existingAlertQuery, [item.id]);
        const existingAlert = existingAlertResult.rows[0];

        if (isLowStock) {
          // Item is below minimum stock - should have an active alert
          if (!existingAlert) {
            // Create new alert
            await this.createLowStockAlert(item);
            alertsCreated++;
            logger.info(`🚨 Created new low stock alert for item: ${item.name} (Stock: ${stockQty}, Min: ${minStock})`);
          } else if (existingAlert.resolved) {
            // Update existing resolved alert to active
            await this.updateLowStockAlert(existingAlert.id, false, 'Alert starting');
            alertsUpdated++;
            logger.info(`🔄 Reactivated low stock alert for item: ${item.name} (Stock: ${item.stock_quantity}, Min: ${item.min_stock})`);
          }
        } else {
          // Item is above minimum stock - should have a resolved alert
          if (existingAlert && !existingAlert.resolved) {
            // Update existing active alert to resolved
            await this.updateLowStockAlert(existingAlert.id, true, 'Alert resolved');
            alertsUpdated++;
            logger.info(`✅ Resolved low stock alert for item: ${item.name} (Stock: ${item.stock_quantity}, Min: ${item.min_stock})`);
          } else if (!existingAlert) {
            // Create resolved alert for items that were never low
            await this.createLowStockAlert(item, true, 'Alert resolved');
            alertsCreated++;
            logger.info(`📝 Created resolved alert for item: ${item.name} (Stock: ${item.stock_quantity}, Min: ${item.min_stock})`);
          }
        }
      }

      logger.info(`✅ Hourly low stock check completed: ${alertsCreated} alerts created, ${alertsUpdated} alerts updated`);

    } catch (error) {
      logger.error('❌ Error during hourly low stock check:', error);
    }
  }

  /**
   * Create a new low stock alert
   */
  private async createLowStockAlert(
    item: ItemWithStock,
    resolved = false,
    notes = 'Alert starting'
  ): Promise<void> {
    const insertQuery = `
      INSERT INTO low_stock_alerts (
        item_id,
        current_stock,
        min_stock_threshold,
        alert_created_at,
        resolved,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      item.id,
      item.stock_quantity,
      item.min_stock,
      new Date(),
      resolved,
      notes
    ];

    await pool.query(insertQuery, values);
  }

  /**
   * Update an existing low stock alert
   */
  private async updateLowStockAlert(
    alertId: number,
    resolved: boolean,
    notes: string
  ): Promise<void> {
    const updateQuery = `
      UPDATE low_stock_alerts
      SET resolved = $1, notes = $2
      WHERE id = $3
    `;

    const values = [resolved, notes, alertId];
    await pool.query(updateQuery, values);
  }

  /**
   * Start the hourly scheduler
   */
  public startScheduler(): void {
    // Run every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
    cron.schedule('0 * * * *', () => {
      this.checkAllItemsForLowStock();
    }, {
      timezone: 'UTC'
    });

    logger.info('⏰ Low stock alert scheduler started - will run every hour');

    // Run initial check immediately
    this.checkAllItemsForLowStock();
  }

  /**
   * Stop the scheduler
   */
  public stopScheduler(): void {
    logger.info('⏹️ Low stock alert scheduler stopped');
  }
}

export default LowStockAlertScheduler;