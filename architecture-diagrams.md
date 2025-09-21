# Architectural Flow Diagrams

This document contains comprehensive architectural flow diagrams for the AI-powered document search application.

## 1. Main System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (Next.js 15)"
        A[Landing Page] --> B[Auth Pages]
        B --> C[Dashboard]
        C --> D[Document Management]
        C --> E[Chat Interface]
        F[Components Layer] --> G[shadcn/ui + Tailwind]
        H[State Management] --> I[TanStack Query + tRPC]
    end

    subgraph "API Layer (tRPC)"
        J[Auth Router] --> K[Protected Procedures]
        L[Documents Router] --> K
        M[Chat Router] --> K
        N[Chat History Router] --> K
    end

    subgraph "Authentication (Better Auth)"
        O[Session Management] --> P[Email/Password]
        O --> Q[Google OAuth]
        O --> R[Email Verification]
    end

    subgraph "Database (PostgreSQL + Prisma)"
        S[User Tables] --> T[Auth Schema]
        U[Document Tables] --> V[Document Metadata]
        U --> W[Document Chunks + Vectors]
        X[Chat Tables] --> Y[Sessions & Messages]
    end

    subgraph "AWS Services"
        Z[S3 Bucket] --> AA[Document Storage]
        AB[Bedrock] --> AC[Text Embeddings]
        AB --> AD[LLM Generation]
        AB --> AE[Document Analysis]
    end

    subgraph "External Services"
        AF[Email Provider] --> AG[Verification & Reset]
        AH[Google OAuth] --> AI[Social Login]
    end

    %% Connections
    C --> J
    J --> O
    J --> S
    J --> Z
    J --> AB
    O --> AF
    O --> AH
    L --> Z
    M --> AB
    S --> T
    S --> V
    S --> Y

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef api fill:#f3e5f5
    classDef auth fill:#e8f5e8
    classDef database fill:#fff3e0
    classDef aws fill:#ffebee
    classDef external fill:#f1f8e9

    class A,B,C,D,E,F,G,H,I frontend
    class J,K,L,M,N api
    class O,P,Q,R auth
    class S,T,U,V,W,X,Y database
    class Z,AA,AB,AC,AD,AE aws
    class AF,AG,AH,AI external
```

## 2. Authentication Flow with Conditions

```mermaid
flowchart TD
    A[User Visits App] --> B{Authenticated?}

    B -->|No| C[Landing Page /]
    B -->|Yes| D{Email Verified?}

    C --> E[Click Login/Signup]
    E --> F{Choose Action}

    F -->|Login| G[/login Page]
    F -->|Signup| H[/signup Page]

    G --> I{Login Method}
    I -->|Email/Password| J[Email Login Form]
    I -->|Google| K[Google OAuth]

    J --> L{Valid Credentials?}
    L -->|No| M[Show Error Message]
    L -->|Yes| N{Email Verified?}

    K --> O{Google Auth Success?}
    O -->|No| P[OAuth Error]
    O -->|Yes| Q[Auto-verify Email]

    H --> R[Signup Form]
    R --> S{Form Valid?}
    S -->|No| T[Show Validation Errors]
    S -->|Yes| U[Create User Account]

    U --> V[Send Verification Email]
    V --> W[Show "Check Email" Message]

    W --> X[User Clicks Email Link]
    X --> Y[/verify-email Page]
    Y --> Z{Valid Token?}
    Z -->|No| AA[Show Error]
    Z -->|Yes| BB[Verify Email & Auto-login]

    N -->|No| CC[Redirect to Email Verification]
    N -->|Yes| DD[Create Session]
    Q --> DD
    BB --> DD

    DD --> EE[Redirect to /dashboard/chat]

    D -->|No| FF[Show "Please Verify Email"]
    D -->|Yes| GG[Access Dashboard]

    %% Password Reset Flow
    G --> HH[Forgot Password Link]
    HH --> II[/forgot-password Page]
    II --> JJ[Enter Email]
    JJ --> KK{User Exists?}
    KK -->|Yes| LL[Send Reset Email]
    KK -->|No| MM[Show "Email Sent" (Security)]

    LL --> NN[User Clicks Reset Link]
    NN --> OO[/reset-password Page]
    OO --> PP{Valid Token?}
    PP -->|Yes| QQ[New Password Form]
    PP -->|No| RR[Show Error]

    QQ --> SS[Update Password]
    SS --> TT[Redirect to Login]

    %% Session Management
    GG --> UU{Session Valid?}
    UU -->|No| VV[Redirect to Login]
    UU -->|Yes| WW[Access Protected Routes]

    %% Route Protection
    WW --> XX[Middleware Check]
    XX --> YY{Protected Route?}
    YY -->|Yes| ZZ{Session Valid?}
    YY -->|No| AAA[Allow Access]
    ZZ -->|Yes| BBB[Continue to Route]
    ZZ -->|No| CCC[Redirect to Login]

    %% Error Handling
    M --> G
    T --> H
    P --> G
    AA --> Y

    classDef success fill:#c8e6c9
    classDef error fill:#ffcdd2
    classDef decision fill:#fff3e0
    classDef process fill:#e1f5fe
    classDef external fill:#f3e5f5

    class DD,EE,GG,BBB,Q,BB success
    class M,P,T,AA,RR,VV,CCC error
    class B,D,F,I,L,O,S,Z,KK,PP,UU,YY,ZZ decision
    class U,V,X,Y,LL,SS,XX process
    class K,HH,II,NN,OO external
