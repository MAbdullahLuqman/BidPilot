# Firebase Schema

Database: Cloud Firestore (Native mode). Storage: Firebase Storage. Auth: Firebase Authentication (Email/Password; Google optional).

All timestamps are Firestore `Timestamp` values unless noted.

## Top-level collections

### `users/{userId}`
The signed-in user account. `userId` is the Firebase Auth UID.

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required |
| `email` | string | Required, unique by Auth |
| `companyId` | string \| null | Set after onboarding |
| `role` | `'owner' \| 'member'` | Default `'owner'` |
| `createdAt` | Timestamp | Server-set |
| `updatedAt` | Timestamp | Server-set |

### `companies/{companyId}`
A tenant company.

| Field | Type | Notes |
|---|---|---|
| `ownerUserId` | string | UID of the creator |
| `companyName` | string | Required |
| `websiteUrl` | string | Required |
| `sector` | string | One of the seeded sector list |
| `city` | string | |
| `country` | string | Default `'Pakistan'` |
| `ntn` | string \| null | Optional NTN/registration |
| `size` | string \| null | e.g. `'1-10' \| '11-50' \| '51-200' \| '200+'` |
| `mainServices` | string[] | |
| `description` | string | Short company description |
| `contactPerson` | string | |
| `contactEmail` | string | |
| `phone` | string | |
| `onboardingComplete` | boolean | True once the form is submitted |
| `websiteAnalysisStatus` | `'pending' \| 'running' \| 'complete' \| 'failed'` | |
| `websiteAnalysisAt` | Timestamp \| null | |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

#### `companies/{companyId}/capabilities/{capabilityId}`
A single capability entry built from website scraping, uploads, or manual entry.

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `type` | `'past_project' \| 'certification' \| 'team_experience' \| 'technical_skill' \| 'industry_experience' \| 'client_proof' \| 'financial_strength' \| 'delivery_methodology' \| 'compliance_document'` | |
| `description` | string | |
| `sector` | string \| null | |
| `source` | `'website' \| 'document' \| 'manual'` | |
| `sourceUrl` | string \| null | |
| `evidenceText` | string | Raw text snippet supporting this capability |
| `tags` | string[] | |
| `relatedServices` | string[] | |
| `confidenceScore` | number | 0–1, AI-assigned |
| `proposalReadyText` | string | Polished paragraph usable in a proposal |
| `createdAt` | Timestamp | |

#### `companies/{companyId}/proposalSamples/{sampleId}`
An uploaded winning proposal used as a **style** reference (never copied verbatim).

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `fileUrl` | string \| null | Storage path; null if pasted |
| `extractedText` | string | Plain text |
| `structureJson` | object | Section headings + hierarchy |
| `styleAnalysis` | object | `{ tone, formality, sectionStyles: {...}, persuasiveLanguage: string[], complianceResponseStyle, executiveSummaryStyle, ... }` |
| `createdAt` | Timestamp | |

### `workspaces/{workspaceId}`
One workspace per RFP/RFQ/tender.

| Field | Type | Notes |
|---|---|---|
| `companyId` | string | |
| `ownerUserId` | string | |
| `title` | string | User-friendly title |
| `rfpTitle` | string \| null | Extracted from the document |
| `issuerName` | string \| null | |
| `sector` | string \| null | |
| `documentUrl` | string | Storage path of the original file |
| `documentMimeType` | string | |
| `extractedText` | string | Parsed text |
| `status` | `'created' \| 'parsing' \| 'analyzing' \| 'analyzed' \| 'matching' \| 'matched' \| 'generating' \| 'ready' \| 'failed'` | |
| `submissionDeadline` | Timestamp \| null | |
| `budget` | string \| null | |
| `complianceScore` | number \| null | 0–100 |
| `winProbability` | number \| null | 0–100 |
| `goNoGoDecision` | `'STRONG_GO' \| 'GO_WITH_CAUTION' \| 'NO_GO_UNLESS_FIXED' \| 'NO_GO'` \| null | |
| `analysisJson` | object \| null | The full RFP analysis blob |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

