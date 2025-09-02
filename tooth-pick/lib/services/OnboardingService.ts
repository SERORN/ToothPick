import { connectToDatabase } from '@/lib/db';
import { getStepsByRole, getRoleStatistics } from '@/data/onboarding';
import type { OnboardingStepData } from '@/data/onboarding';

export interface OnboardingProgress {
  userId: string;
  userRole: 'provider' | 'distributor' | 'clinic' | 'admin';
  currentStep: string;
  completedSteps: string[];
  stepData: Record<string, any>;
  startedAt: Date;
  lastUpdatedAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
  totalSteps: number;
  estimatedTotalTime: number;
}

export interface OnboardingFlowResponse {
  flow: {
    userRole: 'provider' | 'distributor' | 'clinic' | 'admin';
    currentStep: string;
    completedSteps: string[];
    totalSteps: number;
    estimatedTotalTime: number;
    steps: OnboardingStepData[];
  };
  progress: {
    percentage: number;
    completedSteps: number;
    remainingSteps: number;
    timeSpent: number;
    estimatedTimeRemaining: number;
  };
  statistics: {
    totalUsers: number;
    averageCompletionTime: number;
    completionRate: number;
    commonDropOffPoints: string[];
  };
}

export class OnboardingService {
  
  /**
   * Obtiene el flujo de onboarding personalizado para un usuario
   */
  static async getOnboardingFlow(
    userId: string, 
    userRole?: 'provider' | 'distributor' | 'clinic' | 'admin'
  ): Promise<OnboardingFlowResponse> {
    try {
      const { db } = await connectToDatabase();
      
      // Buscar progreso existente
      let progress = await db.collection('onboarding_progress').findOne({ userId });
      
      // Si no existe progreso, detectar rol del usuario
      if (!progress && !userRole) {
        const user = await db.collection('users').findOne({ _id: userId });
        userRole = user?.role || 'provider';
      }
      
      const role = progress?.userRole || userRole || 'provider';
      const steps = getStepsByRole(role);
      
      // Si no existe progreso, crear uno nuevo
      if (!progress) {
        progress = await this.createInitialProgress(userId, role, steps);
      }
      
      // Actualizar estados de pasos según progreso
      const updatedSteps = steps.map((step: OnboardingStepData) => ({
        ...step,
        isCompleted: progress.completedSteps.includes(step.id)
      }));
      
      // Calcular estadísticas
      const statistics = await this.getOnboardingStatistics(role);
      
      // Calcular progreso
      const progressData = this.calculateProgress(progress, updatedSteps);
      
      return {
        flow: {
          userRole: role,
          currentStep: progress.currentStep,
          completedSteps: progress.completedSteps,
          totalSteps: updatedSteps.length,
          estimatedTotalTime: progress.estimatedTotalTime,
          steps: updatedSteps
        },
        progress: progressData,
        statistics
      };
      
    } catch (error) {
      console.error('Error getting onboarding flow:', error);
      throw new Error('Failed to get onboarding flow');
    }
  }
  
  /**
   * Marca un paso como completado
   */
  static async completeStep(
    userId: string, 
    stepId: string, 
    stepData?: any
  ): Promise<{ success: boolean; nextStep?: string }> {
    try {
      const { db } = await connectToDatabase();
      
      const progress = await db.collection('onboarding_progress').findOne({ userId });
      if (!progress) {
        throw new Error('Onboarding progress not found');
      }
      
      const steps = getStepsByRole(progress.userRole);
      const currentStepIndex = steps.findIndex((s: OnboardingStepData) => s.id === stepId);
      
      if (currentStepIndex === -1) {
        throw new Error('Step not found');
      }
      
      // Actualizar completedSteps si no existe ya
      const updatedCompletedSteps = [...progress.completedSteps];
      if (!updatedCompletedSteps.includes(stepId)) {
        updatedCompletedSteps.push(stepId);
      }
      
      // Determinar próximo paso
      let nextStep = progress.currentStep;
      if (currentStepIndex < steps.length - 1) {
        nextStep = steps[currentStepIndex + 1].id;
      }
      
      // Verificar si el onboarding está completo
      const isCompleted = updatedCompletedSteps.length === steps.length;
      
      // Actualizar progreso
      const updateData: any = {
        completedSteps: updatedCompletedSteps,
        currentStep: nextStep,
        lastUpdatedAt: new Date(),
        isCompleted,
        [`stepData.${stepId}`]: stepData || {}
      };
      
      if (isCompleted) {
        updateData.completedAt = new Date();
      }
      
      await db.collection('onboarding_progress').updateOne(
        { userId },
        { $set: updateData }
      );
      
      // Registrar evento de completación
      await this.logStepCompletion(userId, stepId, stepData);
      
      // Otorgar recompensas si las hay
      const step = steps[currentStepIndex];
      if (step.rewards) {
        await this.grantRewards(userId, step.rewards);
      }
      
      return {
        success: true,
        nextStep: isCompleted ? undefined : nextStep
      };
      
    } catch (error) {
      console.error('Error completing step:', error);
      throw new Error('Failed to complete step');
    }
  }
  
  /**
   * Actualiza el progreso sin completar un paso
   */
  static async updateProgress(
    userId: string, 
    updates: Partial<OnboardingProgress>
  ): Promise<{ success: boolean }> {
    try {
      const { db } = await connectToDatabase();
      
      await db.collection('onboarding_progress').updateOne(
        { userId },
        { 
          $set: {
            ...updates,
            lastUpdatedAt: new Date()
          }
        }
      );
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating progress:', error);
      throw new Error('Failed to update progress');
    }
  }
  
