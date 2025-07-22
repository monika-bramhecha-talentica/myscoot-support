# MyScoot Support - Design System

## 🎨 Color Palette

### Electric Blue & Green Theme
Our color scheme reflects the electric, eco-friendly nature of scooters with a modern, professional look.

**Primary Colors:**
- **Electric Blue**: `hsl(210, 100%, 50%)` - Main brand color for buttons, links, focus states
- **Electric Green**: `hsl(142, 76%, 36%)` - Secondary actions, success states, eco indicators
- **Bright Accent**: `hsl(120, 60%, 50%)` - Highlights, notifications, call-to-action elements

**Supporting Colors:**
- **Background**: `hsl(0, 0%, 98%)` light / `hsl(215, 30%, 8%)` dark
- **Foreground**: `hsl(215, 25%, 15%)` light / `hsl(210, 20%, 95%)` dark
- **Muted**: Soft gray-blue tones for subtle elements
- **Destructive**: Red for errors and warnings

## 📱 Mobile-First Responsive Layout

### Breakpoints
- **Mobile**: 320px - 768px (Primary focus)
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Container Classes
- `.container-mobile`: Max-width 384px with 16px padding
- `.container-tablet`: Max-width 768px with 24px padding  
- `.container-desktop`: Max-width 1152px with 32px padding

## 🧩 Component Structure

### Authentication Components
- `AuthPage` - Combined login/signup with OTP support
- `AuthForm` - Reusable form with phone/email input
- `OTPInput` - Custom OTP verification component
- `AuthProvider` - Context for auth state management

### Chat Interface Components
- `ChatContainer` - Main chat layout wrapper
- `MessageList` - Scrollable message history
- `MessageBubble` - Individual message component
- `ChatInput` - Message input with send button
- `QuickReplies` - Predefined question buttons
- `TypingIndicator` - Bot typing animation

### Navigation Components
- `AppSidebar` - Collapsible navigation menu
- `MobileHeader` - Top navigation for mobile
- `UserMenu` - Profile dropdown menu
- `BreadcrumbNav` - Page navigation breadcrumbs

### Layout Components
- `DashboardLayout` - Main app wrapper with sidebar
- `AuthLayout` - Clean layout for auth pages
- `MobileLayout` - Mobile-optimized wrapper
- `ErrorBoundary` - Error handling wrapper

### Support Components
- `OrderTracker` - Real-time order status
- `SupportTicket` - Escalation form component
- `FAQSection` - Expandable question list
- `NotificationCenter` - Alert management

### Admin Components (Future Phase)
- `AdminDashboard` - Admin overview page
- `TicketManager` - Support ticket interface
- `UserManager` - Customer management
- `AnalyticsDashboard` - Usage statistics

## 🎭 Design Patterns

### Electric Effects
- **Gradient Backgrounds**: `.electric-gradient` for hero sections
- **Glow Effects**: `.electric-glow` for interactive elements
- **Glass Morphism**: `.glass-effect` for modern overlays
- **Pulse Animation**: `.animate-electric-pulse` for notifications

### Interactive States
- **Hover**: Scale and glow effects
- **Focus**: Electric blue ring with glow
- **Active**: Pressed state with reduced opacity
- **Loading**: Pulse animations with electric colors

### Typography
- **Font**: System font stack for optimal performance
- **Headings**: Bold weights with electric blue accents
- **Body**: Regular weight with high contrast
- **Code**: Monospace for technical content

## 🚀 Implementation Status

### ✅ Completed
- Color system with HSL variables
- Responsive utilities and containers
- Animation keyframes and utilities
- Base styling and typography

### 🔄 Next Steps
1. Create authentication components
2. Build chat interface components  
3. Implement navigation structure
4. Add mobile-optimized layouts
5. Create component library documentation

## 📐 Spacing & Layout

### Spacing Scale
- `xs`: 4px (0.25rem)
- `sm`: 8px (0.5rem) 
- `md`: 16px (1rem)
- `lg`: 24px (1.5rem)
- `xl`: 32px (2rem)
- `2xl`: 48px (3rem)

### Border Radius
- Default: 12px for modern, friendly appearance
- Buttons: 12px
- Cards: 12px
- Inputs: 12px
- Modals: 16px

This design system provides a solid foundation for building a modern, accessible, and visually appealing electric scooter support portal.