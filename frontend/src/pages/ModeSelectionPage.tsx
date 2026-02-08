import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Cloud, CloudOff, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModeSelectionPage() {
  const navigate = useNavigate();
  const [rememberDecision, setRememberDecision] = useState(false);
  const [hoveredSide, setHoveredSide] = useState<"online" | "offline" | null>(
    null,
  );

  const handleSelectMode = (mode: "online" | "offline") => {
    if (rememberDecision) {
      localStorage.setItem("mode-preference", mode);
    }

    if (mode === "online") {
      navigate("/dashboard");
    } else {
      navigate("/free/dashboard");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Offline Side */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center p-8 transition-all duration-500 ease-in-out cursor-pointer",
          hoveredSide === "offline"
            ? "w-[60%] bg-slate-100 dark:bg-slate-900"
            : "w-[50%] bg-background",
          hoveredSide === "online" && "w-[40%] opacity-50",
        )}
        onMouseEnter={() => setHoveredSide("offline")}
        onMouseLeave={() => setHoveredSide(null)}
        onClick={() => handleSelectMode("offline")}
      >
        <div className="flex flex-col items-center max-w-md text-center space-y-6 z-10 transition-transform duration-300">
          <div
            className={cn(
              "p-6 rounded-full bg-slate-200 dark:bg-slate-800 transition-all duration-300",
              hoveredSide === "offline" && "scale-110 shadow-lg",
            )}
          >
            <CloudOff className="w-16 h-16 text-slate-600 dark:text-slate-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Offline Mode</h2>
            <p className="text-muted-foreground">
              Your data stays on your device. No internet required. Perfect for
              privacy and speed.
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 text-primary font-medium opacity-0 transition-all duration-300 translate-y-4",
              hoveredSide === "offline" && "opacity-100 translate-y-0",
            )}
          >
            <span>Select Offline</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-[1px] bg-border relative z-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-background border rounded-full flex items-center justify-center text-muted-foreground font-medium text-xs">
          OR
        </div>
      </div>

      {/* Online Side */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center p-8 transition-all duration-500 ease-in-out cursor-pointer",
          hoveredSide === "online"
            ? "w-[60%] bg-primary/5 dark:bg-primary/10"
            : "w-[50%] bg-background",
          hoveredSide === "offline" && "w-[40%] opacity-50",
        )}
        onMouseEnter={() => setHoveredSide("online")}
        onMouseLeave={() => setHoveredSide(null)}
        onClick={() => handleSelectMode("online")}
      >
        <div className="flex flex-col items-center max-w-md text-center space-y-6 z-10 transition-transform duration-300">
          <div
            className={cn(
              "p-6 rounded-full bg-primary/10 transition-all duration-300",
              hoveredSide === "online" && "scale-110 shadow-lg bg-primary/20",
            )}
          >
            <Cloud className="w-16 h-16 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-primary">
              Online Mode
            </h2>
            <p className="text-muted-foreground">
              Sync across devices. Back up your data to the cloud. Access your
              finance anywhere.
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 text-primary font-medium opacity-0 transition-all duration-300 translate-y-4",
              hoveredSide === "online" && "opacity-100 translate-y-0",
            )}
          >
            <span>Select Online</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-30 pointer-events-none">
        <div
          className="flex items-center space-x-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border shadow-sm pointer-events-auto cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setRememberDecision(!rememberDecision);
          }}
        >
          <div
            className={cn(
              "w-5 h-5 rounded border border-primary flex items-center justify-center transition-colors",
              rememberDecision
                ? "bg-primary text-primary-foreground"
                : "bg-transparent",
            )}
          >
            {rememberDecision && <Check className="w-3.5 h-3.5" />}
          </div>
          <span className="text-sm font-medium select-none">
            Remember my decision
          </span>
        </div>
      </div>
    </div>
  );
}