```

## 3. Document Processing Pipeline

```mermaid
flowchart TD
    A[User Drags File to Upload Zone] --> B{File Valid?}
    B -->|No| C[Show Validation Error]
    B -->|Yes| D[Frontend Validation Passed]

    D --> E{File Type Check}
    E -->|PDF| F[Accept PDF]
    E -->|TXT| G[Accept TXT]
    E -->|Other| H[Reject File Type]

    F --> I{File Size Check}
    G --> I
    I -->|> 100MB| J[Show Size Error]
    I -->|<= 100MB| K[Call getUploadUrl tRPC]

    K --> L[Server Creates Document Record]
    L --> M[Set Status: PENDING]
    M --> N[Generate S3 Presigned URL]
    N --> O[Return Upload URL to Frontend]

    O --> P[Frontend Uploads to S3]
    P --> Q{Upload Success?}
    Q -->|No| R[Show Upload Error]
    Q -->|Yes| S[Call processDocument tRPC]

    S --> T[Set Status: PROCESSING]
    T --> U[Download File from S3]
    U --> V{File Type?}

    V -->|PDF| W[Send to Bedrock Nova]
    V -->|TXT| X[Direct UTF-8 Conversion]

    W --> Y{OCR Success?}
    Y -->|No| Z[Set Status: FAILED]
    Y -->|Yes| AA[Extract Text & Structure]

    X --> BB[Parse Text Content]
    AA --> CC[Combine with BB for Processing]
    BB --> CC

    CC --> DD[Text Chunking Process]
    DD --> EE[Split into 800-token chunks]
    EE --> FF[Add 100-token overlap]
    FF --> GG[Create Chunk Records]

    GG --> HH[Batch Embedding Generation]
    HH --> II[Send Chunks to Bedrock Titan]
    II --> JJ{Embedding Success?}
    JJ -->|No| KK[Retry Logic]
    JJ -->|Yes| LL[Store 1024-dim Vectors]

    KK --> MM{Max Retries?}
    MM -->|Yes| NN[Set Status: FAILED]
    MM -->|No| II

    LL --> OO[Save to DocumentChunk Table]
    OO --> PP[Set Document Status: COMPLETED]

    %% Status Monitoring
    PP --> QQ[Frontend Polls getDocumentStatus]
    NN --> QQ
    Z --> QQ

    QQ --> RR{Status Check}
    RR -->|PENDING| SS[Show Processing Indicator]
    RR -->|PROCESSING| TT[Show Progress Bar]
    RR -->|COMPLETED| UU[Show Success + Enable Chat]
    RR -->|FAILED| VV[Show Error + Retry Option]

    VV --> WW[User Clicks Retry]
    WW --> S

    %% Error Recovery
    C --> XX[User Fixes File]
    H --> XX
    J --> XX
    R --> YY[User Retries Upload]
    XX --> A
    YY --> A

    %% Database Operations
    subgraph "Database Updates"
        L --> ZZ[(Document Table)]
        GG --> AAA[(DocumentChunk Table)]
        OO --> AAA
    end

    %% AWS Operations
    subgraph "AWS Services"
        N --> BBB[S3 Presigned URL]
        P --> CCC[S3 Storage]
        W --> DDD[Bedrock Nova]
        II --> EEE[Bedrock Titan Embeddings]
    end

    classDef success fill:#c8e6c9
    classDef error fill:#ffcdd2
    classDef processing fill:#fff3e0
    classDef decision fill:#e3f2fd
    classDef aws fill:#ffebee
    classDef database fill:#f3e5f5

    class PP,UU,LL success
    class C,H,J,R,Z,NN,VV error
    class T,U,DD,EE,FF,HH,SS,TT processing
    class B,E,I,Q,V,Y,JJ,MM,RR decision
    class BBB,CCC,DDD,EEE aws
    class ZZ,AAA database
