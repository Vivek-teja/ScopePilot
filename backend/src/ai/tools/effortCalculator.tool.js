/**
 * Effort and Schedule Calculation Tool
 *
 * Enforces Review 4 safeguard: "Any effort/schedule calculation must use an
 * agreed tool and stored data rather than an unsupported model guess."
 *
 * Provides transparent, deterministic formula-based estimation based on
 * project stored rates, scope item baselines, complexity heuristics, and testing margins.
 */

const { z } = require('zod');

const EffortCalculationInputSchema = z.object({
  reviewStatus: z.enum([
    'in_scope',
    'out_of_scope',
    'partially_out_of_scope',
    'needs_clarification',
    'uncertain',
  ]),
  outOfScopeItemsCount: z.number().int().nonnegative().default(0),
  affectedDeliverablesCount: z.number().int().nonnegative().default(0),
  complexityLevel: z.enum(['trivial', 'low', 'medium', 'high', 'architectural']).default('medium'),
  storedHourlyRate: z.number().positive().default(100),
  baseHoursOverride: z.number().positive().optional(),
});

const EffortCalculationResultSchema = z.object({
  estimatedHours: z.number().nullable(),
  hourlyRate: z.number().nullable(),
  estimatedCost: z.number().nullable(),
  scheduleImpactDays: z.number().nullable(),
  currency: z.string().default('USD'),
  calculationBasis: z.string(),
  isEligibleForBilling: z.boolean(),
  calculatedAt: z.string().datetime(),
});

/**
 * Base hours lookup matrix by complexity tier
 */
const COMPLEXITY_HOURS = {
  trivial: 4,
  low: 8,
  medium: 16,
  high: 32,
  architectural: 60,
};

class EffortCalculatorTool {
  /**
   * Deterministically calculate effort, budget impact, and schedule delta
   * @param {Object} input - EffortCalculationInput
   * @returns {Object} EffortCalculationResult
   */
  calculate(input, options = {}) {
    const validated = EffortCalculationInputSchema.parse(input);
    const hourlyRate = options.suppressBilling ? null : validated.storedHourlyRate;
    const now = new Date().toISOString();

    // 1. If in-scope: Zero marginal cost or delay
    if (validated.reviewStatus === 'in_scope') {
      return EffortCalculationResultSchema.parse({
        estimatedHours: 0,
        hourlyRate,
        estimatedCost: 0,
        scheduleImpactDays: 0,
        currency: 'USD',
        calculationBasis:
          'In-scope refinement covered by existing approved proposal budget. Zero incremental hours or billing billed.',
        isEligibleForBilling: false,
        calculatedAt: now,
      });
    }

    // 2. If ambiguous or uncertain: Strictly refuse to invent numbers
    if (
      validated.reviewStatus === 'needs_clarification' ||
      validated.reviewStatus === 'uncertain'
    ) {
      return EffortCalculationResultSchema.parse({
        estimatedHours: null,
        hourlyRate,
        estimatedCost: null,
        scheduleImpactDays: null,
        currency: 'USD',
        calculationBasis:
          'Estimation suppressed: Requirement is ambiguous or baseline evidence is insufficient. Technical discovery and client clarification required before drafting cost or schedule adjustments.',
        isEligibleForBilling: false,
        calculatedAt: now,
      });
    }

    // 3. For out-of-scope or partially-out-of-scope: Formula-based calculation
    const baseHours =
      validated.baseHoursOverride ||
      COMPLEXITY_HOURS[validated.complexityLevel] ||
      16;

    // Additional factor for multiple out-of-scope items and integration touches
    const itemMultiplier = Math.max(1, validated.outOfScopeItemsCount * 0.5 + 0.5);
    const rawHours = Math.round(baseHours * itemMultiplier);

    // Apply standard 15% QA and integration margin
    const totalHours = Math.round(rawHours * 1.15);
    const totalCost = hourlyRate === null ? null : totalHours * hourlyRate;
    // Assuming 6 productive development hours per working business day
    const scheduleDays = Math.ceil(totalHours / 6);

    const calculationBasis = hourlyRate === null
      ? `Estimated ${totalHours}h using the deterministic effort formula, but cost is suppressed because no trusted stored project hourly rate is available.`
      : `Calculated using formula: Base (${baseHours}h for ${validated.complexityLevel} complexity) ` +
        `* item multiplier (${itemMultiplier.toFixed(1)}) + 15% QA/integration margin = ${totalHours}h ` +
        `at stored project rate of $${hourlyRate}/hr = $${totalCost} (${scheduleDays} business days).`;

    return EffortCalculationResultSchema.parse({
      estimatedHours: totalHours,
      hourlyRate,
      estimatedCost: totalCost,
      scheduleImpactDays: scheduleDays,
      currency: 'USD',
      calculationBasis,
      isEligibleForBilling: hourlyRate !== null,
      calculatedAt: now,
    });
  }
}

const defaultEffortCalculator = new EffortCalculatorTool();

module.exports = {
  EffortCalculationInputSchema,
  EffortCalculationResultSchema,
  EffortCalculatorTool,
  defaultEffortCalculator,
};
