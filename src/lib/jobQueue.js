import { createClient } from 'redis';
import { logger } from './logger.js';

class JobQueue {
  constructor(redisUrl) {
    this.client = createClient({ url: redisUrl });
    this.isConnected = false;
    this.processors = new Map();
  }

  async connect() {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Job queue connected to Redis');
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async addJob(queueName, jobData, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: jobData,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay || 0
    };

    const score = Date.now() + (job.delay * 1000);
    await this.client.zAdd(`queue:${queueName}`, { score, value: JSON.stringify(job) });
    
    logger.info(`Job ${job.id} added to queue ${queueName}`);
    return job.id;
  }

  registerProcessor(queueName, processor) {
    this.processors.set(queueName, processor);
    this.processQueue(queueName);
  }

  async processQueue(queueName) {
    const process = async () => {
      try {
        const now = Date.now();
        const jobs = await this.client.zRangeByScore(`queue:${queueName}`, 0, now, { LIMIT: { offset: 0, count: 1 } });
        
        if (jobs.length === 0) {
          setTimeout(process, 1000);
          return;
        }

        const jobStr = jobs[0];
        const job = JSON.parse(jobStr);
        
        await this.client.zRem(`queue:${queueName}`, jobStr);
        
        try {
          const processor = this.processors.get(queueName);
          await processor(job.data);
          logger.info(`Job ${job.id} completed successfully`);
        } catch (error) {
          job.attempts++;
          if (job.attempts < job.maxAttempts) {
            const retryDelay = Math.pow(2, job.attempts) * 1000;
            const retryScore = Date.now() + retryDelay;
            await this.client.zAdd(`queue:${queueName}`, { score: retryScore, value: JSON.stringify(job) });
            logger.warn(`Job ${job.id} failed, retrying in ${retryDelay}ms (attempt ${job.attempts}/${job.maxAttempts})`);
          } else {
            await this.client.lPush(`queue:${queueName}:failed`, JSON.stringify({ ...job, error: error.message }));
            logger.error(`Job ${job.id} failed permanently after ${job.maxAttempts} attempts:`, error);
          }
        }
      } catch (error) {
        logger.error('Queue processing error:', error);
      }
      
      setTimeout(process, 100);
    };

    process();
  }

  async getQueueStats(queueName) {
    const [pending, failed] = await Promise.all([
      this.client.zCard(`queue:${queueName}`),
      this.client.lLen(`queue:${queueName}:failed`)
    ]);
    
    return { pending, failed };
  }
}

export const jobQueue = new JobQueue(process.env.REDIS_URL);