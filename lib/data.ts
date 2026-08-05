import type { CareerProfile, Consultant, Opportunity, Sector, Student } from './types';

export const consultants: Consultant[] = [
  {
    id: '1',
    name: 'Taiwo Adeyemi',
    initials: 'TA',
    role: 'Senior Product Manager',
    company: 'Google',
    sector: 'Technology',
    experience: 8,
    focus: ['Product strategy', 'Career switching'],
    tags: ['Product Strategy', 'Career Growth', 'UX', 'Tech Leadership'],
    bio: 'I help early-career professionals in Africa navigate the path from student to product leader. I have spent 8 years building products used by millions across emerging markets.',
    sessions: 47,
    rating: 4.9,
    nextSlot: null,
    helpWith: [
      'Breaking into product management',
      'Career transitions into tech',
      'Building your first product portfolio',
      'Negotiating your first tech role',
    ],
  },
  {
    id: '2',
    name: 'Nkechi Okafor',
    initials: 'NO',
    role: 'Investment Analyst',
    company: 'Standard Bank',
    sector: 'Finance',
    experience: 6,
    focus: ['Valuation', 'Graduate schemes'],
    tags: ['Financial Modeling', 'Investment Analysis', 'Banking', 'Graduate Programs'],
    bio: 'Former Big 4 auditor turned investment analyst. I know what African financial institutions actually look for in graduates — and it is rarely what universities teach.',
    sessions: 31,
    rating: 4.8,
    nextSlot: null,
    helpWith: [
      'Breaking into investment banking in Africa',
      'Graduate programme applications',
      'Financial modeling fundamentals',
      'Big 4 vs boutique finance career paths',
    ],
  },
  {
    id: '3',
    name: 'Chidi Eze',
    initials: 'CE',
    role: 'Software Engineer',
    company: 'Paystack',
    sector: 'Technology',
    experience: 5,
    focus: ['Backend', 'First job'],
    tags: ['Backend Engineering', 'System Design', 'Career Transition', 'Fintech'],
    bio: "I transitioned from a non-CS background into software engineering at one of Africa's most respected fintechs. I help students skip the mistakes I made.",
    sessions: 28,
    rating: 4.9,
    nextSlot: 'in 2 weeks',
    helpWith: [
      'Self-taught to professional engineer path',
      'Cracking software engineering interviews',
      'Understanding fintech engineering',
      'Building your first technical portfolio',
    ],
  },
  {
    id: '4',
    name: 'Amara Diallo',
    initials: 'AD',
    role: 'Marketing Director',
    company: 'MTN',
    sector: 'Entrepreneurship',
    experience: 10,
    focus: ['Go-to-market', 'Brand'],
    tags: ['Brand Strategy', 'Digital Marketing', 'Leadership', 'Telecoms'],
    bio: 'A decade building brands across West Africa. I believe African students are severely underestimated — and I am here to help change that one conversation at a time.',
    sessions: 52,
    rating: 5.0,
    nextSlot: null,
    helpWith: [
      'Building a career in African marketing',
      'Personal brand development for students',
      'Moving from marketing theory to practice',
      'Leadership in corporate Africa',
    ],
  },
  {
    id: '5',
    name: 'Fatima Al-Hassan',
    initials: 'FA',
    role: 'Senior Consultant',
    company: 'PwC Africa',
    sector: 'Finance',
    experience: 7,
    focus: ['Audit', 'Interviews'],
    tags: ['Audit', 'Tax Advisory', 'Big 4', 'Graduate Programs'],
    bio: 'PwC graduate scheme alumna turned Senior Consultant. I have interviewed hundreds of candidates and I know exactly what Big 4 firms in Africa are looking for.',
    sessions: 39,
    rating: 4.7,
    nextSlot: null,
    helpWith: [
      'Big 4 graduate programme applications',
      'Audit and advisory career paths',
      'Professional certifications to pursue',
      'Work-life balance in consulting',
    ],
  },
  {
    id: '6',
    name: 'Zainab Mensah',
    initials: 'ZM',
    role: 'Creative Director',
    company: 'Freelance',
    sector: 'Creative',
    experience: 8,
    focus: ['Art direction', 'Portfolio review'],
    tags: ['Art Direction', 'Brand Identity', 'Portfolio Review', 'Freelancing'],
    bio: 'Eight years art-directing for African brands and studios. Most students show me pretty screens — I teach them to show the thinking behind the screens instead.',
    sessions: 36,
    rating: 4.9,
    nextSlot: 'in 10 days',
    helpWith: [
      'Building a portfolio that gets callbacks',
      'Breaking into art direction and design',
      'Pricing and running freelance work',
      'Developing a personal visual voice',
    ],
  },
  {
    id: '7',
    name: 'Tunde Bakare',
    initials: 'TB',
    role: 'Co-Founder & CEO',
    company: 'GreenHarvest',
    sector: 'Entrepreneurship',
    experience: 9,
    focus: ['Fundraising', 'Product-market fit'],
    tags: ['Entrepreneurship', 'Fundraising', 'Product-Market Fit', 'AgriTech'],
    bio: 'Raised $2M for my AgriTech startup straight out of university. I was completely lost at graduation — now I help students avoid the years I wasted figuring things out alone.',
    sessions: 44,
    rating: 4.9,
    nextSlot: null,
    helpWith: [
      'Starting a company as a student',
      'Fundraising fundamentals in Africa',
      'Finding product-market fit',
      'Pitching to African and global investors',
    ],
  },
  {
    id: '8',
    name: 'David Okoro',
    initials: 'DO',
    role: 'Filmmaker & Content Lead',
    company: 'Freelance',
    sector: 'Creative',
    experience: 6,
    focus: ['Storytelling', 'Getting your first brief'],
    tags: ['Film & Video', 'Content Strategy', 'Storytelling', 'Client Work'],
    bio: 'I make films and lead content for African brands. The craft is learnable; the part nobody teaches you is how to find clients and price the work. That is where I help.',
    sessions: 22,
    rating: 4.8,
    nextSlot: null,
    helpWith: [
      'Landing your first paid creative brief',
      'Building a reel that stands out',
      'Working with brands and agencies',
      'Turning a creative hobby into income',
    ],
  },
];

