const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const logger = require('./logger');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
      
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-saas';
      const dbName = mongoUri.split('/').pop();
      
      const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
      
      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.error('Backup failed', error);
            reject(error);
            return;
          }
          
          logger.info('Backup created successfully', { 
            backupPath,
            stdout,
            stderr 
          });
          
          resolve(backupPath);
        });
      });
    } catch (error) {
      logger.error('Backup creation error', error);
      throw error;
    }
  }

  async restoreBackup(backupPath) {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-saas';
      const dbName = mongoUri.split('/').pop();
      
      const command = `mongorestore --uri="${mongoUri}" --drop "${path.join(backupPath, dbName)}"`;
      
      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.error('Restore failed', error);
            reject(error);
            return;
          }
          
          logger.info('Backup restored successfully', { 
            backupPath,
            stdout,
            stderr 
          });
          
          resolve(true);
        });
      });
    } catch (error) {
      logger.error('Backup restore error', error);
      throw error;
    }
  }

  async cleanOldBackups(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && stats.mtime < cutoffDate) {
          fs.rmSync(filePath, { recursive: true, force: true });
          deletedCount++;
          logger.info('Old backup deleted', { filePath });
        }
      }
      
      logger.info('Backup cleanup completed', { 
        deletedCount,
        daysToKeep 
      });
      
      return deletedCount;
    } catch (error) {
      logger.error('Backup cleanup error', error);
      throw error;
    }
  }

  async scheduleBackups() {
    // Create backup every 24 hours
    setInterval(async () => {
      try {
        await this.createBackup();
        await this.cleanOldBackups();
      } catch (error) {
        logger.error('Scheduled backup failed', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    logger.info('Backup scheduler started');
  }
}

module.exports = new BackupService();