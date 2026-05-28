import { z } from "zod";

const stringMapSchema = z.record(z.string(), z.string());

export const packageJsonSchema = z
  .object({
    name: z.string().optional(),
    dependencies: stringMapSchema.optional(),
    devDependencies: stringMapSchema.optional(),
    optionalDependencies: stringMapSchema.optional(),
    peerDependencies: stringMapSchema.optional(),
    scripts: stringMapSchema.optional(),
    bin: z.union([z.string(), stringMapSchema]).optional()
  })
  .passthrough();

export type PackageJsonInput = z.infer<typeof packageJsonSchema>;
