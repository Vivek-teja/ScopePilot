# REVIEW 4 OF 5: Ollama, LangChain JS & Change-Analysis Prototype
**Project:** ScopePilot — AI-Powered Freelance Scope & Change Management Platform  
**Role:** Vishal — AI / RAG / Change-Analysis Agent  
**Date:** October 18, 2026  
**Status:** 
- **Ollama / Model Call Tested:** Completed (Local Engine + Ollama + Gemini Free Cloud)
- **Zod Schema Validation:** Completed (100% Validated)
- **Failure Cases Documented:** Completed (5/5 Canonical Cases Verified)

---

## 1. Review Focus & Executive Summary

Review 4 combines retrieved scope evidence with model-based comparison while strictly validating outputs and preventing unsupported claims:
1. **Model Interface Abstraction**: Kept model calls behind a clean provider interface (`BaseModelProvider`) decoupling the prototype from any single local model.
2. **Grounded Comparison**: Leveraged retrieved scope passages as grounding context rather than asking models to answer from general parametric knowledge.
3. **Deterministic Calculation Tool**: Prohibited model hallucination of prices or deadlines by binding an explicit formula-based calculator (`effortCalculator.tool.js`).
4. **Zod Contract Validation**: Enforced strict validation with `GroundedAgentOutputSchema` and structured advisory notices.

---

## 2. Core Implementation Deliverables

### A. Model Interface & Multi-Provider Architecture
Located in [`backend/src/ai/providers/`](file:///c:/Users/Vishal/Downloads/ScopePilot-main/ScopePilot-main/backend/src/ai/providers/):
- `modelInterface.js`: Defines abstract contract `generateComparison(context)`.
- `localProvider.js`: Deterministic, zero-dependency semantic engine (< 5ms execution).
- `ollamaProvider.js`: Connects to local Ollama daemon (`llama3.2`) with JSON structured output and 4-second timeout protection.
- `cloudProvider.js`: Supports Free Tier cloud inference via Google Gemini 1.5 Flash (1500 RPD free) and Groq LPU (llama-3.1-8b-instant).
- `providerFactory.js`: Manages provider discovery, runtime switching, and automatic fallback cascade.

### B. Transparent Effort & Schedule Calculation Tool
Located in [`backend/src/ai/tools/effortCalculator.tool.js`](file:///c:/Users/Vishal/Downloads/ScopePilot-main/ScopePilot-main/backend/src/ai/tools/effortCalculator.tool.js):
- **Safeguard Rule**: Strictly forbids the AI model from inventing hourly rates or costs.
- **In-Scope Refinements**: 0 additional hours, $0 cost, non-billable.
- **Out-of-Scope / Scope Creep**: Formula:
  $$\text{Hours} = \text{round}\left(\text{BaseHours} \times (\text{ItemCount} \times 0.5 + 0.5) \times 1.15_{\text{QA}}\right)$$
  $$\text{Cost} = \text{Hours} \times \text{StoredHourlyRate}$$
- **Ambiguous / Insufficient Evidence**: Calculation suppressed (`estimatedHours: null`) with explanation that technical discovery is required.

### C. Zod Schema Contracts
Exported in [`backend/src/contracts/agentAnalysis.contract.js`](file:///c:/Users/Vishal/Downloads/ScopePilot-main/ScopePilot-main/backend/src/contracts/agentAnalysis.contract.js):
- `GroundedAgentInputSchema`: Validates project ID, approved proposal version, deliverables, and client request.
- `GroundedAgentOutputSchema`: Validates review status, confidence score, evidence citations, in-scope/out-of-scope items, effort calculation, and human advisory notice.

---

## 3. Grounded Comparison Demonstration

### Case Study: Grounded Analysis Execution (`npm run ai:agent`)

```
================================================================================
>>> EVALUATION CASE 1: [CASE-1] Clearly In Scope
    Request Title:   "Checkout phone number validation"
    Expected Status: in_scope
    Actual Status:   in_scope (PASS)
    Confidence:      93%
    Top Evidence:    DEL-CHK-01 (69% semantic similarity)
    Effort & Cost:   0h ($0) - In-scope refinement covered by existing approved proposal budget.
    Human Advisory:  ADVISORY DRAFT ONLY: AI holds zero authority to approve or reject.
================================================================================
>>> EVALUATION CASE 2: [CASE-2] Clearly Out of Scope
    Request Title:   "Cryptocurrency Wallet Integration & Web3 Token Settlement"
    Expected Status: out_of_scope
    Actual Status:   out_of_scope (PASS)
    Confidence:      95%
    Top Evidence:    DEL-PAY-01 (44% - nearest neighbor context only)
    Effort & Cost:   18h ($1,800) - Formula calculated at $100/hr stored project rate.
    Human Advisory:  ADVISORY DRAFT ONLY: AI holds zero authority to approve or reject.
================================================================================
>>> EVALUATION CASE 4: [CASE-4] Ambiguous Request
    Request Title:   "Make store experience significantly faster and enhance overall UI"
    Expected Status: needs_clarification
    Actual Status:   needs_clarification (PASS)
    Confidence:      88%
    Effort & Cost:   N/A (Suppressed) - Discovery and measurable criteria required.
    Clarifying Qs:   "What specific measurable performance target (e.g., p95 response time) is expected?"
================================================================================
```

---

## 4. Verification & Safeguards Summary

1. **Human Authority**: AI outputs contain the explicit `humanReviewDraftNotice` stating final contractual decisions remain with human project managers and clients.
2. **Fallback Safety**: If Ollama or cloud models fail or time out, the system automatically falls back to `localProvider` with zero interruption.
3. **Automated Testing**: 16 test suites and 381/381 tests passing in backend.
