/**
 * University-specific data for Karunya Institute of Technology and Sciences
 * This will replace the medical-focused content with university information
 */

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  faculty: Faculty[];
  courses: Course[];
  facilities: string[];
  contactEmail: string;
  contactPhone: string;
  head: string;
}

export interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone?: string;
  specialization: string[];
  qualifications: string[];
  researchAreas: string[];
  officeLocation: string;
  officeHours: string;
  imageUrl?: string; // Placeholder for faculty photos
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  credits: number;
  semester: number;
  year: 1 | 2 | 3 | 4;
  description: string;
  prerequisites: string[];
  faculty: string[]; // Faculty IDs
  schedule: {
    days: string[];
    time: string;
    location: string;
  };
  syllabus?: string;
}

export interface Circular {
  id: string;
  title: string;
  content: string;
  department?: string; // If department-specific
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'academic' | 'administrative' | 'events' | 'examination' | 'hostel' | 'library' | 'placement' | 'general';
  dateIssued: Date;
  validUntil?: Date;
  attachments?: string[]; // File URLs
  targetAudience: 'all' | 'students' | 'faculty' | 'staff' | 'specific';
  tags: string[];
  isActive: boolean;
}

export interface AcademicEvent {
  id: string;
  title: string;
  description: string;
  type: 'exam' | 'assignment' | 'lecture' | 'lab' | 'seminar' | 'workshop' | 'conference' | 'cultural' | 'sports';
  startDate: Date;
  endDate: Date;
  location: string;
  department?: string;
  organizer: string;
  registrationRequired: boolean;
  registrationDeadline?: Date;
  maxParticipants?: number;
  fee?: number;
  eligibility: string[];
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface CampusFacility {
  id: string;
  name: string;
  type: 'library' | 'lab' | 'auditorium' | 'cafeteria' | 'hostel' | 'sports' | 'medical' | 'transport' | 'accessibility';
  location: string;
  description: string;
  facilities: string[];
  accessibilityFeatures: string[];
  timings: {
    weekdays: string;
    weekends: string;
    holidays: string;
  };
  contactInfo?: {
    incharge: string;
    email: string;
    phone: string;
  };
  amenities: string[];
  capacity?: number;
  bookingRequired?: boolean;
}

// Sample data - replace with actual university data
export const KARUNYA_DEPARTMENTS: Department[] = [
  {
    id: 'cse',
    name: 'Computer Science and Engineering',
    code: 'CSE',
    description: 'Department of Computer Science and Engineering focuses on cutting-edge technology and innovation.',
    faculty: [],
    courses: [],
    facilities: ['Computer Labs', 'Software Development Center', 'AI Research Lab', 'Networking Lab'],
    contactEmail: 'cse@karunya.edu',
    contactPhone: '0422-2614000',
    head: 'Dr. Rajesh Kumar'
  },
  {
    id: 'ece',
    name: 'Electronics and Communication Engineering',
    code: 'ECE',
    description: 'Department of Electronics and Communication Engineering specializes in electronic systems and communication technologies.',
    faculty: [],
    courses: [],
    facilities: ['Electronics Lab', 'Communication Lab', 'VLSI Design Lab', 'Embedded Systems Lab'],
    contactEmail: 'ece@karunya.edu',
    contactPhone: '0422-2614001',
    head: 'Dr. Priya Sharma'
  },
  {
    id: 'mech',
    name: 'Mechanical Engineering',
    code: 'MECH',
    description: 'Department of Mechanical Engineering provides comprehensive education in mechanical systems and manufacturing.',
    faculty: [],
    courses: [],
    facilities: ['Workshop', 'CAD Lab', 'Thermal Engineering Lab', 'Manufacturing Lab'],
    contactEmail: 'mech@karunya.edu',
    contactPhone: '0422-2614002',
    head: 'Dr. Suresh Babu'
  },
  {
    id: 'civil',
    name: 'Civil Engineering',
    code: 'CIVIL',
    description: 'Department of Civil Engineering focuses on infrastructure development and construction technology.',
    faculty: [],
    courses: [],
    facilities: ['Concrete Lab', 'Surveying Lab', 'Environmental Engineering Lab', 'CAD Lab'],
    contactEmail: 'civil@karunya.edu',
    contactPhone: '0422-2614003',
    head: 'Dr. Lakshmi Devi'
  }
];

export const SAMPLE_CIRCULARS: Circular[] = [
  {
    id: 'c001',
    title: 'Mid-Semester Examination Schedule',
    content: 'Mid-semester examinations will be conducted from October 15-20, 2025. Students are required to report 30 minutes before the exam.',
    priority: 'high',
    category: 'examination',
    dateIssued: new Date('2025-10-01'),
    validUntil: new Date('2025-10-20'),
    targetAudience: 'students',
    tags: ['examination', 'mid-semester', 'schedule'],
    isActive: true
  },
  {
    id: 'c002',
    title: 'Library Extended Hours During Exam Period',
    content: 'The central library will remain open 24/7 during the examination period from October 10-25, 2025.',
    priority: 'medium',
    category: 'library',
    dateIssued: new Date('2025-10-05'),
    validUntil: new Date('2025-10-25'),
    targetAudience: 'all',
    tags: ['library', 'extended-hours', 'examination'],
    isActive: true
  },
  {
    id: 'c003',
    title: 'Tech Fest 2025 - Registration Open',
    content: 'Annual Tech Fest registration is now open. Multiple events including coding competitions, robotics, and technical presentations.',
    priority: 'medium',
    category: 'events',
    dateIssued: new Date('2025-09-30'),
    validUntil: new Date('2025-11-15'),
    targetAudience: 'students',
    tags: ['tech-fest', 'competition', 'registration'],
    isActive: true
  }
];

export const CAMPUS_FACILITIES: CampusFacility[] = [
  {
    id: 'library',
    name: 'Central Library',
    type: 'library',
    location: 'Main Campus, Block A',
    description: 'State-of-the-art library with digital resources and study spaces',
    facilities: ['Digital Library', 'Reading Halls', 'Computer Lab', 'Group Study Rooms'],
    accessibilityFeatures: ['Wheelchair Access', 'Braille Books', 'Audio Books', 'Assistive Technology'],
    timings: {
      weekdays: '8:00 AM - 10:00 PM',
      weekends: '9:00 AM - 6:00 PM',
      holidays: '10:00 AM - 4:00 PM'
    },
    contactInfo: {
      incharge: 'Dr. Aruna Krishnan',
      email: 'library@karunya.edu',
      phone: '0422-2614100'
    },
    amenities: ['WiFi', 'AC', 'Photocopying', 'Printing', 'Scanning'],
    capacity: 500,
    bookingRequired: false
  },
  {
    id: 'cafeteria',
    name: 'Student Cafeteria',
    type: 'cafeteria',
    location: 'Main Campus, Ground Floor',
    description: 'Multi-cuisine cafeteria serving healthy and affordable meals',
    facilities: ['Dining Hall', 'Kitchen', 'Takeaway Counter'],
    accessibilityFeatures: ['Wheelchair Access', 'Accessible Seating', 'Wide Doorways'],
    timings: {
      weekdays: '7:00 AM - 9:00 PM',
      weekends: '8:00 AM - 8:00 PM',
      holidays: '8:00 AM - 6:00 PM'
    },
    amenities: ['Multiple Cuisines', 'Healthy Options', 'Budget Meals'],
    capacity: 300
  },
  {
    id: 'health-center',
    name: 'Campus Health Center',
    type: 'medical',
    location: 'Main Campus, Block C',
    description: '24/7 medical facility with qualified doctors and nurses',
    facilities: ['Emergency Care', 'General Medicine', 'First Aid', 'Pharmacy'],
    accessibilityFeatures: ['Wheelchair Access', 'Accessible Examination Rooms', 'Sign Language Support'],
    timings: {
      weekdays: '24 Hours',
      weekends: '24 Hours',
      holidays: '24 Hours'
    },
    contactInfo: {
      incharge: 'Dr. Madhavi Reddy',
      email: 'health@karunya.edu',
      phone: '0422-2614200'
    },
    amenities: ['Emergency Care', 'Consultation', 'Basic Pharmacy', 'Health Checkups']
  }
];

// University-specific context for AI assistant
export const KARUNYA_CONTEXT = `
KARUNYA INSTITUTE OF TECHNOLOGY AND SCIENCES

OVERVIEW:
Karunya Institute of Technology and Sciences is a deemed-to-be university located in Coimbatore, Tamil Nadu, India. 
Established in 1986, the university offers undergraduate, postgraduate, and doctoral programs in engineering, technology, and sciences.

ACCESSIBILITY COMMITMENT:
- Fully wheelchair accessible campus
- Assistive technology in library and computer labs
- Sign language interpreters available upon request
- Accessible examination facilities
- Dedicated support staff for students with disabilities
- Audio-visual aids in classrooms
- Accessible transportation within campus

CAMPUS FACILITIES:
${CAMPUS_FACILITIES.map(facility => `
${facility.name} (${facility.location}):
- ${facility.description}
- Accessibility: ${facility.accessibilityFeatures.join(', ')}
- Timings: Weekdays ${facility.timings.weekdays}
`).join('')}

DEPARTMENTS:
${KARUNYA_DEPARTMENTS.map(dept => `
${dept.name} (${dept.code}):
- Head: ${dept.head}
- Contact: ${dept.contactEmail}
- Facilities: ${dept.facilities.join(', ')}
`).join('')}

EMERGENCY CONTACTS:
- Campus Security: 0422-2614999
- Health Center: 0422-2614200
- Emergency Helpline: 0422-2614911
- Accessibility Support: 0422-2614500

ADMISSION INFORMATION:
- Applications open: November - March
- Entrance exams: JEE Main, TNEA
- Merit-based admission for eligible candidates
- Special provisions for students with disabilities
- Scholarship programs available

STUDENT SERVICES:
- Academic counseling
- Career guidance and placement
- Hostel accommodation
- Transportation services
- Sports and recreational facilities
- Cultural and technical events
- Alumni network support
`;

export const getUniversityContext = (): string => KARUNYA_CONTEXT;