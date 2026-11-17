/**
 * Server-side workspace entitlement resolver.
 *
 * This is deliberately a non-blocking foundation: no current core feature is
 * gated and no unapproved usage limits or prices are defined here.
 * Call from authenticated server code with a workspace loaded from the DB.
 */

const KNOWN_PLANS = new Set(["free", "free_trial", "pro", "team"]);

function normalizePlan(value) {
  const plan = String(value || "free").trim().toLowerCase();
  return KNOWN_PLANS.has(plan) ? plan : "free";
}

export function resolveWorkspaceEntitlements(workspace, now = new Date()) {
  if (!workspace?.id) {
    return {
      plan: "free",
      tier: "free",
      billingState: "unknown",
      isTrial: false,
      isPaid: false,
      canUseCoreFeatures: false,
      limits: null,
      gatesActive: false,
      features: {},
    };
  }

  const plan = normalizePlan(workspace.plan);
  const trialEnd = workspace.trial_ends_at ? new Date(workspace.trial_ends_at) : null;
  const trialExpired = plan === "free_trial" &&
    (!trialEnd || Number.isNaN(trialEnd.getTime()) || trialEnd <= now);
  const effectivePlan = trialExpired ? "free" : plan;
  const isTrial = effectivePlan === "free_trial";
  const isPaid = effectivePlan === "pro" || effectivePlan === "team";

  return {
    plan: effectivePlan,
    tier: effectivePlan,
    billingState: trialExpired ? "expired" : isTrial ? "trialing" : isPaid ? "paid" : "free",
    isTrial,
    isPaid,
    canUseCoreFeatures: true,
    // Limits stay unset until exact Free/Pro/Team limits are approved.
    limits: null,
    // Keep every existing core feature available during the launch foundation phase.
    gatesActive: false,
    features: {
      tasks: true,
      projects: true,
      notes: true,
      planning: true,
      existingCollaboration: true,
      existingInsights: true,
      existingExports: true,
      automation: false,
      ai: false,
      advancedIntegrations: false,
    },
  };
}

/**
 * Return a safe workspace view for authenticated server responses.
 * Do not use client-provided plan/workspace values as entitlement authority.
 */
export function withWorkspaceEntitlements(workspace) {
  if (!workspace) return null;
  return {
    ...workspace,
    entitlements: resolveWorkspaceEntitlements(workspace),
  };
}
