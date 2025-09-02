export { default as providerSteps, type OnboardingStepData } from './providerSteps';
export { default as distributorSteps } from './distributorSteps';
export { default as clinicSteps } from './clinicSteps';
export { default as adminSteps } from './adminSteps';

// Función para obtener pasos según el rol
export const getStepsByRole = (role: 'provider' | 'distributor' | 'clinic' | 'admin') => {
  switch (role) {
    case 'provider':
      return require('./providerSteps').default;
    case 'distributor':
      return require('./distributorSteps').default;
    case 'clinic':
      return require('./clinicSteps').default;
    case 'admin':
      return require('./adminSteps').default;
    default:
      return require('./providerSteps').default;
  }
};

// Estadísticas por rol
export const getRoleStatistics = () => {
  const providerSteps = require('./providerSteps').default;
  const distributorSteps = require('./distributorSteps').default;
  const clinicSteps = require('./clinicSteps').default;
  const adminSteps = require('./adminSteps').default;

  return {
    provider: {
      totalSteps: providerSteps.length,
      estimatedTime: providerSteps.reduce((total: number, step: any) => total + step.estimatedTime, 0),
      requiredSteps: providerSteps.filter((step: any) => !step.isOptional).length,
      optionalSteps: providerSteps.filter((step: any) => step.isOptional).length,
      categories: [...new Set(providerSteps.map((step: any) => step.category))]
    },
    distributor: {
      totalSteps: distributorSteps.length,
      estimatedTime: distributorSteps.reduce((total: number, step: any) => total + step.estimatedTime, 0),
      requiredSteps: distributorSteps.filter((step: any) => !step.isOptional).length,
      optionalSteps: distributorSteps.filter((step: any) => step.isOptional).length,
      categories: [...new Set(distributorSteps.map((step: any) => step.category))]
    },
    clinic: {
      totalSteps: clinicSteps.length,
      estimatedTime: clinicSteps.reduce((total: number, step: any) => total + step.estimatedTime, 0),
      requiredSteps: clinicSteps.filter((step: any) => !step.isOptional).length,
      optionalSteps: clinicSteps.filter((step: any) => step.isOptional).length,
      categories: [...new Set(clinicSteps.map((step: any) => step.category))]
    },
    admin: {
      totalSteps: adminSteps.length,
      estimatedTime: adminSteps.reduce((total: number, step: any) => total + step.estimatedTime, 0),
      requiredSteps: adminSteps.filter((step: any) => !step.isOptional).length,
      optionalSteps: adminSteps.filter((step: any) => step.isOptional).length,
      categories: [...new Set(adminSteps.map((step: any) => step.category))]
    }
  };
};