```

## 4. RAG Query Flow

```mermaid
flowchart TD
    A[User Types Question in Chat] --> B[Submit Query]
    B --> C[Call chat.query tRPC Mutation]
    C --> D[Server Receives Query]

    D --> E{User Has Documents?}
    E -->|No| F[Return "No Documents" Message]
    E -->|Yes| G[Extract Keywords from Query]

    G --> H[Enhanced Keyword Search]
    H --> I[Search DocumentChunk Table]
    I --> J{Search Strategy}

    J -->|1| K[Exact Phrase Match]
    J -->|2| L[Individual Keyword Match]
    J -->|3| M[Title Match Bonus]

    K --> N[Score: High Weight]
    L --> O[Score: Medium Weight]
    M --> P[Score: Bonus Points]

    N --> Q[Combine All Scores]
    O --> Q
    P --> Q

    Q --> R[Apply Length Penalties]
    R --> S[Rank by Final Score]
    S --> T[Select Top 5 Chunks]

    T --> U{Relevant Chunks Found?}
    U -->|No| V[Return "No Relevant Info" Message]
    U -->|Yes| W[Format Context for LLM]

    W --> X[Build Structured Prompt]
    X --> Y[Include Source Attribution]
    Y --> Z[Send to Bedrock LLM]

    Z --> AA{LLM Response Success?}
    AA -->|No| BB[Handle LLM Error]
    AA -->|Yes| CC[Parse LLM Response]

    CC --> DD[Extract Answer Text]
    DD --> EE[Validate Source Citations]
    EE --> FF[Format Final Response]

    FF --> GG[Create ChatMessage Record]
    GG --> HH[Store User Question]
    HH --> II[Store Assistant Answer]
    II --> JJ[Store Source References]

    JJ --> KK[Return to Frontend]
    KK --> LL[Display Answer in Chat]
    LL --> MM[Show Source Cards]
    MM --> NN[Enable Source Navigation]

    %% Error Handling
    F --> OO[Show Empty State UI]
    V --> PP[Show "Ask Different Question"]
    BB --> QQ[Show "Try Again Later"]

    %% Source Display
    NN --> RR[User Clicks Source Card]
    RR --> SS[Highlight Document Section]
    SS --> TT[Show Full Context]

    %% Chat History
    KK --> UU{New Chat Session?}
    UU -->|Yes| VV[Create Session Record]
    UU -->|No| WW[Update Existing Session]

    VV --> XX[Generate Session Title]
    WW --> XX
    XX --> YY[Save to Database]

    %% Real-time Updates
    LL --> ZZ[Update Chat UI]
    ZZ --> AAA[Scroll to Bottom]
    AAA --> BBB[Focus Input Field]

    %% Scoring Algorithm Detail
    subgraph "Scoring Algorithm"
        CCC[Base Score = 0]
        DDD[Exact Phrase Match: +10]
        EEE[Keyword Frequency: +2 per match]
        FFF[Title Match: +5 bonus]
        GGG[Length Penalty: -0.1 per 100 chars]
        HHH[Final Score = Sum - Penalties]
    end

    %% Database Operations
    subgraph "Database Queries"
        I --> III[(LIKE queries on chunk_text)]
        GG --> JJJ[(ChatSession table)]
        HH --> KKK[(ChatMessage table)]
    end

    %% LLM Prompt Structure
    subgraph "LLM Prompt"
        LLL[System: You are a helpful assistant]
        MMM[Context: Top 5 relevant chunks]
        NNN[Question: User's original question]
        OOO[Instructions: Answer with sources]
    end

    classDef success fill:#c8e6c9
    classDef error fill:#ffcdd2
    classDef processing fill:#fff3e0
    classDef decision fill:#e3f2fd
    classDef llm fill:#f3e5f5
    classDef database fill:#e8f5e8

    class CC,DD,FF,LL,MM success
    class F,V,BB,OO,PP,QQ error
    class G,H,W,X,Y processing
    class E,J,U,AA,UU decision
    class Z,LLL,MMM,NNN,OOO llm
    class III,JJJ,KKK,GG,HH,II database
```

## 5. Complete User Journey Flow

```mermaid
flowchart TD
    A[User Visits Landing Page] --> B{First Time User?}

    B -->|Yes| C[Signup Process]
    B -->|No| D[Login Process]

    %% Signup Journey
    C --> E[Fill Registration Form]
    E --> F[Account Created]
    F --> G[Email Verification Required]
    G --> H[Check Email & Click Link]
    H --> I[Email Verified]
    I --> J[Auto-login to Dashboard]

    %% Login Journey
    D --> K{Remember Credentials?}
    K -->|Yes| L[Quick Login]
    K -->|No| M[Enter Credentials]
    M --> N{Forgot Password?}
    N -->|Yes| O[Password Reset Flow]
    N -->|No| P[Continue Login]

    L --> Q[Dashboard Access]
    P --> Q
    O --> R[Reset Complete]
    R --> P

    %% Dashboard First Experience
    J --> S[First Time Dashboard]
    Q --> T{Has Documents?}

    T -->|No| U[Empty State: Upload First Document]
    T -->|Yes| V[Existing User Dashboard]

    S --> W[Onboarding Flow]
    W --> X[Show Feature Tour]
    X --> Y[Suggest Document Upload]
    Y --> U

    %% Document Upload Journey
    U --> Z[Navigate to Documents Page]
    Z --> AA[Upload Document]
    AA --> BB[Document Processing]
    BB --> CC{Processing Success?}

    CC -->|No| DD[Show Error & Retry Options]
    CC -->|Yes| EE[Document Ready]

    DD --> FF[User Fixes Issues]
    FF --> AA

    %% First Chat Experience
    EE --> GG[Navigate to Chat]
    GG --> HH[New Chat Interface]
    HH --> II[Ask First Question]
    II --> JJ[Get AI Response with Sources]
    JJ --> KK[Review Source Citations]
    KK --> LL[Continue Conversation]

    %% Experienced User Flow
    V --> MM{User Intent}
    MM -->|Upload More| Z
    MM -->|Start Chat| NN[Existing Chat or New]
    MM -->|Review History| OO[Chat History]
    MM -->|Account Settings| PP[Account Management]

    NN --> QQ{Continue Existing?}
    QQ -->|Yes| RR[Load Chat History]
    QQ -->|No| SS[Start New Chat]

    RR --> TT[Resume Conversation]
    SS --> HH

    %% Ongoing Usage Patterns
    LL --> UU{Session Continue?}
    UU -->|Yes| VV[Ask Follow-up Questions]
    UU -->|No| WW[End Session]

    VV --> XX[Get More Responses]
    XX --> YY[Navigate Sources]
    YY --> ZZ[Deep Dive into Documents]
    ZZ --> VV

    %% Account Management
    PP --> AAA[Update Profile]
    AAA --> BBB[Change Password]
    BBB --> CCC[Manage Documents]
    CCC --> DDD[Return to Main Flow]

    %% Session Management
    WW --> EEE{Save Chat?}
    EEE -->|Yes| FFF[Chat Saved to History]
    EEE -->|No| GGG[Temporary Session]

    FFF --> HHH[Available in Chat List]
    GGG --> III[Session Expires]

    %% Error Recovery Paths
    subgraph "Error Handling"
        JJJ[Network Issues] --> KKK[Retry Mechanisms]
        LLL[AWS Service Errors] --> MMM[Graceful Degradation]
        NNN[Processing Failures] --> OOO[Alternative Flows]
        PPP[Authentication Issues] --> QQQ[Re-authentication]
    end

    %% Success Outcomes
    subgraph "Success States"
        RRR[Document Successfully Processed]
        SSS[Question Answered with Sources]
        TTT[Knowledge Base Built Up]
        UUU[Efficient Problem Solving]
    end

    %% Decision Points
    subgraph "Key Decision Points"
        VVV{Email Verified?}
        WWW{Document Processing Status?}
        XXX{Has Relevant Documents?}
        YYY{Chat Session Type?}
    end

    classDef start fill:#e8f5e8
    classDef success fill:#c8e6c9
    classDef error fill:#ffcdd2
    classDef decision fill:#e3f2fd
    classDef process fill:#fff3e0
    classDef endpoint fill:#f3e5f5

    class A start
    class J,Q,EE,JJ,FFF,RRR,SSS,TTT,UUU success
    class DD,JJJ,LLL,NNN,PPP error
    class B,K,N,T,CC,MM,QQ,UU,EEE,VVV,WWW,XXX,YYY decision
    class E,F,H,AA,BB,II,VV,XX process
    class WW,III,DDD endpoint
```

## 6. Data Flow Architecture

```mermaid
graph LR
    subgraph "User Interface Layer"
        A[React Components] --> B[TanStack Query]
        B --> C[tRPC Client]
    end

    subgraph "API Layer"
        C --> D[tRPC Router]
        D --> E[Auth Middleware]
        E --> F[Business Logic]
    end

    subgraph "Service Layer"
        F --> G[Document Service]
        F --> H[Chat Service]
        F --> I[Auth Service]
    end

    subgraph "Data Layer"
        G --> J[Prisma ORM]
        H --> J
        I --> J
        J --> K[PostgreSQL + pgvector]
    end

    subgraph "External Services"
        G --> L[AWS S3]
        H --> M[AWS Bedrock]
        G --> M
        I --> N[Email Service]
        I --> O[Google OAuth]
    end

    subgraph "Real-time Features"
        P[Status Polling] --> Q[Document Processing]
        R[Chat Updates] --> S[Message History]
        T[Error Handling] --> U[User Feedback]
    end

    %% Cross-cutting Concerns
    V[Security Layer] --> E
    W[Logging & Monitoring] --> F
    X[Error Boundaries] --> A
    Y[Type Safety] --> C
    Y --> D

    classDef ui fill:#e1f5fe
    classDef api fill:#f3e5f5
    classDef service fill:#e8f5e8
    classDef data fill:#fff3e0
    classDef external fill:#ffebee
    classDef realtime fill:#f9fbe7

    class A,B,C ui
    class D,E,F api
    class G,H,I service
    class J,K data
    class L,M,N,O external
    class P,Q,R,S,T,U realtime
```

## 7. Security & Error Handling Flow

```mermaid
flowchart TD
    A[Incoming Request] --> B{Route Protected?}
    B -->|No| C[Allow Access]
    B -->|Yes| D[Check Session Cookie]

    D --> E{Valid Session?}
    E -->|No| F[Redirect to Login]
    E -->|Yes| G[Check Email Verification]

    G --> H{Email Verified?}
    H -->|No| I[Show Verification Required]
    H -->|Yes| J[Check User Permissions]

    J --> K{User Owns Resource?}
    K -->|No| L[403 Forbidden]
    K -->|Yes| M[Process Request]

    M --> N{Input Valid?}
    N -->|No| O[400 Bad Request]
    N -->|Yes| P[Execute Business Logic]

    P --> Q{AWS Service Available?}
    Q -->|No| R[Service Unavailable]
    Q -->|Yes| S{Database Available?}

    S -->|No| T[Database Error]
    S -->|Yes| U[Process Successfully]

    %% Error Recovery
    R --> V[Retry Logic]
    T --> W[Fallback Options]
    V --> X{Max Retries?}
    X -->|No| Q
    X -->|Yes| Y[Graceful Degradation]

    W --> Z{Critical Operation?}
    Z -->|Yes| AA[Queue for Retry]
    Z -->|No| BB[Show Error Message]

    %% Success Path
    U --> CC[Log Success]
    CC --> DD[Return Response]

    %% Error Logging
    F --> EE[Log Unauthorized Access]
    L --> FF[Log Permission Denial]
    O --> GG[Log Validation Error]
    R --> HH[Log Service Error]
    T --> II[Log Database Error]

    classDef security fill:#ffebee
    classDef success fill:#c8e6c9
    classDef error fill:#ffcdd2
    classDef decision fill:#e3f2fd
    classDef process fill:#fff3e0

    class D,G,J,EE,FF,GG,HH,II security
    class C,U,CC,DD success
    class F,I,L,O,R,T,Y,BB error
    class B,E,H,K,N,Q,S,X,Z decision
    class M,P,V,W,AA process
```

---

These diagrams provide a comprehensive view of your application's architecture, showing all the major flows, decision points, and conditions. You can use these diagrams to:

1. **Understand the complete system architecture**
2. **Identify potential bottlenecks or failure points**
3. **Plan new features or modifications**
4. **Onboard new developers**
5. **Document the system for stakeholders**

Each diagram can be rendered using any Mermaid-compatible viewer, including GitHub, VS Code with the Mermaid extension, or online Mermaid editors.