export const opportunities: Opportunity[] = [
  {
    id: '1',
    title: 'Google Africa Developer Scholarship',
    organisation: 'Google',
    type: 'Fellowship',
    sector: 'Technology',
    deadline: '14 Sep',
    urgent: false,
    description: 'Fully funded scholarship for African developers covering cloud, mobile, and web technologies.',
    url: '#',
  },
  {
    id: '2',
    title: 'AWS Build On Africa',
    organisation: 'Amazon Web Services',
    type: 'Hackathon',
    sector: 'Technology',
    deadline: '2 Sep',
    urgent: true,
    description: 'Build solutions for African challenges using AWS infrastructure. $50,000 prize pool.',
    url: '#',
  },
  {
    id: '3',
    title: 'Notion Campus Leader',
    organisation: 'Notion',
    type: 'Campus program',
    sector: 'Technology',
    deadline: 'Rolling',
    urgent: false,
    description: 'Represent Notion on your campus. Get exclusive perks, community access, and real product experience.',
    url: '#',
  },
  {
    id: '4',
    title: 'Standard Bank Graduate Programme',
    organisation: 'Standard Bank',
    type: 'Internship',
    sector: 'Finance',
    deadline: '30 Sep',
    urgent: false,
    description: 'Two-year rotational graduate programme across corporate and investment banking divisions.',
    url: '#',
  },
  {
    id: '5',
    title: 'Tony Elumelu Foundation Entrepreneurship Programme',
    organisation: 'TEF',
    type: 'Fellowship',
    sector: 'Entrepreneurship',
    deadline: '21 Sep',
    urgent: false,
    description: '$5,000 seed capital, training, and mentorship for African entrepreneurs.',
    url: '#',
  },
  {
    id: '6',
    title: 'Moniepoint Campus Ambassador',
    organisation: 'Moniepoint',
    type: 'Campus program',
    sector: 'Finance',
    deadline: 'Rolling',
    urgent: false,
    description: "Be the face of Nigeria's most valuable fintech on your campus. Stipend + experience included.",
    url: '#',
  },
];

export const currentStudent: Student = {
  name: 'Emeka Okonkwo',
  initials: 'EO',
  university: 'University of Lagos',
  field: 'Computer Science',
  year: 3,
  careerMatch: 'Product Design',
  matchedSector: 'Creative',
  sessionsBooked: 3,
  consultantsExplored: 14,
  opportunitiesSaved: 6,
  pathYear: 1,
  pathYears: 3,
  milestonesDone: 4,
  milestonesTotal: 7,
  upcomingSession: {
    consultant: consultants[0],
    topic: 'Product career review',
    when: 'Today, 4:00 PM WAT',
    duration: '45 minutes',
    format: 'Video call',
    notes: [
      'Build two case studies before applying — process matters more than visuals.',
      'Look at associate PM tracks at Paystack and Flutterwave for Year 2.',
      'Follow up with a portfolio link in two weeks.',
    ],
  },
};

