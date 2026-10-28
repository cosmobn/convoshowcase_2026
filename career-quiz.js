/** Questions for the "What do you like?" step and the quick field quiz (shared with prototype/). */
// IT and CM jobs are BIICF role ids from data/roles.json. Business jobs are COSMO's potential careers
// (data/business-leadership.json). The data has no OHS roles, so OHS jobs are general example titles.

export const NONE = 'none';
// This many "None of these" answers suggests the chosen field may not suit the student.
export const MISMATCH_AT = 4;

export const quizFields = {
  creative: {
    groups: {
      research: { name: 'Research & insight', jobs: ['market-analyst'] },
      campaigns: { name: 'Campaigns & brand', jobs: ['digital-marketing-executive', 'marketing-manager', 'cmo'] },
      people: { name: 'Customers & partners', jobs: ['customer-experience-manager', 'business-development-manager'] },
    },
    questions: [
      { text: 'Which task sounds the most fun?', answers: [
        ['Finding out what people like and why', 'research'],
        ['Creating posts, videos and ads for a brand', 'campaigns'],
        ['Meeting clients and keeping customers happy', 'people'],
      ] },
      { text: 'What would you like to learn?', answers: [
        ['Surveys, trends and campaign data', 'research'],
        ['Social media, content and branding', 'campaigns'],
        ['Customer service and building partnerships', 'people'],
      ] },
      { text: 'Which sentence sounds most like you?', answers: [
        ['I like research and numbers', 'research'],
        ['I have lots of creative ideas', 'campaigns'],
        ["I'm friendly and good with people", 'people'],
      ] },
      { text: 'Which school project would you enjoy most?', answers: [
        ['Running a survey and presenting the results', 'research'],
        ['Designing a poster or making a short video', 'campaigns'],
        ['Interviewing people and presenting to a group', 'people'],
      ] },
      { text: 'What would you like your work to do?', answers: [
        ['Help a company understand its customers', 'research'],
        ['Make a brand well known and exciting', 'campaigns'],
        ['Win new clients and keep them happy', 'people'],
      ] },
      { text: 'Which tool would you most like to use?', answers: [
        ['Spreadsheets and survey tools', 'research'],
        ['A camera, Canva or a video editing app', 'campaigns'],
        ['Phone calls, emails and meetings', 'people'],
      ] },
      { text: 'What would you like to be known for?', answers: [
        ['Knowing what customers really want', 'research'],
        ['Creating campaigns everyone remembers', 'campaigns'],
        ['Being the person clients trust', 'people'],
      ] },
    ],
  },
  it: {
    groups: {
      services: { name: 'IT Services', jobs: ['it-technician', 'it-administrator-manager', 'project-coordinator', 'systems-engineer', 'project-manager', 'it-operations-manager', 'cio'] },
      network: { name: 'Network', jobs: ['network-technician', 'network-team-lead', 'network-engineer', 'infrastructure-engineer', 'infrastructure-manager', 'cto-telecom'] },
      apps: { name: 'Apps & Software', jobs: ['junior-programmer', 'applications-developer', 'application-system-engineer', 'solutions-architect', 'software-architect', 'software-development-manager', 'cto-apps'] },
      security: { name: 'Cyber Security', jobs: ['associate-security-analyst', 'cyber-risk-analyst', 'security-engineer', 'cyber-risk-manager', 'ciso'] },
      data: { name: 'Data & AI', jobs: ['data-entry', 'data-analyst', 'data-engineer', 'data-scientist', 'ai-engineer', 'data-architect', 'data-manager', 'bi-director'] },
    },
    questions: [
      { text: 'Which task sounds the most fun?', answers: [
        ['Helping people fix computer problems', 'services'],
        ['Setting up Wi-Fi and connecting networks', 'network'],
        ['Writing code to build an app or website', 'apps'],
        ['Stopping hackers and keeping data safe', 'security'],
        ['Finding patterns in numbers and charts', 'data'],
      ] },
      { text: 'What would you like to learn?', answers: [
        ['How computers and office systems are run', 'services'],
        ['How the internet and phone networks work', 'network'],
        ['Programming languages like Python or JavaScript', 'apps'],
        ['Ethical hacking and cyber security', 'security'],
        ['Data analysis and artificial intelligence', 'data'],
      ] },
      { text: 'Which sentence sounds most like you?', answers: [
        ['I like helping people and keeping things running', 'services'],
        ['I like hardware, cables and how things connect', 'network'],
        ['I like creating something from nothing', 'apps'],
        ['I like solving puzzles and spotting threats', 'security'],
        ["I'm curious and always ask 'why?'", 'data'],
      ] },
      { text: 'Which school project would you enjoy most?', answers: [
        ['Setting up computers for a new classroom', 'services'],
        ['Connecting every room in the school to the Wi-Fi', 'network'],
        ['Making a game or a school app', 'apps'],
        ['Testing how safe the school website is', 'security'],
        ['Making charts from a class survey', 'data'],
      ] },
      { text: 'What would you like your work to do?', answers: [
        ["Keep a company's computers and systems running", 'services'],
        ['Keep people connected to the internet', 'network'],
        ['Build apps that people use every day', 'apps'],
        ['Protect people from scams and hackers', 'security'],
        ['Use data and AI to make better decisions', 'data'],
      ] },
      { text: 'Which tool would you most like to use?', answers: [
        ['A screwdriver and a help-desk system', 'services'],
        ['Routers, switches and network cables', 'network'],
        ['A code editor', 'apps'],
        ['Security scanners and firewalls', 'security'],
        ['Excel, Power BI or Python', 'data'],
      ] },
      { text: 'What would you like to be known for?', answers: [
        ['Fixing any computer problem', 'services'],
        ['Building networks that never go down', 'network'],
        ['Making apps people love', 'apps'],
        ['Stopping cyber attacks', 'security'],
        ['Turning data into smart answers', 'data'],
      ] },
    ],
  },
  business: {
    groups: {
      people: { name: 'People & customers', jobs: ['Human Resources Assistant', 'Customer Service Manager', 'Retail Manager'] },
      sales: { name: 'Sales & marketing', jobs: ['Marketing Assistant', 'Sales Executive'] },
      numbers: { name: 'Numbers & analysis', jobs: ['Finance Assistant', 'Business Analyst'] },
      organising: { name: 'Organising', jobs: ['Project Coordinator', 'Administrative Assistant'] },
      own: { name: 'Your own business', jobs: ['Entrepreneur'] },
    },
    questions: [
      { text: 'Which task sounds the most fun?', answers: [
        ['Helping customers or a team', 'people'],
        ['Selling or promoting a product', 'sales'],
        ['Working with money and figures', 'numbers'],
        ['Planning and keeping things in order', 'organising'],
        ['Starting my own business idea', 'own'],
      ] },
      { text: 'What would you like to learn?', answers: [
        ['Managing people and customer service', 'people'],
        ['Marketing and selling', 'sales'],
        ['Accounting and finance', 'numbers'],
        ['Project planning and office administration', 'organising'],
        ['How to start and grow a business', 'own'],
      ] },
      { text: 'Which sentence sounds most like you?', answers: [
        ["I'm a good listener", 'people'],
        ["I'm confident talking to new people", 'sales'],
        ["I'm careful with details and numbers", 'numbers'],
        ["I'm organised and like making lists", 'organising'],
        ['I like taking risks and being my own boss', 'own'],
      ] },
      { text: 'Which school project would you enjoy most?', answers: [
        ['Helping new students settle in', 'people'],
        ['Selling tickets for a school event', 'sales'],
        ['Managing the money for a class trip', 'numbers'],
        ['Planning the schedule for a school event', 'organising'],
        ['Running my own stall at a school market', 'own'],
      ] },
      { text: 'What would you like your work to do?', answers: [
        ['Look after staff and customers', 'people'],
        ['Bring in more sales', 'sales'],
        ["Keep a company's money in good shape", 'numbers'],
        ['Make sure projects finish on time', 'organising'],
        ['Build something of my own', 'own'],
      ] },
      { text: 'Which tool would you most like to use?', answers: [
        ['A customer feedback form', 'people'],
        ['Social media and sales brochures', 'sales'],
        ['A calculator and spreadsheets', 'numbers'],
        ['A calendar and a to-do list', 'organising'],
        ['A business plan', 'own'],
      ] },
      { text: 'What would you like to be known for?', answers: [
        ['Being great with people', 'people'],
        ['Being a top seller', 'sales'],
        ['Being trusted with money', 'numbers'],
        ['Getting things done on time', 'organising'],
        ['Starting a successful business', 'own'],
      ] },
    ],
  },
  ohs: {
    groups: {
      site: { name: 'On-site safety', jobs: ['Safety Officer', 'Site Safety Supervisor'] },
      inspect: { name: 'Inspection & audit', jobs: ['Safety Inspector', 'HSE Auditor'] },
      health: { name: 'Health & environment', jobs: ['Industrial Hygiene Technician', 'Environmental Officer'] },
      training: { name: 'Training & planning', jobs: ['Safety Trainer', 'HSE Coordinator', 'Emergency Response Coordinator', 'HSE Manager'] },
    },
    questions: [
      { text: 'Which task sounds the most fun?', answers: [
        ['Walking a work site and stopping unsafe work', 'site'],
        ['Checking equipment and writing inspection reports', 'inspect'],
        ['Measuring noise, dust or pollution', 'health'],
        ['Teaching people how to stay safe', 'training'],
      ] },
      { text: 'What would you like to learn?', answers: [
        ['Site safety and permits to work', 'site'],
        ['Safety laws, standards and audits', 'inspect'],
        ['Workplace health and the environment', 'health'],
        ['First aid, fire safety and emergency drills', 'training'],
      ] },
      { text: 'Which sentence sounds most like you?', answers: [
        ['I like being active and outdoors', 'site'],
        ['I notice small details others miss', 'inspect'],
        ["I'm interested in science and health", 'health'],
        ["I'm confident speaking in front of a group", 'training'],
      ] },
      { text: 'Which school project would you enjoy most?', answers: [
        ['Leading a safety walk around the school', 'site'],
        ['Checking the fire extinguishers and exits', 'inspect'],
        ['Testing the air or water quality', 'health'],
        ['Running a fire drill for the whole school', 'training'],
      ] },
      { text: 'What would you like your work to do?', answers: [
        ['Make sure everyone on site goes home safe', 'site'],
        ['Make sure companies follow safety laws', 'inspect'],
        ["Protect workers' health and the environment", 'health'],
        ['Prepare people for emergencies', 'training'],
      ] },
      { text: 'Which tool would you most like to use?', answers: [
        ['A hard hat and a safety checklist', 'site'],
        ['An inspection form and a camera', 'inspect'],
        ['A noise or air-quality meter', 'health'],
        ['A first-aid kit and a presentation', 'training'],
      ] },
      { text: 'What would you like to be known for?', answers: [
        ['Keeping a work site accident-free', 'site'],
        ['Never missing a safety problem', 'inspect'],
        ["Protecting workers' health", 'health'],
        ['Training people to stay safe', 'training'],
      ] },
    ],
  },
};

