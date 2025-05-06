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
  HelpCircle
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
        { name: "Invoices", icon: <FileText className="h-5 w-5 mr-3" />, href: "/invoices" },
        { name: "Transactions", icon: <DollarSign className="h-5 w-5 mr-3" />, href: "/transactions" },
      ],
    },
    {
      title: "Reports",
      items: [
        { name: "Outstanding Dues", icon: <BarChart2 className="h-5 w-5 mr-3" />, href: "/reports/outstanding" },
        { name: "Closed Bills", icon: <CheckSquare className="h-5 w-5 mr-3" />, href: "/reports/closed" },
        { name: "Sales Analysis", icon: <BarChart className="h-5 w-5 mr-3" />, href: "/reports/sales" },
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
      className={`w-64 bg-white border-r border-neutral-200 flex-shrink-0 flex flex-col h-full transition-all duration-300 ease-in-out ${
        isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
      } ${isMobile ? "fixed z-40 shadow-lg" : "relative"}`}
    >
      <div className="p-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 text-sm"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {sidebarItems.map((section, index) => (
          <div key={index}>
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                {section.title}
              </h3>
            </div>
            {section.items.map((item, itemIndex) => (
              <Link key={itemIndex} href={item.href}>
                <a
                  className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </a>
              </Link>
            ))}
            {index < sidebarItems.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800">Need help?</p>
            <p className="text-xs text-neutral-500">Contact support</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
