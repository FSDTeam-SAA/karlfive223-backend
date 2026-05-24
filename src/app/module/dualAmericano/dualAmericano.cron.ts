import cron from 'node-cron';
import { autoStartDualAmericanoEvents } from './dualAmericano.auto.service';

export const dualAmericanoCron = () => {
  /**
   * every minute
   */
  cron.schedule('* * * * *', async () => {
    console.log('Running Dual Americano auto-start cron...');

    await autoStartDualAmericanoEvents();
  });
};