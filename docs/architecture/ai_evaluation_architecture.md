# Task 7.2 — AI Evaluation Architecture

## 1. Preface
This document describes the AI Evaluation Architecture, outlining the frameworks, pipelines, and governance for continuous assessment of AI models used in StoryOS.

## 2. Executive Overview
StoryOS uses a hybrid evaluation approach: LLM-as-Judge for shadow-mode online evaluation, automated regression testing on golden datasets, and human-in-the-loop (Label Studio) for ground-truth alignment.

## 3. Enterprise Objectives
- Ensure high factual accuracy and Canon consistency.
- Prevent silent regressions in model behavior.
- Automate evaluation to unblock rapid model iteration.

## 4. Architecture Overview
```ascii
┌────────────────────────────────────────────────────────┐
│                 AI Evaluation Pipeline                 │
├────────────────────────────────────────────────────────┤
│ [Prod Traffic] ─(Shadow)─► [Critic Model (GPT-4)]      │
│                                │                       │
│ [Golden Datasets] ─────────► [Batch Evaluator]         │
│                                │                       │
│ [Label Studio] ◄──(Sample)─── [Evaluation DB]          │
└────────────────────────────────────────────────────────┘
```

## 5. Core Components
- **Shadow Router**: Duplicates 5% of traffic to the evaluation pipeline.
- **Critic Model**: Powerful LLM configured strictly to grade outputs.
- **Batch Evaluator**: Nightly script running CUSUM statistical checks.
- **Label Studio**: Human annotation interface.

## 6. Internal Architecture
```ascii
[Request] ──► [Target Model] ──► [Output] ──► [Critic Model] ──► [Score]
```

## 7. Data Flow
```ascii
User      TargetModel     CriticModel      LabelStudio    Dashboard
 │             │               │                │             │
 ├─ Prompt ───►│               │                │             │
 │◄─ Response ─┤               │                │             │
 │             ├─ ShadowAsync ─►                │             │
 │             │               ├─ Grade ───────►│             │
 │             │               │                ├─ Human ────►│
```

## 8. Runtime Lifecycle
```ascii
[Eval State]
(SAMPLED) ──► (AUTO_GRADED) ──► (QUEUED_FOR_HUMAN) ──► (VERIFIED)
```

## 9. Security Architecture
| Control | Implementation | Enforcement |
|---|---|---|
| Data Sanitization | PII redaction before Eval | Shadow Router |
| Tenant Isolation | Datasets strictly separated | Evaluation DB |

## 10. Scalability
Batch evaluator scales horizontally across Kubernetes workers to test thousands of prompts concurrently.

## 11. Reliability
Shadow routing is entirely asynchronous; evaluation failures do not impact production traffic.

## 12. Performance
| Metric | Offline Target | Online (Shadow) Target |
|---|---|---|
| Evaluation Run | < 1 hour | < 5 seconds |
| Model Regression | Detected < 24h | Detected < 1h |

## 13. Observability
| SLI | SLO | Alert Threshold | Escalation |
|---|---|---|---|
| Eval Pipeline Success | 99% | < 95% | AI Eng P2 |
| Model Regression | N/A | Score Drop > 2σ | AI Eng P1 |

**Prometheus Metrics:**
```promql
storyos_model_quality_score{model="llama-3"}
storyos_human_annotator_agreement
```

## 14. Failure Handling
- **Critic Model Rate Limited**: Queue in Kafka and process with backoff.

## 15. Testing Strategy
- **Chaos Testing**: Inject deliberately bad model outputs to verify alerting.
- **Security Testing**: Verify human annotators cannot see PII.

## 16. Governance Rules
- **EVAL-001**: No model deployed without passing baseline. (Rationale: Quality assurance. Enforcement: CI/CD gate).
- **EVAL-002**: Eval datasets must not contain production PII. (Rationale: Privacy. Enforcement: Redaction proxy).
- **EVAL-003**: Human evaluation requires >80% agreement. (Rationale: Consistency. Enforcement: Label Studio consensus metric).

## 17. Cross-Document Integration
| Component | Integration Point | Phase |
|---|---|---|
| AI Platform | Feeds quality scores to Model Router | Phase 4 |

## 18. Future Evolution
- Automated fine-tuning triggers based on evaluation failure patterns.

## 19. Executive Summary
The AI Evaluation Architecture provides rigorous, automated, and human-verified quality control, ensuring StoryOS AI features remain reliable, safe, and narratively consistent.

---
### Technical Artifacts

**SQL Schema:**
```sql
CREATE TABLE evaluation_results (
    eval_id UUID PRIMARY KEY,
    model_name VARCHAR(100),
    task_type VARCHAR(100),
    prompt_hash VARCHAR(64),
    critic_score FLOAT,
    human_score FLOAT,
    timestamp TIMESTAMP
);
```

**TypeScript Interfaces:**
```typescript
export interface EvaluationResult {
  evalId: string;
  modelName: string;
  taskType: string;
  criticScore: number;
  humanScore?: number;
  flags: string[];
}
```

**JSON Payload Example:**
```json
{
  "task": "NARRATIVE_CONTINUATION",
  "model": "vllm-mistral",
  "score": 0.85,
  "reasoning": "Output is consistent with canon but lacks descriptive depth."
}
```

**YAML Configuration:**
```yaml
evaluator:
  critic_model: gpt-4-turbo
  shadow_percentage: 5
  cusum_threshold: 2.0
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eval-worker
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: evaluator
        image: storyos/ai-eval:latest
```

**Audit Record JSON Example:**
```json
{
  "eventId": "evt_eval_1",
  "action": "MODEL_REGRESSION_DETECTED",
  "resourceType": "Model",
  "outcome": "ALERTED"
}
```

**Operational Playbook:**
1. CUSUM alert triggers.
2. Investigate specific task failures on dashboard.
3. If true regression, disable model in Router.

### Knowledge Density Checklist
- [x] 19-section structure
- [x] ASCII architecture diagram
- [x] ASCII sequence diagram
- [x] ASCII state machine
- [x] ASCII data flow diagram
- [x] SQL schema
- [x] TypeScript interfaces
- [x] JSON payload example
- [x] YAML configuration example
- [x] Kubernetes deployment snippet
- [x] Performance targets table
- [x] SLI/SLO table
- [x] Prometheus metrics
- [x] Security controls table
- [x] Audit record JSON example
- [x] Operational playbook
- [x] Chaos testing scenarios
- [x] Security testing scenarios
- [x] Governance rules
- [x] Cross-document integration table
- [x] Phase Progress section

### Phase Progress
Phase 7 (AI Evaluation) - COMPLETE.

Document End
