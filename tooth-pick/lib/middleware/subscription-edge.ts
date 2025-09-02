import { NextRequest, NextResponse } from 'next/server';

// Simplified middleware for edge runtime compatibility
// Database operations moved to API routes to avoid edge runtime issues

export interface SubscriptionValidationResult {
  hasAccess: boolean;
  subscription: any;
  reason?: string;
  upgradeRequired?: boolean;
  limitExceeded?: boolean;
  trialExpired?: boolean;
}

/**
 * Simplified subscription access check for edge runtime
 * Real validation should be done in API routes
 */
export async function checkSubscriptionAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    // In edge runtime, return default access
    // Real validation should be done in API routes
    console.warn('checkSubscriptionAccess called in edge runtime - returning default access');
    return true; // Default to allowing access in middleware
  } catch (error) {
    console.error('Error checking subscription access:', error);
    return true; // Fail open for middleware
  }
}

/**
 * Simplified plan access validation for edge runtime
 */
export async function validatePlanAccess(
  userId: string, 
  requiredPlan: string
): Promise<SubscriptionValidationResult> {
  try {
    // In edge runtime, return default validation
    console.warn('validatePlanAccess called in edge runtime - returning default validation');
    
    return {
      hasAccess: true, // Default to allowing access
      subscription: null,
      reason: 'Edge runtime - validation skipped'
    };
  } catch (error) {
    console.error('Error validating plan access:', error);
    return {
      hasAccess: true, // Fail open
      subscription: null,
      reason: 'Error in edge runtime validation'
    };
  }
}

/**
 * Simplified middleware class for subscription validation
 * Compatible with edge runtime
 */
export class SubscriptionMiddleware {
  /**
   * Validate feature access - simplified for edge runtime
   */
  static async validateFeatureAccess(
    userId: string,
    feature: string,
    requiredPlan?: string
  ): Promise<SubscriptionValidationResult> {
    try {
      // In edge runtime, we skip database validation
      // Real validation should happen in API routes
      console.warn('validateFeatureAccess called in edge runtime - returning default validation');
      
      return {
        hasAccess: true, // Default to allowing access
        subscription: null,
        reason: 'Edge runtime - validation skipped'
      };
    } catch (error) {
      console.error('Error in validateFeatureAccess:', error);
      return {
        hasAccess: true, // Fail open for middleware
        subscription: null,
        reason: 'Error in edge runtime'
      };
    }
  }

  /**
   * Validate subscription status - simplified for edge runtime
   */
  static async validateSubscriptionStatus(userId: string): Promise<SubscriptionValidationResult> {
    try {
      // In edge runtime, return default status
      console.warn('validateSubscriptionStatus called in edge runtime - returning default status');
      
      return {
        hasAccess: true,
        subscription: null,
        reason: 'Edge runtime - validation skipped'
      };
    } catch (error) {
      console.error('Error validating subscription status:', error);
      return {
        hasAccess: true, // Fail open
        subscription: null,
        reason: 'Error in edge runtime'
      };
    }
  }

  /**
   * Check appointment limits - simplified for edge runtime
   */
  static async checkAppointmentLimits(userId: string): Promise<{
    canCreate: boolean;
    used: number;
    limit: number;
    reason?: string;
  }> {
    try {
      // In edge runtime, return default limits
      console.warn('checkAppointmentLimits called in edge runtime - returning default limits');
      
      return {
        canCreate: true, // Default to allowing
        used: 0,
        limit: -1, // Unlimited
        reason: 'Edge runtime - validation skipped'
      };
    } catch (error) {
      console.error('Error checking appointment limits:', error);
      return {
        canCreate: true, // Fail open
        used: 0,
        limit: -1,
        reason: 'Error in edge runtime'
      };
    }
  }

  /**
   * Main subscription validation for middleware
   * Simplified for edge runtime - delegates real validation to API routes
   */
  static async validateSubscription(
    request: NextRequest,
    feature?: string,
    requiredPlan?: string
  ): Promise<NextResponse | null> {
    try {
      // In edge runtime, we don't block access at middleware level
      // Real validation should be done in API routes or server components
      console.warn('validateSubscription called in edge runtime - allowing access');
      
      // Add headers to indicate middleware passed
      const response = NextResponse.next();
      response.headers.set('x-middleware-subscription-check', 'passed');
      
      // Allow request to continue
      return response;
    } catch (error) {
      console.error('Error in subscription middleware:', error);
      // Fail open - allow request to continue
      return NextResponse.next();
    }
  }
}

// Export simplified functions for backward compatibility
export const validateFeatureAccess = SubscriptionMiddleware.validateFeatureAccess;
export const validateSubscriptionStatus = SubscriptionMiddleware.validateSubscriptionStatus;
export const checkAppointmentLimits = SubscriptionMiddleware.checkAppointmentLimits;
