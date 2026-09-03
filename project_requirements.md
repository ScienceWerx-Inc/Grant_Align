Grant Matcher System - Technical Requirements Document
Document Version: 1.0 (Prototype Specification)
Date: August 19, 2026
Meeting Participants: Patrick Haley, Bassem Kadry, Elin Ross
1. Executive Summary & System Objectives
The Grant Matcher System (official system name TBD) is a dual-sided platform designed to facilitate high-precision alignment between local non-profit grant seekers and regional grant givers/donors in Frederick County and surrounding areas. The primary objective is to evaluate non-profit operational realities against specific donor giving criteria, providing non-profits with clear guidance on application fit and helping donors discover well-matched local organizations.
2. Core Modules & Detailed Requirements
2.1 Shared CRM Infrastructure
Both Grant Seekers and Grant Givers utilize a foundational Customer Relationship Management (CRM) module to maintain organization profiles, contact information, and interaction histories.
Entity Records: Comprehensive organizational details, primary contacts, mailing addresses, and administrative notes.
Unified Data Repository: Centralized database linking seeker profiles, donor records, eligibility documentation, and match scores.
2.2 Grant Seeker Subsystem
The Grant Seeker module is designed to extract authentic, qualitative operational details beyond boilerplate mission statements.
Feature
Functional Requirement Description
 
Mission & Identity Repository
Captures standard corporate mission statements along with deep-dive qualitative profiles.
AI Conversational Interviewer
Interactive AI agent trained to interview grant seekers and extract specifics regarding:
• Who the non-profit really serves
• What the non-profit really does
• What the non-profit does NOT do
• Who the non-profit does NOT serve
Eligibility & Compliance Verification
Tracks mandatory administrative documentation required for grant eligibility, including IRS Form 990 filings and Good Standing status.
Automated 1-Pager Generator
Generates a standardized one-page summary compiling essential seeker data for instant download or copy-pasting directly onto organizational letterhead.

2.3 Grant Giver / Donor Subsystem
The Grant Giver module manages donor criteria, automated web research, and specialized donor point-of-contact intake.
Initial Prepopulated Local Seed Donors:
Ausherman Foundation
The Community Foundation
Serini Foundation
Delaplaine Foundation
William Cross
City of Frederick (Community Grants Program / CDBG)
Frederick County
Carroll Creek Rotary Club & Noon Rotary Club
Automated AI Web Scraper & Cron Task:
Scrapes information on donor giving preferences, non-eligible sectors, funding cycles, and application updates across local sites and national databases (Foundation Center Directory / Library search, Foundant, Candid / GuideStar).
Executes automatically via a scheduled background cron job (configurable execution interval).
Donor AI Interviewer: A dedicated AI interviewer tailored for donor points-of-contact to gather fine-grained giving criteria and nuanced preferences.

3. System Workflow Architecture
The diagram below illustrates the flow of data from intake and web scraping through to the core matching evaluation engine and outputs:
GRANT SEEKER SIDE
1. CRM & Profile Repository
• Organization Details & Contact Info

2. AI Seeker Interviewer
• Who/What they serve & do
• What/Who they DO NOT serve/do

3. Eligibility Tracking
• Form 990 & Good Standing Verification

↓ OUTPUT ↓
Standardized AI 1-Pager Output (For Letterhead)
➔
◄─►

GRANT GIVER / DONOR SIDE
1. Donor Repository & Criteria
• Local Seed List (Ausherman, Serini, etc.)

2. AI Scraper + Cron Job Automation
• Foundation Center, Foundant, GuideStar
• Scrapes cycles, preferences, exclusions

3. AI Donor Interviewer
• Point-of-Contact Intake Sessions

↓ UPDATES ↓
Live Donor Requirements Profile
MATCHING & EVALUATION ENGINE
Evaluates Non-Profit Qualitative Scope against Live Donor Criteria
Seeker Benefit: High Clarity on Grant Fit
Know exactly which grants to apply or skip
Donor Benefit: Target Discovery
Identify matching local non-profit applicants




4. External Integration Sources
The automated web scraper targets the following external research platforms to populate and update donor profiles:
Source Platform
Data Captured
Access Method
 
Foundation Center Directory / Guide
Donor funding histories, board members, giving focus areas
Library search / Direct database access
Foundant Technologies
Active grant application portals, requirements, deadlines
Web scraper / API integration
Candid / GuideStar
Form 990 tax documents, organizational financials, non-profit ratings
Automated scraper / Data feeds

5. Grants Expert Review Checklist (Next Steps)
This requirements document is prepared for review by the grant subject matter expert prior to technical architecture definition. Key verification points include:
AI Interviewer Question Prompts: Verify whether the prompt questions effectively capture all critical qualitative metrics needed to determine grant alignment.
One-Pager Output Requirements: Confirm that the generated 1-page document includes all standard fields required by local and regional grant-giving organizations.
Donor Seed Criteria: Review the initial list of local donor organizations to ensure proper coverage of Frederick County funding opportunities.
Compliance Indicators: Validate necessary eligibility documentation items (Form 990, Good Standing certificates) for inclusion in the intake system.
