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
    const { interviewId, code, language, problems, duration, testResults } = jobData;

    logger.info(`Processing AI report for interview ${interviewId}`);

    try {
      const evaluation = await evaluateCode({ code, language, problems, duration, testResults });

      await createReport({
        interviewId,
        correctness: evaluation.correctness,
        codeQuality: evaluation.codeQuality,
        timeComplexity: evaluation.timeComplexity,
        spaceComplexity: evaluation.spaceComplexity,
        edgeCaseHandling: evaluation.edgeCaseHandling,
        overallScore: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        summary: `${evaluation.summary}\n\n**Strengths:**\n${evaluation.strengths}\n\n**Weaknesses:**\n${evaluation.weaknesses}`,
        improvements: evaluation.improvements,
      });

      await updateInterview(interviewId, { status: 'evaluated' });

      logger.info(`AI report completed for interview ${interviewId}`);
    } catch (error) {
      logger.error(`AI report generation failed for interview ${interviewId}:`, error);
      await updateInterview(interviewId, { status: 'completed' });
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