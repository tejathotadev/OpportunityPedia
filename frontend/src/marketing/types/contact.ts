import { z } from 'zod';

export const contactReasons = [
  'Product inquiry',
  'Partnership',
  'Data partnership',
  'Press',
  'Careers',
  'Other',
] as const;

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  email: z
    .string()
    .trim()
    .min(1, 'Work email is required')
    .email('Enter a valid work email address'),
  company: z.string().trim().min(1, 'Company is required').max(120),
  role: z.string().trim().max(120).optional().or(z.literal('')),
  reason: z.enum(contactReasons, { message: 'Select a reason for reaching out' }),
  message: z
    .string()
    .trim()
    .min(20, 'Please add at least 20 characters so we can route your message')
    .max(2000, 'Please keep the message under 2000 characters'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
