import { useEffect, useState } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface NavItem {
    name: string;
    icon: LucideIcon;
    onClick?: () => void;
}

interface NavBarProps {
    items: NavItem[];
    activeTab: string;
    onTabChange: (name: string) => void;
    className?: string;
}

export function NavBar({ items, activeTab, onTabChange, className }: NavBarProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Reserved for future mobile-specific rendering
    void isMobile;

    return (
        <div
            className={cn(
                "relative flex justify-center z-50",
                className,
            )}
        >
            <div className="group relative flex items-center justify-center transition-all duration-300 ease-out">
                <div className={cn(
                    "flex items-center gap-2 bg-slate-950/60 border border-white/10 backdrop-blur-lg py-1 px-1 rounded-full shadow-xl transition-all duration-300",
                    "opacity-100 scale-100"
                )}>
                    {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.name;

                        return (
                            <button
                                key={item.name}
                                onClick={() => onTabChange(item.name)}
                                className={cn(
                                    "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-all duration-200",
                                    "text-slate-400 hover:text-white",
                                    isActive ? "bg-slate-800/90 text-white shadow-lg ring-1 ring-white/10" : "bg-transparent",
                                )}
                            >
                                {isActive && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute inset-0 rounded-full bg-primary/10"
                                    />
                                )}
                                <span className="relative z-10 hidden md:inline">{item.name}</span>
                                <span className="relative z-10 md:hidden">
                                    <Icon size={18} strokeWidth={2.5} />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