export function getConsultant(id: string): Consultant | undefined {
  return consultants.find((c) => c.id === id);
}

export function consultantsBySector(sector: Sector): Consultant[] {
  return consultants.filter((c) => c.sector === sector);
}

/**
 * Consultants for a sector, topped up from other sectors so callers that need a
 * fixed count (the discovery bridge, dashboard recommendations) always get one.
 */
export function featuredForSector(sector: Sector, count: number): Consultant[] {
  const inSector = consultantsBySector(sector);
  const rest = consultants.filter((c) => c.sector !== sector);
  return [...inSector, ...rest].slice(0, count);
}

/**
 * Discovery result profiles, keyed by the "environment" answer (step 3).
 * The results page composes the personalised "why" copy from the student's
 * actual answers around each profile's base text.
 */
export const careerProfiles: CareerProfile[] = [
  {
    primary: {
      title: 'Data Science & Analytics',
      sector: 'Technology',
      description: 'Turn raw data into decisions that move organisations.',
      skills: ['SQL', 'Python', 'Statistics', 'Data Storytelling', 'Excel'],
      why: 'You gravitate toward evidence over opinion, and you enjoy the moment a messy problem resolves into a clear answer. Data work rewards exactly that instinct — and it compounds with every industry you touch.',
      africanMarket: 'African banks, telcos, and startups are hiring analysts faster than universities can produce them.',
      roadmap: [
        {
          period: 'Year 1',
          focus: 'Build the foundations',
          actions: [
            'Learn SQL and spreadsheet modelling until they feel effortless',
            'Complete two analysis projects using real African datasets',
            'Book sessions with data practitioners on Pathora to pressure-test your direction',
          ],
        },
        {
          period: 'Year 2',
          focus: 'Prove it in public',
          actions: [
            'Publish your analyses — a portfolio beats a certificate',
            'Intern or freelance with a local company that has real data problems',
            'Add Python and one visualisation tool to your stack',
          ],
        },
        {
          period: 'Year 3+',
          focus: 'Specialise and level up',
          actions: [
            'Pick a domain — fintech, health, agriculture — and go deep',
            'Target graduate analyst roles at banks, telcos, and scale-ups',
            'Mentor someone a year behind you; teaching sharpens mastery',
          ],
        },
      ],
    },
    secondary: [
      {
        title: 'Software Engineering',
        sector: 'Technology',
        description: 'Build the systems behind the products millions use. Your logic-first mindset transfers directly to writing and debugging code.',
        skills: ['Programming', 'Problem Solving', 'System Design'],
      },
      {
        title: 'Investment Analysis',
        sector: 'Finance',
        description: 'Apply the same analytical rigour to markets and companies. Finance rewards people who can find the signal in the noise.',
        skills: ['Financial Modeling', 'Valuation', 'Research'],
      },
    ],
  },
  {
    primary: {
      title: 'Product Design',
      sector: 'Creative',
      description: 'Shape how products look, feel, and work for real people.',
      skills: ['UX Research', 'Prototyping', 'Visual Design', 'Figma', 'User Empathy'],
      why: 'You care about what people actually use, not just what is technically impressive. Product design sits exactly at that intersection — craft in service of real human problems.',
      africanMarket: 'African startups are competing globally on product quality, and strong designers are their scarcest hire.',
      roadmap: [
        {
          period: 'Year 1',
          focus: 'Learn by making',
          actions: [
            'Master Figma and the fundamentals of visual hierarchy',
            'Redesign three products you use daily and document your reasoning',
            'Book a session with a product professional on Pathora for portfolio feedback',
          ],
        },
        {
          period: 'Year 2',
          focus: 'Design for real users',
          actions: [
            'Take on design work for a student club, NGO, or small business',
            'Learn user research — interviews, usability tests, synthesis',
            'Build a portfolio of case studies, not just screenshots',
          ],
        },
        {
          period: 'Year 3+',
          focus: 'Go professional',
          actions: [
            'Target internships at African startups shipping real products',
            'Develop a specialty — mobile, design systems, or research',
            'Contribute to the design community; visibility creates opportunity',
          ],
        },
      ],
    },
    secondary: [
      {
        title: 'Product Management',
        sector: 'Technology',
        description: 'Own what gets built and why. Your builder instinct plus people skills is the classic PM profile.',
        skills: ['Product Strategy', 'Prioritisation', 'Communication'],
      },
      {
        title: 'Software Engineering',
        sector: 'Technology',
        description: 'If you love making things work, not just look right, engineering gives you the deepest building power of all.',
        skills: ['Programming', 'Shipping', 'System Thinking'],
      },
    ],
  },
  {
    primary: {
      title: 'Investment Analysis',
      sector: 'Finance',
      description: 'Understand where money flows and why — then act on it.',
      skills: ['Financial Modeling', 'Valuation', 'Excel', 'Market Research', 'Communication'],
      why: 'You are drawn to how markets, incentives, and money actually work — and finance careers reward people who understand systems, not just formulas. That curiosity is the real differentiator in African capital markets.',
      africanMarket: 'Capital is moving into African infrastructure, energy, and fintech — and firms need analysts who understand the continent.',
      roadmap: [
        {
          period: 'Year 1',
          focus: 'Master the language of finance',
          actions: [
            'Get fluent in accounting fundamentals and Excel modelling',
            'Follow African markets weekly — build the habit of having a view',
            'Book sessions with finance professionals on Pathora to understand real career paths',
          ],
        },
        {
          period: 'Year 2',
          focus: 'Get inside the industry',
          actions: [
            'Apply for Big 4, bank, and investment firm internships early',
            'Complete a valuation project on a listed African company',
            'Join or start a campus investment society',
          ],
        },
        {
          period: 'Year 3+',
          focus: 'Position for the offer',
          actions: [
            'Target graduate programmes at banks and advisory firms',
            'Consider CFA Level 1 or equivalent certification',
            'Build a network of analysts one to three years ahead of you',
          ],
        },
      ],
    },
    secondary: [
      {
        title: 'Management Consulting',
        sector: 'Entrepreneurship',
        description: 'Solve strategy problems across industries. Consulting suits people who like markets but want variety over specialisation.',
        skills: ['Problem Structuring', 'Analysis', 'Client Communication'],
      },
      {
        title: 'Audit & Advisory (Big 4)',
        sector: 'Finance',
        description: 'The classic structured entry into African finance — training, certification, and exit options built in.',
        skills: ['Accounting', 'Attention to Detail', 'Professional Judgement'],
      },
    ],
  },
  {
    primary: {
      title: 'Brand & Marketing Strategy',
      sector: 'Entrepreneurship',
      description: 'Move people at scale with ideas, stories, and positioning.',
      skills: ['Brand Strategy', 'Storytelling', 'Digital Marketing', 'Analytics', 'Leadership'],
      why: 'You read people well and you know how to bring them along — that is the core of every great marketing and leadership career. Strategy gives that instinct structure and scale.',
      africanMarket: 'African consumer brands are in a golden age, and companies from telcos to fintechs are investing heavily in marketing talent.',
      roadmap: [
        {
          period: 'Year 1',
          focus: 'Learn persuasion as a craft',
          actions: [
            'Study the campaigns of great African brands — MTN, Indomie, Moniepoint',
            'Run a real campaign for a student club or small business',
            'Book a session with a marketing leader on Pathora to map the industry',
          ],
        },
        {
          period: 'Year 2',
          focus: 'Build proof of impact',
          actions: [
            'Take on a campus ambassador role for a brand you respect',
            'Learn the numbers side — analytics, funnels, and ROI',
            'Document every campaign with before-and-after results',
          ],
        },
        {
          period: 'Year 3+',
          focus: 'Step into the industry',
          actions: [
            'Target graduate roles at agencies, telcos, and consumer companies',
            'Develop a specialty — brand, growth, or communications',
            'Build your own audience; marketers who market themselves win',
          ],
        },
      ],
    },
    secondary: [
      {
        title: 'Entrepreneurship',
        sector: 'Entrepreneurship',
        description: 'If you can persuade people, you can recruit teams, win customers, and raise capital. Founders are sellers first.',
        skills: ['Vision', 'Resilience', 'Fundraising'],
      },
      {
        title: 'Product Management',
        sector: 'Technology',
        description: 'Tech needs people who can align engineers, designers, and executives around one story. That is a PM.',
        skills: ['Communication', 'Strategy', 'Prioritisation'],
      },
    ],
  },
];

/** Fragments used to personalise the "why this fits" copy from the step-1 answer. */
export const statusFragments: string[] = [
  'you have some ideas but are still choosing a direction',
  "you're still figuring things out — which is exactly the right place to start from",
  'you know what you want and need a route to get there',
  "you're exploring your options before committing",
];
