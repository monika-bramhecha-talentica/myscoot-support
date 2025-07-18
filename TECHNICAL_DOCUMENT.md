# Electric Scooter Customer Support Portal - Technical Documentation

## 1. Project Overview

### 1.1 Purpose
A mobile-first web application that provides comprehensive customer support for an electric scooter company, enabling customers to get instant answers to domain-specific questions and manage their order inquiries.

### 1.2 Key Features
- Mobile number OTP authentication
- Natural language query processing with predefined answers
- File upload support for customer interactions
- Chat history persistence
- Escalation system for unresolved queries
- Admin panel for question management
- Order tracking and inquiry system

## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth with phone OTP
- **File Storage**: Supabase Storage
- **Deployment**: Lovable platform
- **Mobile Support**: Responsive design (mobile-first)

### 2.2 Architecture Pattern
- **Client-Server Architecture**: React frontend communicating with Supabase backend
- **Component-Based Design**: Modular React components with proper separation of concerns
- **State Management**: React Query for server state, React Context for global state
- **File Upload**: Direct upload to Supabase Storage with signed URLs

## 3. Database Schema

### 3.1 Core Tables

#### `customers`
```sql
- id (uuid, primary key)
- phone_number (text, unique)
- created_at (timestamp)
- updated_at (timestamp)
- is_verified (boolean)
```

