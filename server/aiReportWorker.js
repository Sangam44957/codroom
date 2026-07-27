import { jobQueue } from '../src/lib/jobQueue.js';
import { evaluateCode } from '../src/lib/groq.js';
import { updateInterview, createReport } from '../src/repositories/interview.repository.js';
import { logger } from '../src/lib/logger.js';

class AIReportWorker {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('Starting AI report worker');
    
    await jobQueue.connect();
    
    jobQueue.registerProcessor('ai-reports', async (jobData) => {
      await this.processAIReport(jobData);
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async processAIReport(jobData) {
    const { interviewId, roomId, code, problems, rubricScores, customPrompt } = jobData;
    
    logger.info(`Processing AI report for interview ${interviewId}`);
    
    try {
      // Update status to processing
      await updateInterview(interviewId, {
        aiReportStatus: 'PROCESSING'
      });

      // Generate AI report
      const aiReport = await evaluateCode({
        code,
        problems,
        rubricScores,
        customPrompt
      });

      // Save report to database
      await createReport({
        interviewId,
        content: aiReport,
        generatedAt: new Date()
      });

      // Update interview status
      await updateInterview(interviewId, {
        aiReportStatus: 'COMPLETED'
      });

      logger.info(`AI report completed for interview ${interviewId}`);
      
    } catch (error) {
      logger.error(`AI report generation failed for interview ${interviewId}:`, error);
      
      await updateInterview(interviewId, {
        aiReportStatus: 'FAILED'
      });
      
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) return;
    
    logger.info('Stopping AI report worker');
    this.isRunning = false;
    
    await jobQueue.disconnect();
    process.exit(0);
  }
}

// Start worker if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new AIReportWorker();
  worker.start().catch(error => {
    logger.error('Failed to start AI report worker:', error);
    process.exit(1);
  });
}

export { AIReportWorker };