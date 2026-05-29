import { processMonthlyTurnoverCommissions } from "../services/finance/commissionService.js";
import logger from "../services/logger.js";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export const getMonthlyTurnoverCommissionJobInterval = () => {
  return parseInt(process.env.MONTHLY_COMMISSION_JOB_INTERVAL || TWELVE_HOURS_MS, 10);
};

export const getMonthlyTurnoverCommissionJobHandler = () => {
  return async () => {
    logger.info("Starting Monthly Turnover Commission Job");
    try {
      const now = new Date();
      // Only process if it is the 1st of the month, or you can let the service run daily 
      // but the service uses startOfPrevMonth which changes only on month rollover.
      // And the service has idempotency checks (existingTransaction) so it won't duplicate.
      
      const result = await processMonthlyTurnoverCommissions();
      
      if (result.success) {
        logger.info("Monthly Turnover Commission Job Completed", { processed: result.processed, message: result.message });
      } else {
        logger.error("Monthly Turnover Commission Job Failed", { error: result.error });
      }
    } catch (error) {
      logger.error("Monthly Turnover Commission Job Error", {
        error: error.message,
        stack: error.stack,
      });
    }
  };
};
