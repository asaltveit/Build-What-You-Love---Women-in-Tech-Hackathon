import { z } from 'zod';
import { insertPcosProfileSchema, insertDailyLogSchema, pcosProfiles, dailyLogs, groceryItems } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  pcos: {
    analyze: {
      method: 'POST' as const,
      path: '/api/pcos/analyze' as const,
      input: z.object({
        symptoms: z.array(z.string()),
        cycleRegularity: z.enum(['regular', 'irregular', 'absent']),
        weightConcerns: z.boolean(),
        hairGrowth: z.boolean(),
        acne: z.boolean(),
        fatigue: z.boolean(),
      }),
      responses: {
        200: z.object({
          detectedType: z.enum(['insulin_resistant', 'inflammatory', 'adrenal', 'post_pill', 'unknown']),
          confidence: z.number(),
          explanation: z.string(),
          recommendations: z.array(z.string()),
        }),
        500: errorSchemas.internal,
      },
    },
    getProfile: {
      method: 'GET' as const,
      path: '/api/pcos/profile' as const,
      responses: {
        200: z.custom<typeof pcosProfiles.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    updateProfile: {
      method: 'POST' as const,
      path: '/api/pcos/profile' as const,
      input: insertPcosProfileSchema,
      responses: {
        200: z.custom<typeof pcosProfiles.$inferSelect>(),
        401: errorSchemas.unauthorized,
        500: errorSchemas.internal,
      },
    },
  },
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/logs' as const,
      responses: {
        200: z.array(z.custom<typeof dailyLogs.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/logs' as const,
      input: insertDailyLogSchema,
      responses: {
        201: z.custom<typeof dailyLogs.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  recommendations: {
    get: {
      method: 'GET' as const,
      path: '/api/recommendations/today' as const,
      responses: {
        200: z.object({
          phase: z.enum(['menstrual', 'follicular', 'ovulatory', 'luteal']),
          nutrition: z.object({
            focus: z.string(),
            foodsToEat: z.array(z.string()),
            foodsToAvoid: z.array(z.string()),
          }),
          exercise: z.object({
            focus: z.string(),
            recommendedTypes: z.array(z.string()),
            intensity: z.enum(['low', 'medium', 'high']),
          }),
          lifestyle: z.string(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
  groceries: {
    search: {
      method: 'GET' as const,
      path: '/api/groceries/search' as const,
      input: z.object({
        query: z.string().optional(),
        location: z.string().optional(), // Zip or City
      }),
      responses: {
        200: z.array(z.object({
          id: z.number(),
          name: z.string(),
          category: z.string(),
          benefits: z.string().optional(),
          isRecommended: z.boolean(),
          store: z.string().optional(),
          distance: z.string().optional(),
          price: z.string().optional(),
        })),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
