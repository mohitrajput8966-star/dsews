import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, AppError } from "../utils/errors";
import { writeAuditLog } from "../services/audit.service";

export const getCurrentOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: req.user!.orgId } });
  const settings = await prisma.orgSettings.findUnique({ where: { orgId: organization.id } });
  const numberOfLocations = await prisma.location.count({ where: { orgId: organization.id, isActive: true } });
  res.json({
    organization,
    settings: settings ? { ...settings, expiryWindowsDays: JSON.parse(settings.expiryWindowsDays) } : null,
    numberOfLocations,
  });
});

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  orgType: z.string().min(2).optional(),
  primaryContactName: z.string().min(2).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().optional(),
  currency: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  settings: z
    .object({
      serviceLevelZ: z.number().positive().optional(),
      criticalDaysThreshold: z.number().positive().optional(),
      reviewPeriodDays: z.number().positive().optional(),
      overstockCoverageMultiplier: z.number().positive().optional(),
      defaultLeadTimeDays: z.number().positive().optional(),
      minOrderQuantityDefault: z.number().nonnegative().optional(),
      abcACutoffPct: z.number().min(1).max(99).optional(),
      abcBCutoffPct: z.number().min(1).max(99).optional(),
      fsnFastMovingDays: z.number().positive().optional(),
      fsnNonMovingDays: z.number().positive().optional(),
      expiryWindowsDays: z.array(z.number().positive()).optional(),
    })
    .optional(),
});

/** ADMIN only (enforced by route middleware). Updates org profile fields and/or risk-engine policy thresholds. */
export const updateCurrentOrganization = asyncHandler(async (req: Request, res: Response) => {
  const input = updateOrgSchema.parse(req.body);
  const before = await prisma.organization.findUniqueOrThrow({ where: { id: req.user!.orgId } });

  const { settings, ...orgFields } = input;

  const organization = await prisma.organization.update({
    where: { id: req.user!.orgId },
    data: orgFields,
  });

  if (settings) {
    const { expiryWindowsDays, ...rest } = settings;
    await prisma.orgSettings.update({
      where: { orgId: req.user!.orgId },
      data: {
        ...rest,
        ...(expiryWindowsDays ? { expiryWindowsDays: JSON.stringify(expiryWindowsDays) } : {}),
      },
    });
  }

  await writeAuditLog({
    orgId: req.user!.orgId,
    userId: req.user!.id,
    action: "ORGANIZATION_SETTINGS_CHANGED",
    entityType: "Organization",
    entityId: organization.id,
    oldValue: before,
    newValue: { ...orgFields, settings },
  });

  res.json({ organization });
});

const onboardingSchema = z.object({
  locations: z
    .array(
      z.object({
        name: z.string().min(2),
        type: z.string().min(2),
        address: z.string().optional(),
        contactPerson: z.string().optional(),
      })
    )
    .min(1, "Add at least one location."),
  policy: z.object({
    defaultLeadTimeDays: z.number().positive(),
    serviceLevelZ: z.number().positive(),
    reviewPeriodDays: z.number().positive(),
    criticalDaysThreshold: z.number().positive(),
    overstockCoverageMultiplier: z.number().positive(),
  }),
});

/** ADMIN only. Final step of the onboarding wizard: creates locations, applies the inventory policy, and marks setup complete. */
export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: req.user!.orgId } });
  if (org.orgSetupComplete) {
    throw new AppError(400, "This organization has already completed setup.");
  }

  const input = onboardingSchema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    for (const loc of input.locations) {
      await tx.location.create({
        data: { orgId: org.id, name: loc.name, type: loc.type, address: loc.address, contactPerson: loc.contactPerson },
      });
    }
    await tx.orgSettings.update({
      where: { orgId: org.id },
      data: {
        defaultLeadTimeDays: input.policy.defaultLeadTimeDays,
        serviceLevelZ: input.policy.serviceLevelZ,
        reviewPeriodDays: input.policy.reviewPeriodDays,
        criticalDaysThreshold: input.policy.criticalDaysThreshold,
        overstockCoverageMultiplier: input.policy.overstockCoverageMultiplier,
      },
    });
    await tx.organization.update({ where: { id: org.id }, data: { orgSetupComplete: true } });
  });

  await writeAuditLog({
    orgId: org.id,
    userId: req.user!.id,
    action: "ORGANIZATION_ONBOARDING_COMPLETED",
    entityType: "Organization",
    entityId: org.id,
    newValue: input,
  });

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
  res.json({ organization });
});
