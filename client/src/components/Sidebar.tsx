import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign, 
  BarChart2, 
  CheckSquare, 
  BarChart, 
  UserCog, 
  Settings,
  Search,
  HelpCircle,
  MessageSquare
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useMobile();

  const sidebarItems = [
    {
      title: "Main",
      items: [
        { name: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 mr-3" />, href: "/" },
        { name: "Party Master", icon: <Users className="h-5 w-5 mr-3" />, href: "/parties" },
        { name: "Add Note", icon: <MessageSquare className="h-5 w-5 mr-3" />, href: "/invoices" },
      ],
    },
    {
      title: "Reports",
      items: [
        { name: "All Reports", icon: <BarChart2 className="h-5 w-5 mr-3" />, href: "/reports" },
      ],
    },
    {
      title: "Settings",
      items: [
        { name: "User Management", icon: <UserCog className="h-5 w-5 mr-3" />, href: "/settings/users" },
        { name: "System Settings", icon: <Settings className="h-5 w-5 mr-3" />, href: "/settings/system" },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <aside
      className={`w-64 bg-white border-r border-neutral-200 flex-shrink-0 flex flex-col h-full transition-all duration-500 ease-in-out ${
        isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
      } ${isMobile ? "fixed z-40 shadow-lg" : "relative"} animated-gradient bg-gradient-to-b from-white to-primary-50`}
    >
      <div className="p-4 flex-shrink-0 animate-fade-in">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-primary-500 animate-pulse-subtle" />
          <Input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 text-sm border-primary-100 focus:border-primary-300 focus:ring-primary-200 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {sidebarItems.map((section, index) => (
          <div key={index} className={`animate-slide-in-left`} style={{ animationDelay: `${index * 100}ms` }}>
            <div className="px-4 py-2">
              <h3 className="text-xs font-normal uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 transition-all duration-300">
                {section.title}
              </h3>
            </div>
            {section.items.map((item, itemIndex) => (
              <Link key={itemIndex} href={item.href}>
                <div
                  className={`sidebar-link dark:text-neutral-300 dark:hover:bg-neutral-800 relative overflow-hidden group transition-all duration-300 ${
                    isActive(item.href) 
                      ? "active dark:bg-sidebar-accent dark:text-sidebar-accent-foreground before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-primary before:content-['']" 
                      : ""
                  }`}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  {/* Animated icon background on hover */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 dark:group-hover:bg-primary/10 transition-all duration-300 transform translate-x-full group-hover:translate-x-0"></div>
                  
                  {/* Icon with animation */}
                  <div className="transform transition-transform duration-300 group-hover:scale-110 group-hover:text-primary-600 dark:group-hover:text-primary-400 relative z-10">
                    {item.icon}
                  </div>
                  
                  <span className="relative z-10 transition-all duration-300 group-hover:text-primary-700 font-light">
                    {item.name}
                  </span>
                </div>
              </Link>
            ))}
            {index < sidebarItems.length - 1 && (
              <Separator className="my-2 bg-gradient-to-r from-transparent via-primary-200/30 dark:via-primary-800/30 to-transparent opacity-50" />
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-200 animate-slide-in-bottom" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-primary-100 to-primary-50 hover:from-primary-200 hover:to-primary-100 transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-1 glow-on-hover">
          <div className="w-10 h-10 bg-white text-primary-600 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/10 transform scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full"></div>
            <HelpCircle className="h-5 w-5 relative z-10 animate-pulse-subtle" />
          </div>
          <div className="transform transition-all duration-300 group-hover:translate-x-1">
            <p className="text-sm font-light text-primary-700">Need help?</p>
            <p className="text-xs font-light text-primary-500">Contact support</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
