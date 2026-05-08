export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  tags: string[];
  author?: string;
};

export type Tag = {
  name: string;
  count: number;
};

export const recentArticles: Article[] = [
  {
    id: '1',
    title: 'Academic Calendar 2026-2027',
    slug: 'academic-calendar',
    excerpt: 'Important dates regarding semester registration, mid-term, and end-term examinations.',
    date: '2026-05-08',
    tags: ['Academics', 'Important'],
  },
  {
    id: '2',
    title: 'Placement Season Guidelines',
    slug: 'placement-guidelines',
    excerpt: 'Rules and regulations for the upcoming semester placements. Includes resume verification steps.',
    date: '2026-05-07',
    tags: ['Placements', 'Careers'],
  },
  {
    id: '3',
    title: 'Hostel Allocation Policy',
    slug: 'hostel-allocation',
    excerpt: 'Detailed criteria for hostel room allocation for the next academic year.',
    date: '2026-05-05',
    tags: ['Campus Life', 'Housing'],
  },
  {
    id: '4',
    title: 'Library Timing & Borrowing Rules',
    slug: 'library-rules',
    excerpt: 'Updated rules for issuing books, digital access, and late return penalties.',
    date: '2026-05-01',
    tags: ['Academics', 'Facilities'],
  },
  {
    id: '5',
    title: 'Annual Sports Meet 2026',
    slug: 'sports-meet',
    excerpt: 'Schedule and registration details for the upcoming inter-hostel sports competition.',
    date: '2026-04-28',
    tags: ['Campus Life', 'Sports'],
  },
];

export const popularTags: Tag[] = [
  { name: 'Academics', count: 42 },
  { name: 'Campus Life', count: 28 },
  { name: 'Placements', count: 19 },
  { name: 'Important', count: 14 },
  { name: 'Housing', count: 11 },
  { name: 'Clubs', count: 8 },
  { name: 'Events', count: 7 },
  { name: 'Facilities', count: 5 },
];

export function mockMarkdownForSlug(slug: string) {
  // Let's generate some institute specific markdown based on the slug
  if (slug === 'academic-calendar') {
    return `
# Academic Calendar 2026-2027

Welcome to the new academic year. Please note the following critical dates for your semester planning.

## Semester Registration

Registration for all undergraduate and postgraduate students will commence via the ERP portal.
- **Start Date:** July 15, 2026
- **End Date:** July 20, 2026
- **Late Registration (with fine):** July 25, 2026

Ensure all prior dues are cleared before attempting to register.

## Examination Schedule

### Mid-Term Examinations

Mid-term exams will be conducted over a period of one week. No classes will be held during this time.
- **Dates:** September 20 - September 27, 2026

### End-Term Examinations

- **Practical Exams:** November 15 - November 22, 2026
- **Theory Exams:** November 25 - December 5, 2026

## Holidays

The institute will remain closed on all gazetted national holidays. A detailed list is available on the main website.
`;
  }
  
  if (slug === 'placement-guidelines') {
    return `
# Placement Season Guidelines

The Training and Placement Cell (TPC) welcomes all final year students to the 2026-2027 placement season.

## Eligibility Criteria

To be eligible to sit for campus placements, students must meet the following criteria:
1. Minimum CGPA of 6.0 (Some companies may have higher cut-offs).
2. No active academic backlogs.
3. Cleared all institute disciplinary checks.

## Resume Verification

Before the placement portal opens, all resumes must be verified.

### Faculty Advisor Approval

Your faculty advisor must digitally sign off on your academic projects and claimed CGPA. 

### Format Guidelines

- Maximum of 1 page.
- Do not include photographs.
- Use the standard institute template.

## Interview Etiquette

Students are expected to dress dynamically in formal attire. Arrive 15 minutes before your scheduled slot. 
`;
  }

  return `
# ${slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

This is placeholder content for ${slug}. This article will be updated soon.

## Overview

We are currently gathering the information for this section. Please check back later or contribute if you have the details!

### Contribution Details

You can click the "Edit" button to switch into Edit Mode to modify this article directly from GitHub.
  `;
}
