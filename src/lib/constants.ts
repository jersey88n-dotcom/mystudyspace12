export const STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "review_again", label: "Review Again" },
] as const;

export type Status = (typeof STATUSES)[number]["value"];

export function statusLabel(value: string): string {
  return STATUSES.find((s) => s.value === value)?.label ?? "Not Started";
}

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PROGRAMMING_LANGUAGES = ["C", "C++", "Python", "Java", "DSA"] as const;

export const DSA_TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Stacks",
  "Queues",
  "Trees",
  "Graphs",
  "Searching",
  "Sorting",
  "Recursion",
  "Dynamic Programming",
  "Greedy",
  "Hashing",
];

export const LANGUAGE_TOPICS = [
  "Basics",
  "Operators",
  "Loops",
  "Functions",
  "Pointers",
  "OOP",
  "Patterns",
  "File Handling",
  "Exception Handling",
  "Collections",
  "Memory Management",
  ...DSA_TOPICS,
];

export const APTITUDE_CATEGORIES = ["Aptitude", "Logical Reasoning", "HR Interview"] as const;

export const APTITUDE_TOPICS: Record<string, string[]> = {
  Aptitude: [
    "Number System",
    "Percentages",
    "Profit & Loss",
    "Ratio & Proportion",
    "Averages",
    "Time & Work",
    "Time, Speed & Distance",
    "Simple & Compound Interest",
    "Permutations & Combinations",
    "Probability",
  ],
  "Logical Reasoning": [
    "Series",
    "Coding-Decoding",
    "Blood Relations",
    "Direction Sense",
    "Seating Arrangement",
    "Syllogism",
    "Puzzles",
    "Data Sufficiency",
  ],
  "HR Interview": [
    "Introduction",
    "Strengths & Weaknesses",
    "Career Goals",
    "Behavioral",
    "Situational",
    "Company Fit",
    "Salary & Negotiation",
  ],
};

export const DOCUMENT_CATEGORIES = [
  "Notes",
  "Lecture Slides",
  "Assignments",
  "Books",
  "Question Papers",
  "Cheat Sheets",
  "General",
];

export const VIDEO_CATEGORIES = [
  "Programming",
  "DSA",
  "Aptitude",
  "Interview Prep",
  "Web Development",
  "General",
];

export type SectionKey = "documents" | "programming" | "aptitude" | "tutorials";

export const SECTION_META: Record<
  SectionKey,
  { label: string; to: "/documents" | "/programming" | "/aptitude" | "/videos" }
> = {
  documents: { label: "My Documents", to: "/documents" },
  programming: { label: "Programming & DSA", to: "/programming" },
  aptitude: { label: "Aptitude & HR", to: "/aptitude" },
  tutorials: { label: "Video Tutorials", to: "/videos" },
};
