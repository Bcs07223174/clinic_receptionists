# Clinic Receptionist Management System

A modern, responsive web application for managing clinic appointments and patient queues. Built with Next.js 14, TypeScript, and MongoDB.

## ✨ Features

### 🔐 Authentication
- Secure login with session management
- Auto-login functionality
- Session validation
- Proper logout with cleanup

### 📊 Dashboard Overview
- Real-time appointment statistics
- Today's appointments view
- Status breakdown (Pending, Confirmed, Rejected)
- Mobile-responsive design

### 📅 Appointment Management
- View appointments by doctor
- Update appointment status (Confirm/Reject)
- Real-time updates every 5 seconds
- Detailed patient information display
- Mobile-optimized interface

### 👥 Patient Queue Management
- Real-time patient queue tracking
- Filter by appointment status
- Search functionality
- Auto-refresh every 3 seconds
- Responsive grid layout

### 📱 Mobile Responsiveness
- Fully responsive design
- Mobile-first approach
- Touch-friendly interface
- Collapsible navigation
- Optimized for all screen sizes

### 🎨 UI/UX Features
- Modern medical-themed color scheme
- Smooth animations and transitions
- Loading skeletons matching the theme
- Intuitive navigation
- Accessible design

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/clinic-receptionist.git
cd clinic-receptionist
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/clinic-db
# or your MongoDB connection string
```

4. **Run the development server**
```bash
npm run dev
# or
yarn dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
clinic-receptionist/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes
│   │   ├── appointments/         # Appointment management
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── doctors/              # Doctor management
│   │   ├── patient-queue/        # Patient queue operations
│   │   └── ...
│   ├── dashboard/                # Main dashboard page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Login page
├── components/                   # React components
│   ├── ui/                       # Reusable UI components
│   ├── appointments-tab.tsx      # Appointment management
│   ├── auth-guard.tsx           # Authentication wrapper
│   ├── navbar.tsx               # Navigation component
│   ├── overview-tab.tsx         # Dashboard overview
│   ├── patient-queue-tab.tsx    # Patient queue
│   └── profile-tab.tsx          # User profile
├── lib/                         # Utility libraries
│   ├── mongodb.ts               # Database connection
│   └── utils.ts                 # Helper functions
└── public/                      # Static assets
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/validate-session` - Session validation

### Appointments
- `GET /api/appointments` - Get appointments by doctor
- `PUT /api/appointments` - Update appointment status

### Patient Queue
- `GET /api/patient-queue` - Get patient queue by doctor

### Doctors
- `GET /api/doctors` - Get all doctors

## 🎯 Key Features Implemented

### ✅ Fixed Issues
- **Appointment Status Update**: Fixed API response handling
- **Mobile Responsiveness**: Complete mobile optimization
- **Auto Login**: Persistent session management  
- **Patient Queue**: Real-time updates and filtering
- **Better UX**: Loading states, skeletons, and animations
- **Code Cleanup**: Removed test files and debug code

### 🎨 UI Improvements
- Medical-themed color scheme (Sky blue, Teal, Medical colors)
- Gradient backgrounds and cards
- Improved typography and spacing
- Loading skeletons with theme colors
- Responsive grid layouts
- Touch-friendly buttons and controls

### 📱 Mobile Features
- Responsive navigation with hamburger menu
- Optimized card layouts for mobile
- Touch-friendly interaction areas
- Swipe-friendly interfaces
- Mobile-optimized forms

## 🔒 Security Features

- Session token validation
- Secure MongoDB ObjectId handling
- Input validation and sanitization
- Error handling without data exposure
- Proper logout cleanup

## 🎨 Design System

### Colors
- **Primary**: Sky Blue (`oklch(0.595 0.188 240.55)`)
- **Secondary**: Teal (`oklch(0.675 0.157 193.51)`)
- **Success**: Green (`oklch(0.64 0.226 142.5)`)
- **Warning**: Amber (`oklch(0.73 0.186 83.87)`)
- **Error**: Medical Red (`oklch(0.627 0.244 27.8)`)

### Components
- Consistent spacing using Tailwind classes
- Rounded corners with `--radius: 0.625rem`
- Shadow system for depth
- Smooth transitions and animations

## 📊 Database Schema

### Collections
- **receptionists**: User accounts with linked doctors
- **doctors**: Doctor information and specializations  
- **appointments**: Appointment details and status
- **PaitentQueue**: Patient queue entries

## 🛠️ Technologies Used

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB
- **Styling**: Tailwind CSS + Custom CSS Variables
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Hooks

## 🚀 Deployment

The application is ready for deployment on platforms like:
- Vercel (recommended for Next.js)
- Netlify
- Railway
- Docker containers

Make sure to set the `MONGODB_URI` environment variable in your deployment platform.

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

**Note**: This is a medical management system. Ensure compliance with healthcare data regulations (HIPAA, GDPR) when deployed in production.