  /**
   * Reinicia el onboarding de un usuario
   */
  static async resetOnboarding(userId: string): Promise<{ success: boolean }> {
    try {
      const { db } = await connectToDatabase();
      
      const progress = await db.collection('onboarding_progress').findOne({ userId });
      if (!progress) {
        throw new Error('Onboarding progress not found');
      }
      
      const steps = getStepsByRole(progress.userRole);
      
      await db.collection('onboarding_progress').updateOne(
        { userId },
        {
          $set: {
            currentStep: steps[0].id,
            completedSteps: [],
            stepData: {},
            lastUpdatedAt: new Date(),
            isCompleted: false,
            completedAt: null
          }
        }
      );
      
      return { success: true };
      
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      throw new Error('Failed to reset onboarding');
    }
  }
  
  /**
   * Obtiene estadísticas de onboarding
   */
  static async getOnboardingStatistics(role: string): Promise<any> {
    try {
      const { db } = await connectToDatabase();
      
      const totalUsers = await db.collection('onboarding_progress').countDocuments({ userRole: role });
      const completedUsers = await db.collection('onboarding_progress').countDocuments({ 
        userRole: role, 
        isCompleted: true 
      });
      
      const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;
      
      // Calcular tiempo promedio de completación
      const completedProgresses = await db.collection('onboarding_progress').find({
        userRole: role,
        isCompleted: true,
        completedAt: { $exists: true }
      }).toArray();
      
      let averageCompletionTime = 0;
      if (completedProgresses.length > 0) {
        const totalTime = completedProgresses.reduce((sum: number, progress: any) => {
          const timeDiff = progress.completedAt.getTime() - progress.startedAt.getTime();
          return sum + (timeDiff / (1000 * 60)); // en minutos
        }, 0);
        averageCompletionTime = totalTime / completedProgresses.length;
      }
      
      // Encontrar puntos de abandono comunes
      const dropOffPoints = await this.findCommonDropOffPoints(role);
      
      return {
        totalUsers,
        averageCompletionTime: Math.round(averageCompletionTime),
        completionRate: Math.round(completionRate),
        commonDropOffPoints: dropOffPoints
      };
      
    } catch (error) {
      console.error('Error getting onboarding statistics:', error);
      return {
        totalUsers: 0,
        averageCompletionTime: 0,
        completionRate: 0,
        commonDropOffPoints: []
      };
    }
  }
  
  // Métodos privados
  
  private static async createInitialProgress(
    userId: string, 
    role: 'provider' | 'distributor' | 'clinic' | 'admin', 
    steps: OnboardingStepData[]
  ): Promise<OnboardingProgress> {
    const { db } = await connectToDatabase();
    
    const estimatedTotalTime = steps.reduce((total, step) => total + step.estimatedTime, 0);
    
    const progress: OnboardingProgress = {
      userId,
      userRole: role,
      currentStep: steps[0].id,
      completedSteps: [],
      stepData: {},
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      isCompleted: false,
      totalSteps: steps.length,
      estimatedTotalTime
    };
    
    await db.collection('onboarding_progress').insertOne(progress);
    
    return progress;
  }
  
  private static calculateProgress(progress: OnboardingProgress, steps: OnboardingStepData[]) {
    const completedSteps = progress.completedSteps.length;
    const totalSteps = steps.length;
    const percentage = Math.round((completedSteps / totalSteps) * 100);
    
    const timeSpent = Date.now() - progress.startedAt.getTime();
    const timeSpentMinutes = Math.round(timeSpent / (1000 * 60));
    
    const remainingSteps = steps.filter(step => !progress.completedSteps.includes(step.id));
    const estimatedTimeRemaining = remainingSteps.reduce((total, step) => total + step.estimatedTime, 0);
    
    return {
      percentage,
      completedSteps,
      remainingSteps: remainingSteps.length,
      timeSpent: timeSpentMinutes,
      estimatedTimeRemaining
    };
  }
  
  private static async logStepCompletion(userId: string, stepId: string, stepData?: any): Promise<void> {
    try {
      const { db } = await connectToDatabase();
      
      await db.collection('onboarding_events').insertOne({
        userId,
        stepId,
        eventType: 'step_completed',
        stepData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging step completion:', error);
    }
  }
  
  private static async grantRewards(userId: string, rewards: { points: number; badge?: string }): Promise<void> {
    try {
      const { db } = await connectToDatabase();
      
      // Otorgar puntos
      if (rewards.points > 0) {
        await db.collection('user_loyalty').updateOne(
          { userId },
          { 
            $inc: { totalPoints: rewards.points },
            $push: { 
              pointsHistory: {
                amount: rewards.points,
                source: 'onboarding',
                date: new Date()
              }
            }
          },
          { upsert: true }
        );
      }
      
      // Otorgar badge
      if (rewards.badge) {
        await db.collection('user_badges').updateOne(
          { userId },
          { 
            $addToSet: { 
              badges: {
                id: rewards.badge,
                earnedAt: new Date(),
                source: 'onboarding'
              }
            }
          },
          { upsert: true }
        );
      }
      
    } catch (error) {
      console.error('Error granting rewards:', error);
    }
  }
  
  private static async findCommonDropOffPoints(role: string): Promise<string[]> {
    try {
      const { db } = await connectToDatabase();
      
      // Agregar lógica para encontrar puntos de abandono comunes
      const pipeline = [
        { $match: { userRole: role, isCompleted: false } },
        { $group: { _id: '$currentStep', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ];
      
      const dropOffPoints = await db.collection('onboarding_progress').aggregate(pipeline).toArray();
      
      return dropOffPoints.map((point: any) => point._id);
      
    } catch (error) {
      console.error('Error finding drop off points:', error);
      return [];
    }
  }
}

export default OnboardingService;
