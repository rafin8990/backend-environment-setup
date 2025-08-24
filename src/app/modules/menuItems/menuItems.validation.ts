import { z } from 'zod';

const createMenuItemZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Menu item title is required' }),
    url: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    parent_id: z.number().optional().nullable(),
    order: z.number().optional(),
  }),
});

const updateMenuItemZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    url: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    parent_id: z.number().optional().nullable(),
    order: z.number().optional(),
  }),
});

const reorderMenuItemsZodSchema = z.object({
  body: z.array(z.object({
    id: z.number({ required_error: 'Menu item ID is required' }),
    order: z.number({ required_error: 'Order is required' }),
  })),
});

const bulkCreateMenuItemsZodSchema = z.object({
  body: z.array(z.object({
    title: z.string({ required_error: 'Menu item title is required' }),
    url: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    parent_id: z.number().optional().nullable(),
    order: z.number().optional(),
  })),
});

export const getAllMenuItemsQuerySchema = z.object({
  searchTerm: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  icon: z.string().optional(),
  parent_id: z.string().optional(),
  order: z.string().optional(),
});

export const MenuItemValidation = {
  createMenuItemZodSchema,
  updateMenuItemZodSchema,
  reorderMenuItemsZodSchema,
  bulkCreateMenuItemsZodSchema,
};
