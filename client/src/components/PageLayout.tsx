import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { useMobile } from "@/hooks/use-mobile";

interface PageLayoutProps {
  children: React.ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function PageLayout({ children, sidebarOpen, setSidebarOpen }: PageLayoutProps) {
  const isMobile = useMobile();
  const mainRef = useRef<HTMLDivElement>(null);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handle click outside to close sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen && mainRef.current && 
          event.target instanceof Node && 
          mainRef.current.contains(event.target)) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6 colorful-bg-pattern">
          {children}
        </main>
      </div>
    </div>
  );
}
