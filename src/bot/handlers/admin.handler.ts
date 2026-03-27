import { Context } from 'telegraf';
import { fixtureSyncJob } from '../../jobs/fixture-sync.job';
import { matchUpdateJob } from '../../jobs/match-update.job';
import { scoringJob } from '../../jobs/scoring.job';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';

function isAdmin(telegramId: string): boolean {
  return config.admin.telegramIds.includes(telegramId);
}

export async function handleAdminSync(ctx: Context): Promise<void> {
  try {
    if (!ctx.from) return;

    const telegramId = ctx.from.id.toString();

    if (!isAdmin(telegramId)) {
      await ctx.reply('You are not authorized to use this command.');
      return;
    }

    await ctx.reply('Starting fixture sync...');

    await fixtureSyncJob.run();

    await ctx.reply('✅ Fixture sync completed successfully!');

    logger.info('Admin triggered fixture sync', { telegramId });
  } catch (error) {
    logger.error('Error in admin sync', { error });
    await ctx.reply('❌ Fixture sync failed. Check logs for details.');
  }
}

export async function handleAdminUpdate(ctx: Context): Promise<void> {
  try {
    if (!ctx.from) return;

    const telegramId = ctx.from.id.toString();

    if (!isAdmin(telegramId)) {
      await ctx.reply('You are not authorized to use this command.');
      return;
    }

    await ctx.reply('Starting match update...');

    await matchUpdateJob.run();

    await ctx.reply('✅ Match update completed successfully!');

    logger.info('Admin triggered match update', { telegramId });
  } catch (error) {
    logger.error('Error in admin update', { error });
    await ctx.reply('❌ Match update failed. Check logs for details.');
  }
}

export async function handleAdminScore(ctx: Context): Promise<void> {
  try {
    if (!ctx.from) return;

    const telegramId = ctx.from.id.toString();

    if (!isAdmin(telegramId)) {
      await ctx.reply('You are not authorized to use this command.');
      return;
    }

    await ctx.reply('Starting scoring job...');

    await scoringJob.run();

    await ctx.reply('✅ Scoring completed successfully!');

    logger.info('Admin triggered scoring', { telegramId });
  } catch (error) {
    logger.error('Error in admin score', { error });
    await ctx.reply('❌ Scoring failed. Check logs for details.');
  }
}
