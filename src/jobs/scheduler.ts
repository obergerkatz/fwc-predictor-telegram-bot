import cron from 'node-cron';
import { fixtureSyncJob } from './fixture-sync.job';
import { matchUpdateJob } from './match-update.job';
import { scoringJob } from './scoring.job';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export class JobScheduler {
  private jobs: cron.ScheduledTask[] = [];

  start(): void {
    logger.info('Starting job scheduler');

    // Fixture sync job (default: every 6 hours)
    const fixtureSyncCron = cron.schedule(
      config.jobs.fixtureSyncCron,
      async () => {
        try {
          await fixtureSyncJob.run();
        } catch (error) {
          logger.error('Fixture sync job error', { error });
        }
      },
      { scheduled: false }
    );

    // Match update job (default: every 5 minutes)
    const matchUpdateCron = cron.schedule(
      config.jobs.matchUpdateCron,
      async () => {
        try {
          await matchUpdateJob.run();
        } catch (error) {
          logger.error('Match update job error', { error });
        }
      },
      { scheduled: false }
    );

    // Scoring job (default: every 10 minutes)
    const scoringCron = cron.schedule(
      config.jobs.scoringCron,
      async () => {
        try {
          await scoringJob.run();
        } catch (error) {
          logger.error('Scoring job error', { error });
        }
      },
      { scheduled: false }
    );

    this.jobs = [fixtureSyncCron, matchUpdateCron, scoringCron];

    // Start all jobs
    this.jobs.forEach((job) => job.start());

    logger.info('Job scheduler started', {
      fixtureSyncCron: config.jobs.fixtureSyncCron,
      matchUpdateCron: config.jobs.matchUpdateCron,
      scoringCron: config.jobs.scoringCron,
    });

    // Run initial sync on startup
    logger.info('Running initial fixture sync');
    fixtureSyncJob.run().catch((error) => {
      logger.error('Initial fixture sync failed', { error });
    });
  }

  stop(): void {
    logger.info('Stopping job scheduler');
    this.jobs.forEach((job) => job.stop());
  }
}

export const jobScheduler = new JobScheduler();