#### `workspaces/{workspaceId}/requirements/{requirementId}`
One row per extracted RFP requirement.

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `description` | string | |
| `category` | `'mandatory' \| 'technical' \| 'financial' \| 'eligibility' \| 'compliance' \| 'experience' \| 'team' \| 'other'` | |
| `mandatory` | boolean | |
| `sourceSection` | string \| null | |
| `sourcePage` | number \| null | |
| `evaluationWeight` | number \| null | 0–100 |
| `rawText` | string | Original snippet |
| `createdAt` | Timestamp | |

#### `workspaces/{workspaceId}/compliance/{checkId}`
One row per requirement after capability matching.

| Field | Type | Notes |
|---|---|---|
| `requirementId` | string | |
| `requirementText` | string | Denormalized for fast reads |
| `status` | `'PASS' \| 'PARTIAL' \| 'FAIL' \| 'UNKNOWN'` | |
| `matchedCapabilityIds` | string[] | |
| `evidenceSummary` | string | |
| `gapReason` | string \| null | |
| `suggestedAction` | string \| null | |
| `suggestedProposalLanguage` | string \| null | |
| `confidenceScore` | number | 0–1 |

#### `workspaces/{workspaceId}/proposalSections/{sectionId}`

| Field | Type | Notes |
|---|---|---|
| `title` | string | e.g. "Executive Summary" |
| `order` | number | |
| `content` | string | Markdown |
| `status` | `'draft' \| 'edited' \| 'approved'` | |
| `relatedRequirementIds` | string[] | |
| `matchedCapabilityIds` | string[] | |
| `confidenceScore` | number | |
| `userEdited` | boolean | |
| `updatedAt` | Timestamp | |

#### `workspaces/{workspaceId}/winScore/{scoreId}`
Latest is `latest`; history kept by timestamped IDs.

| Field | Type | Notes |
|---|---|---|
| `complianceFit` | number | 0–35 |
| `capabilityFit` | number | 0–25 |
| `similarExperience` | number | 0–15 |
| `documentReadiness` | number | 0–10 |
| `timelineFit` | number | 0–5 |
| `budgetFit` | number | 0–5 |
| `riskPenalty` | number | 0–5 (subtracted) |
| `finalScore` | number | 0–100 |
| `decision` | `'STRONG_GO' \| 'GO_WITH_CAUTION' \| 'NO_GO_UNLESS_FIXED' \| 'NO_GO'` | |
| `reasoning` | string | |
| `strengths` | string[] | |
| `risks` | string[] | |
| `nextActions` | string[] | |
| `createdAt` | Timestamp | |

## Storage layout

```
/companies/{companyId}/profile/{filename}        # company profile uploads
/companies/{companyId}/samples/{sampleId}/source # proposal sample source files
/rfp/{workspaceId}/source                        # uploaded RFP files
/rfp/{workspaceId}/exports/{filename}            # generated proposal exports
```

## Security rules (hackathon scope)

Strict per-user, per-company isolation. Sketch:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner(userId) { return signedIn() && request.auth.uid == userId; }
    function ownsCompany(companyId) {
      return signedIn() &&
        get(/databases/$(database)/documents/companies/$(companyId)).data.ownerUserId == request.auth.uid;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /companies/{companyId} {
      allow read, write: if ownsCompany(companyId);

      match /{subcollection}/{docId} {
        allow read, write: if ownsCompany(companyId);
      }
    }

    match /workspaces/{workspaceId} {
      allow read, write: if signedIn() &&
        resource.data.ownerUserId == request.auth.uid;
      allow create: if signedIn() &&
        request.resource.data.ownerUserId == request.auth.uid;

      match /{subcollection}/{docId} {
        allow read, write: if signedIn() &&
          get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerUserId == request.auth.uid;
      }
    }
  }
}
```

> For the hackathon demo, you can keep Firestore in **test mode** for the first few hours, then paste this ruleset before judging.

## Indexes

Likely needed (Firestore will prompt on first query):
- `workspaces` where `ownerUserId == X` order by `createdAt desc`
- `workspaces/{id}/requirements` where `mandatory == true` order by `evaluationWeight desc`
- `workspaces/{id}/compliance` where `status == 'FAIL'` order by `confidenceScore desc`
