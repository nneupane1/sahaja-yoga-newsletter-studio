import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileBarChart,
  HeartHandshake,
  LayoutDashboard,
  Mail,
  Settings,
  UserCheck,
  Users,
  Workflow,
} from "lucide-react";

export type ViewId =
  | "dashboard"
  | "editor"
  | "newsletters"
  | "events"
  | "meditation"
  | "content"
  | "subscribers"
  | "rsvps"
  | "automations"
  | "analytics"
  | "reports"
  | "settings";

export type Newsletter = {
  id: string;
  title: string;
  subject: string;
  status: "Sent" | "Scheduled" | "Draft";
  date: string;
  sent: number;
  openRate: number;
  clickRate: number;
  rsvps: number;
};

export type EventItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  format: "In person" | "Online" | "Hybrid";
  rsvps: number;
  capacity: number;
  image: string;
};

export type Subscriber = {
  id: string;
  name: string;
  email: string;
  city: string;
  status: "Subscribed" | "Unsubscribed";
  engagement: "High" | "Interested" | "Reader" | "Low";
  lastSeen: string;
};

export type AutomationKey = "welcome" | "eventReminder" | "weekly" | "followup";

export const navItems: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "editor", label: "Newsletter editor", icon: Mail },
  { id: "newsletters", label: "Newsletters", icon: Mail },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "meditation", label: "Weekly meditation", icon: HeartHandshake },
  { id: "content", label: "Content library", icon: BookOpen },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "rsvps", label: "RSVPs", icon: UserCheck },
  { id: "automations", label: "Automations", icon: Workflow },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "settings", label: "Settings", icon: Settings },
];

export const initialNewsletters: Newsletter[] = [
  { id: "n1", title: "Autumn of Inner Stillness", subject: "A quieter September, together", status: "Sent", date: "8 Sep 2026", sent: 1200, openRate: 55.6, clickRate: 32.1, rsvps: 281 },
  { id: "n2", title: "Weekly Meditation · Week 37", subject: "Monday meditation and a ten-minute pause", status: "Scheduled", date: "13 Sep 2026", sent: 0, openRate: 0, clickRate: 0, rsvps: 0 },
  { id: "n3", title: "Music & Meditation Evening", subject: "An evening of living music and inner silence", status: "Draft", date: "17 Sep 2026", sent: 0, openRate: 0, clickRate: 0, rsvps: 0 },
  { id: "n4", title: "Meditation in the Park", subject: "Bring a mat—leave with a lighter mind", status: "Sent", date: "22 Aug 2026", sent: 1168, openRate: 49.3, clickRate: 26.4, rsvps: 221 },
  { id: "n5", title: "Self-Realization Evening", subject: "Discover what is already within you", status: "Sent", date: "3 Aug 2026", sent: 1132, openRate: 46.7, clickRate: 25.2, rsvps: 213 },
];

export const initialEvents: EventItem[] = [
  { id: "e1", title: "Weekly meditation · Ulm", date: "14 Sep", time: "18:00–20:00", location: "Ulm", format: "In person", rsvps: 18, capacity: 28, image: "/images/collective-meditation.jpg" },
  { id: "e2", title: "Meditate together online", date: "18 Sep", time: "20:30–21:00", location: "Online", format: "Online", rsvps: 74, capacity: 120, image: "/images/sahaja-meditation.jpg" },
  { id: "e3", title: "Music & meditation evening", date: "26 Sep", time: "18:30–20:30", location: "Stuttgart", format: "Hybrid", rsvps: 42, capacity: 80, image: "/images/lotus-water.png" },
];

export const initialSubscribers: Subscriber[] = [
  { id: "s1", name: "Anna Keller", email: "anna.keller@example.org", city: "Ulm", status: "Subscribed", engagement: "High", lastSeen: "Today" },
  { id: "s2", name: "Rahul Mehta", email: "rahul.m@example.org", city: "Stuttgart", status: "Subscribed", engagement: "Interested", lastSeen: "Yesterday" },
  { id: "s3", name: "Maria Rossi", email: "maria.rossi@example.org", city: "Munich", status: "Subscribed", engagement: "Reader", lastSeen: "3 days ago" },
  { id: "s4", name: "Jonas Weber", email: "jonas.weber@example.org", city: "Ulm", status: "Subscribed", engagement: "High", lastSeen: "Today" },
  { id: "s5", name: "Sofia Marin", email: "sofia.marin@example.org", city: "Augsburg", status: "Subscribed", engagement: "Low", lastSeen: "2 weeks ago" },
  { id: "s6", name: "David Novak", email: "david.n@example.org", city: "Neu-Ulm", status: "Unsubscribed", engagement: "Low", lastSeen: "1 month ago" },
];

export const trendData = [
  { day: "12 Aug", rsvps: 94, opens: 510 }, { day: "17 Aug", rsvps: 112, opens: 548 },
  { day: "22 Aug", rsvps: 138, opens: 575 }, { day: "27 Aug", rsvps: 176, opens: 604 },
  { day: "1 Sep", rsvps: 219, opens: 622 }, { day: "6 Sep", rsvps: 231, opens: 628 },
  { day: "10 Sep", rsvps: 243, opens: 640 },
];

export const growthData = [
  { month: "Apr", total: 812, active: 670 }, { month: "May", total: 875, active: 724 },
  { month: "Jun", total: 934, active: 781 }, { month: "Jul", total: 1018, active: 845 },
  { month: "Aug", total: 1116, active: 948 }, { month: "Sep", total: 1200, active: 1024 },
];

export const engagementData = [
  { name: "Highly engaged", value: 264, color: "#1caf70" },
  { name: "Interested", value: 420, color: "#175cdf" },
  { name: "Readers", value: 360, color: "#5aa8e8" },
  { name: "Low", value: 120, color: "#f1a54a" },
  { name: "Inactive", value: 36, color: "#dfe4ee" },
];

export const sources = [
  { title: "Self-Realization & Meditation", description: "An introduction to Self-Realization, Kundalini awakening, and effortless meditation.", source: "Shri Mataji — official archive", url: "https://shrimataji.org/self-realization/", kind: "Article", image: "/images/lotus-water.png" },
  { title: "Choose a guided meditation", description: "Free ten-minute guided practices for inner harmony, creativity, and confidence.", source: "We Meditate", url: "https://wemeditate.com/meditations", kind: "Meditation", image: "/images/sahaja-meditation.jpg" },
  { title: "Find meditation classes", description: "Join free online or in-person sessions led by volunteer practitioners.", source: "We Meditate", url: "https://wemeditate.com/classes", kind: "Classes", image: "/images/collective-meditation.jpg" },
  { title: "Collective meditation", description: "Official material about the importance and experience of meditating collectively.", source: "Shri Mataji — official archive", url: "https://shrimataji.org/collective-meditation/", kind: "Practice", image: "/images/lotus-water.png" },
];