export const fieldQuiz = [
  { text: 'Which activity sounds the most fun?', answers: [
    ['Drawing, filming or editing a video', 'creative'],
    ['Building an app or fixing a computer', 'it'],
    ['Selling something or running a small shop', 'business'],
    ['Checking that a workplace is safe for everyone', 'ohs'],
  ] },
  { text: 'Which school subject do you enjoy most?', answers: [
    ['Art or Design', 'creative'],
    ['Computing or Maths', 'it'],
    ['Business or Economics', 'business'],
    ['Science or Biology', 'ohs'],
  ] },
  { text: 'What do you like doing in your free time?', answers: [
    ['Taking photos or making content for social media', 'creative'],
    ['Gaming, coding or playing with gadgets', 'it'],
    ['Planning events or organising friends', 'business'],
    ['Sports, outdoor activities or first aid', 'ohs'],
  ] },
  { text: 'Which sentence sounds most like you?', answers: [
    ['I like sharing my ideas in creative ways', 'creative'],
    ['I like working out how things work', 'it'],
    ['I like leading and making decisions', 'business'],
    ['I notice risks that other people miss', 'ohs'],
  ] },
  { text: 'Where would you most like to work?', answers: [
    ['In a studio or on a film set', 'creative'],
    ['At a desk with computers and servers', 'it'],
    ['In an office or my own company', 'business'],
    ['On site, such as construction, oil and gas or a factory', 'ohs'],
  ] },
];

/** Scores each job group by the answers that point to it, best first; ties keep the field's order. */
export function rankGroups(field, answers) {
  const groups = quizFields[field]?.groups || {};
  return Object.entries(groups).map(([id, group], index) => ({ id, ...group, index, score: answers.filter(answer => answer === id).length })).sort((a, b) => b.score - a.score || a.index - b.index);
}

/** The field the quick quiz points to; ties go to the first field in `order`. */
export function bestField(answers, order) {
  return order.reduce((best, field) => answers.filter(answer => answer === field).length > answers.filter(answer => answer === best).length ? field : best, order[0]);
}