#### `predefined_questions`
```sql
- id (uuid, primary key)
- question (text)
- answer (text)
- category (text)
- keywords (text[])
- is_active (boolean)
- created_by (uuid, foreign key to admin_users)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `chat_sessions`
```sql
- id (uuid, primary key)
- customer_id (uuid, foreign key)
- created_at (timestamp)
- updated_at (timestamp)
- status (enum: active, closed)
```

#### `chat_messages`
```sql
- id (uuid, primary key)
- session_id (uuid, foreign key)
- customer_id (uuid, foreign key)
- message_type (enum: question, answer, file)
- content (text)
- file_url (text, nullable)
- file_name (text, nullable)
- is_satisfied (boolean, nullable)
- created_at (timestamp)
```

#### `escalated_queries`
```sql
- id (uuid, primary key)
- customer_id (uuid, foreign key)
- original_question (text)
- file_url (text, nullable)
- status (enum: pending, in_progress, resolved)
- admin_response (text, nullable)
- created_at (timestamp)
- resolved_at (timestamp, nullable)
```

#### `scooter_orders`
```sql
- id (uuid, primary key)
- customer_id (uuid, foreign key)
- order_number (text, unique)
- scooter_model (text)
- order_date (timestamp)
- delivery_status (enum: processing, shipped, delivered, cancelled)
- tracking_number (text, nullable)
- delivery_address (text)
- estimated_delivery (timestamp, nullable)
- actual_delivery (timestamp, nullable)
```

#### `admin_users`
```sql
- id (uuid, primary key)
- email (text, unique)
- name (text)
- role (enum: admin, super_admin)
- created_at (timestamp)
```

## 4. API Specifications

### 4.1 Authentication Endpoints

#### POST `/auth/send-otp`
```json
{
  "phone_number": "+1234567890"
}
```

#### POST `/auth/verify-otp`
```json
{
  "phone_number": "+1234567890",
  "otp_code": "123456"
}
```

### 4.2 Chat System Endpoints

#### POST `/api/chat/ask-question`
```json
{
  "question": "How do I charge my scooter?",
  "session_id": "uuid"
}
```

#### POST `/api/chat/upload-file`
```json
{
  "file": "base64_encoded_file",
  "file_name": "issue_image.jpg",
  "session_id": "uuid"
}
```

#### POST `/api/chat/mark-satisfaction`
```json
{
  "message_id": "uuid",
  "is_satisfied": true
}
```

#### POST `/api/chat/escalate-query`
```json
{
  "question": "My scooter won't start",
  "file_url": "optional_file_url"
}
```

### 4.3 Order Management Endpoints

#### GET `/api/orders/customer/{customer_id}`
Returns list of customer orders

#### GET `/api/orders/{order_number}/tracking`
Returns detailed tracking information

### 4.4 Admin Endpoints

#### GET `/api/admin/questions`
Returns all predefined questions

#### POST `/api/admin/questions`
```json
{
  "question": "Question text",
  "answer": "Answer text",
  "category": "maintenance",
  "keywords": ["battery", "charge", "power"]
}
```

#### PUT `/api/admin/questions/{id}`
Updates existing question

#### GET `/api/admin/escalated-queries`
Returns pending escalated queries

## 5. Frontend Component Architecture

### 5.1 Page Components
- **AuthPage**: OTP login flow
- **HomePage**: Main dashboard with quick actions
- **ChatPage**: Interactive Q&A interface
- **OrdersPage**: Order tracking and inquiry
- **AdminDashboard**: Admin panel for question management

### 5.2 Core Components
- **ChatInterface**: Main chat component with message history
- **QuestionSuggestions**: Predefined question categories
- **FileUpload**: Drag-drop file upload component
- **OrderCard**: Individual order display component
- **SatisfactionRating**: Thumbs up/down for answers

### 5.3 Utility Components
- **OTPInput**: Custom OTP input field
- **LoadingSpinner**: Loading states
- **ErrorBoundary**: Error handling
- **MobileNavigation**: Bottom navigation for mobile

## 6. Authentication Flow

### 6.1 Customer Authentication
1. Customer enters phone number
2. System sends OTP via SMS using Supabase Auth
3. Customer enters OTP code
4. System verifies OTP and creates/updates customer record
5. JWT token issued for session management

### 6.2 Admin Authentication
1. Admin uses email/password login
2. Additional role-based access control
3. Separate admin dashboard access

## 7. Question Matching Algorithm

### 7.1 Keyword Matching
- Extract keywords from customer question
- Match against predefined question keywords
- Use fuzzy matching for similar terms

### 7.2 Category Classification
- Classify questions into categories (maintenance, battery, delivery, etc.)
- Return most relevant answers from same category

### 7.3 Fallback Strategy
- If no match found, provide general help options
- Offer to escalate to human support

## 8. File Upload System

### 8.1 Supported Formats
- Images: JPG, PNG, GIF (max 5MB)
- Documents: PDF (max 10MB)

### 8.2 Storage Strategy
- Files stored in Supabase Storage
- Organized by customer_id/session_id/filename
- Automatic thumbnail generation for images

## 9. Mobile-First Design Requirements

### 9.1 Responsive Breakpoints
- Mobile: 320px - 768px
- Tablet: 769px - 1024px
- Desktop: 1025px+

### 9.2 Touch Interactions
- Large touch targets (min 44px)
- Swipe gestures for navigation
- Pull-to-refresh functionality

### 9.3 Performance
- Lazy loading for chat history
- Image optimization
- Offline capability for viewing chat history

## 10. Security Considerations

### 10.1 Data Protection
- Row Level Security (RLS) in Supabase
- Customer data isolation
- Secure file upload validation

### 10.2 Rate Limiting
- OTP request limits (1 per minute per phone)
- File upload size restrictions
- API rate limiting

## 11. Deployment Strategy

### 11.1 Environment Setup
- Development: Lovable sandbox
- Production: Lovable published app
- Database: Supabase managed PostgreSQL

### 11.2 CI/CD Pipeline
- GitHub integration with Lovable
- Automatic deployments on main branch
- Environment variable management via Supabase

## 12. Testing Strategy

### 12.1 Unit Testing
- Component testing with React Testing Library
- Utility function testing
- API endpoint testing

### 12.2 Integration Testing
- End-to-end user flows
- Authentication flow testing
- File upload/download testing

### 12.3 Mobile Testing
- Cross-device testing
- Touch interaction testing
- Performance testing on mobile networks

## 13. Performance Metrics

### 13.1 Key Metrics
- Page load time: < 3 seconds
- Time to interactive: < 5 seconds
- File upload time: < 10 seconds for 5MB
- Response time for questions: < 2 seconds

### 13.2 Monitoring
- Supabase analytics
- User interaction tracking
- Error logging and monitoring

## 14. Future Enhancements

### 14.1 Phase 2 Features
- Push notifications for order updates
- Live chat with human agents
- AI-powered question answering
- Multi-language support

### 14.2 Scalability Considerations
- Caching layer for frequently asked questions
- CDN for file delivery
- Database read replicas for better performance

## 15. Development Timeline

### Week 1-2: Setup & Authentication
- Project setup and Supabase integration
- Authentication system implementation
- Basic UI components

### Week 3-4: Core Features
- Chat interface development
- Question matching system
- File upload functionality

### Week 5-6: Order Management
- Order tracking implementation
- Admin panel development
- Testing and bug fixes

### Week 7-8: Polish & Deploy
- Mobile optimization
- Performance improvements
- Final testing and deployment