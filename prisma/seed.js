const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gighub.uk' },
    update: {},
    create: {
      email: 'admin@gighub.uk',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      role: 'admin',
      isEmployer: true,
      isJobSeeker: false,
    },
  });
  console.log('Admin user created:', admin.email);

  // Create categories with subcategories
  const categories = [
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      icon: '🏠',
      description: 'Cleaning, gardening, DIY, and moving services',
      subcategories: [
        { name: 'Cleaning', slug: 'cleaning', description: 'House cleaning and deep cleaning services' },
        { name: 'Gardening', slug: 'gardening', description: 'Garden maintenance and landscaping' },
        { name: 'DIY & Handyman', slug: 'diy-handyman', description: 'General repairs and home improvements' },
        { name: 'Moving & Removals', slug: 'moving-removals', description: 'Help with moving house or furniture' },
        { name: 'Organising', slug: 'organising', description: 'Home organisation and decluttering' },
      ],
    },
    {
      name: 'Trades & Services',
      slug: 'trades-services',
      icon: '🔧',
      description: 'Plumbing, electrical, painting, and other trade services',
      subcategories: [
        { name: 'Plumbing', slug: 'plumbing', description: 'Plumbing repairs and installations' },
        { name: 'Electrical', slug: 'electrical', description: 'Electrical work and repairs' },
        { name: 'Painting & Decorating', slug: 'painting-decorating', description: 'Interior and exterior painting' },
        { name: 'Carpentry', slug: 'carpentry', description: 'Woodwork and furniture assembly' },
        { name: 'Tiling', slug: 'tiling', description: 'Wall and floor tiling' },
      ],
    },
    {
      name: 'Delivery & Driving',
      slug: 'delivery-driving',
      icon: '📦',
      description: 'Delivery, courier, and driving services',
      subcategories: [
        { name: 'Local Delivery', slug: 'local-delivery', description: 'Same-day local deliveries' },
        { name: 'Courier Services', slug: 'courier-services', description: 'Urgent document and parcel delivery' },
        { name: 'Driver', slug: 'driver', description: 'Personal driver services' },
        { name: 'Van Services', slug: 'van-services', description: 'Van hire with driver' },
      ],
    },
    {
      name: 'Hospitality & Catering',
      slug: 'hospitality-catering',
      icon: '🍳',
      description: 'Restaurant, bar, and catering work',
      subcategories: [
        { name: 'Waiting Staff', slug: 'waiting-staff', description: 'Restaurant and event waiting' },
        { name: 'Bar Staff', slug: 'bar-staff', description: 'Bartending and bar work' },
        { name: 'Kitchen Staff', slug: 'kitchen-staff', description: 'Kitchen assistance and prep' },
        { name: 'Catering', slug: 'catering', description: 'Event catering services' },
        { name: 'Chef', slug: 'chef', description: 'Professional cooking services' },
      ],
    },
    {
      name: 'Retail & Sales',
      slug: 'retail-sales',
      icon: '🛒',
      description: 'Shop work, sales, and customer service',
      subcategories: [
        { name: 'Shop Assistant', slug: 'shop-assistant', description: 'Retail shop work' },
        { name: 'Sales', slug: 'sales', description: 'Sales and promotion work' },
        { name: 'Merchandising', slug: 'merchandising', description: 'Stock and display management' },
        { name: 'Market Stall', slug: 'market-stall', description: 'Market and popup shop help' },
      ],
    },
    {
      name: 'Events & Photography',
      slug: 'events-photography',
      icon: '📸',
      description: 'Event support and photography services',
      subcategories: [
        { name: 'Event Staff', slug: 'event-staff', description: 'General event assistance' },
        { name: 'Photography', slug: 'photography', description: 'Event and portrait photography' },
        { name: 'Videography', slug: 'videography', description: 'Video filming and editing' },
        { name: 'DJ & Music', slug: 'dj-music', description: 'DJing and live music' },
        { name: 'Event Planning', slug: 'event-planning', description: 'Event coordination and planning' },
      ],
    },
    {
      name: 'Admin & Office',
      slug: 'admin-office',
      icon: '💻',
      description: 'Administrative and office support',
      subcategories: [
        { name: 'Data Entry', slug: 'data-entry', description: 'Data entry and processing' },
        { name: 'Reception', slug: 'reception', description: 'Front desk and reception work' },
        { name: 'Virtual Assistant', slug: 'virtual-assistant', description: 'Remote administrative support' },
        { name: 'Filing & Organising', slug: 'filing-organising', description: 'Document management' },
      ],
    },
    {
      name: 'Childcare & Pet Care',
      slug: 'childcare-petcare',
      icon: '👶',
      description: 'Babysitting, nannying, and pet care services',
      subcategories: [
        { name: 'Babysitting', slug: 'babysitting', description: 'Occasional babysitting' },
        { name: 'Nannying', slug: 'nannying', description: 'Professional childcare' },
        { name: 'Dog Walking', slug: 'dog-walking', description: 'Dog walking services' },
        { name: 'Pet Sitting', slug: 'pet-sitting', description: 'Pet care while away' },
        { name: 'Pet Grooming', slug: 'pet-grooming', description: 'Pet grooming services' },
      ],
    },
    {
      name: 'Tutoring & Education',
      slug: 'tutoring-education',
      icon: '📚',
      description: 'Teaching, tutoring, and training services',
      subcategories: [
        { name: 'Academic Tutoring', slug: 'academic-tutoring', description: 'Subject-specific tutoring' },
        { name: 'Language Teaching', slug: 'language-teaching', description: 'Language lessons' },
        { name: 'Music Lessons', slug: 'music-lessons', description: 'Musical instrument teaching' },
        { name: 'Sports Coaching', slug: 'sports-coaching', description: 'Sports training and coaching' },
        { name: 'IT Training', slug: 'it-training', description: 'Computer and technology teaching' },
      ],
    },
    {
      name: 'Health & Fitness',
      slug: 'health-fitness',
      icon: '💪',
      description: 'Personal training, fitness, and wellness services',
      subcategories: [
        { name: 'Personal Training', slug: 'personal-training', description: 'One-to-one fitness training' },
        { name: 'Yoga & Pilates', slug: 'yoga-pilates', description: 'Yoga and pilates instruction' },
        { name: 'Massage', slug: 'massage', description: 'Massage therapy services' },
        { name: 'Nutrition', slug: 'nutrition', description: 'Dietary and nutrition advice' },
      ],
    },
    {
      name: 'Creative & Design',
      slug: 'creative-design',
      icon: '🎨',
      description: 'Graphic design, art, and creative services',
      subcategories: [
        { name: 'Graphic Design', slug: 'graphic-design', description: 'Visual design services' },
        { name: 'Web Design', slug: 'web-design', description: 'Website design and development' },
        { name: 'Illustration', slug: 'illustration', description: 'Custom illustration work' },
        { name: 'Content Writing', slug: 'content-writing', description: 'Writing and copywriting' },
        { name: 'Social Media', slug: 'social-media', description: 'Social media management' },
      ],
    },
    {
      name: 'Construction & Labour',
      slug: 'construction-labour',
      icon: '🔨',
      description: 'Construction work and general labour',
      subcategories: [
        { name: 'General Labour', slug: 'general-labour', description: 'Physical labour assistance' },
        { name: 'Demolition', slug: 'demolition', description: 'Demolition and clearance' },
        { name: 'Roofing', slug: 'roofing', description: 'Roof repairs and installation' },
        { name: 'Scaffolding', slug: 'scaffolding', description: 'Scaffolding services' },
        { name: 'Site Clearance', slug: 'site-clearance', description: 'Building site cleanup' },
      ],
    },
    {
      name: 'Cleaning Services',
      slug: 'cleaning-services',
      icon: '🧹',
      description: 'Professional cleaning services',
      subcategories: [
        { name: 'Domestic Cleaning', slug: 'domestic-cleaning', description: 'Regular home cleaning' },
        { name: 'Commercial Cleaning', slug: 'commercial-cleaning', description: 'Office and business cleaning' },
        { name: 'End of Tenancy', slug: 'end-of-tenancy', description: 'Move-out deep cleaning' },
        { name: 'Carpet Cleaning', slug: 'carpet-cleaning', description: 'Professional carpet cleaning' },
        { name: 'Window Cleaning', slug: 'window-cleaning', description: 'Window cleaning services' },
      ],
    },
    {
      name: 'Automotive',
      slug: 'automotive',
      icon: '🚗',
      description: 'Car care and automotive services',
      subcategories: [
        { name: 'Car Washing', slug: 'car-washing', description: 'Car cleaning and valeting' },
        { name: 'Car Repairs', slug: 'car-repairs', description: 'Vehicle repairs and maintenance' },
        { name: 'Tyre Services', slug: 'tyre-services', description: 'Tyre fitting and repairs' },
        { name: 'Mechanics', slug: 'mechanics', description: 'General mechanic work' },
      ],
    },
    {
      name: 'Tech Support',
      slug: 'tech-support',
      icon: '📱',
      description: 'IT and technology support services',
      subcategories: [
        { name: 'Computer Repair', slug: 'computer-repair', description: 'PC and laptop repairs' },
        { name: 'Phone Repair', slug: 'phone-repair', description: 'Mobile phone repairs' },
        { name: 'IT Support', slug: 'it-support', description: 'General IT assistance' },
        { name: 'Smart Home', slug: 'smart-home', description: 'Smart home setup and support' },
      ],
    },
    {
      name: 'Other',
      slug: 'other',
      icon: '➕',
      description: 'Other services and miscellaneous jobs',
      subcategories: [
        { name: 'Errand Running', slug: 'errand-running', description: 'Running errands and tasks' },
        { name: 'Queue Waiting', slug: 'queue-waiting', description: 'Waiting in queues' },
        { name: 'Mystery Shopping', slug: 'mystery-shopping', description: 'Mystery shopping assignments' },
        { name: 'Surveys & Research', slug: 'surveys-research', description: 'Participating in research' },
        { name: 'Miscellaneous', slug: 'miscellaneous', description: 'Other odd jobs' },
      ],
    },
  ];

  // Create categories and subcategories
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (!cat) continue;

    const parentCategory = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        sortOrder: i,
      },
    });
    console.log(`Created category: ${parentCategory.name}`);

    // Create subcategories
    if (cat.subcategories) {
      for (let j = 0; j < cat.subcategories.length; j++) {
        const subcat = cat.subcategories[j];
        if (!subcat) continue;

        await prisma.category.upsert({
          where: { slug: subcat.slug },
          update: {},
          create: {
            name: subcat.name,
            slug: subcat.slug,
            description: subcat.description,
            parentId: parentCategory.id,
            sortOrder: j,
          },
        });
      }
    }
  }

  // Create skills for each category
  const skillsByCategory = {
    'home-garden': ['Deep Cleaning', 'Lawn Mowing', 'Hedge Trimming', 'Furniture Assembly', 'Painting', 'Wallpapering', 'Packing', 'Heavy Lifting'],
    'trades-services': ['Basic Plumbing', 'Electrical Safety', 'Paint Spraying', 'Woodworking', 'Plastering', 'Grouting', 'CSCS Card'],
    'delivery-driving': ['Full UK Licence', 'Clean Driving Record', 'Own Vehicle', 'GPS Navigation', 'Customer Service'],
    'hospitality-catering': ['Food Hygiene Certificate', 'Bar Experience', 'Silver Service', 'Barista', 'Cocktail Making', 'Kitchen Experience'],
    'retail-sales': ['Till Operation', 'Customer Service', 'Stock Management', 'Visual Merchandising', 'Sales Experience'],
    'events-photography': ['DSLR Camera', 'Photo Editing', 'Video Editing', 'Lighting Setup', 'Sound Equipment', 'Event Coordination'],
    'admin-office': ['Microsoft Office', 'Typing Speed 60+ WPM', 'Data Entry', 'Filing Systems', 'Phone Manner', 'Google Workspace'],
    'childcare-petcare': ['DBS Check', 'First Aid', 'Child Development', 'Pet First Aid', 'Dog Handling', 'Child Safety'],
    'tutoring-education': ['QTS', 'Degree Level', 'TEFL Certificate', 'DBS Enhanced', 'Patience', 'Subject Expertise'],
    'health-fitness': ['Level 2 Fitness', 'Level 3 PT', 'First Aid', 'Nutrition Knowledge', 'Sports Massage'],
    'creative-design': ['Adobe Creative Suite', 'Figma', 'WordPress', 'SEO', 'Copywriting', 'Social Media Management'],
    'construction-labour': ['CSCS Card', 'Manual Handling', 'Working at Height', 'Asbestos Awareness', 'First Aid', 'Forklift License'],
    'cleaning-services': ['Commercial Cleaning', 'Steam Cleaning', 'Carpet Shampooing', 'Window Cleaning', 'Pressure Washing'],
    'automotive': ['MOT Tester', 'Diagnostic Equipment', 'Valeting', 'Paint Protection', 'Air Con Regas'],
    'tech-support': ['Windows', 'macOS', 'iOS', 'Android', 'Networking', 'Hardware Repair', 'Software Installation'],
    'other': ['Flexible', 'Quick Learner', 'Reliable', 'Punctual', 'Good Communication'],
  };

  for (const [categorySlug, skills] of Object.entries(skillsByCategory)) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (category) {
      for (const skillName of skills) {
        const skillSlug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        await prisma.skill.upsert({
          where: { slug: skillSlug },
          update: {},
          create: {
            name: skillName,
            slug: skillSlug,
            categoryId: category.id,
          },
        });
      }
      console.log(`Created skills for: ${category.name}`);
    }
  }

  // Create system settings
  const settings = [
    { key: 'job_requires_approval', value: 'false', description: 'Whether jobs require admin approval before going live' },
    { key: 'max_images_per_job', value: '5', description: 'Maximum number of images per job listing' },
    { key: 'review_window_days', value: '14', description: 'Number of days to leave a review after job completion' },
    { key: 'job_expiry_days', value: '7', description: 'Number of days after job date when listing expires' },
    { key: 'min_password_length', value: '8', description: 'Minimum password length' },
    { key: 'max_applications_per_day', value: '20', description: 'Maximum job applications per user per day' },
    { key: 'max_report_evidence', value: '5', description: 'Maximum evidence files per report' },
    { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode' },
    { key: 'maintenance_message', value: 'We are currently performing maintenance. Please try again later.', description: 'Maintenance mode message' },
    { key: 'email_verification_expiry_minutes', value: '15', description: 'Email verification code expiry in minutes' },
    { key: 'phone_verification_expiry_minutes', value: '10', description: 'Phone verification code expiry in minutes' },
    { key: 'password_reset_expiry_minutes', value: '60', description: 'Password reset code expiry in minutes' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('Created system settings');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
