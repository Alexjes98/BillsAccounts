import { useEffect, useState } from "react";
import { useMascot } from "@/context/MascotContext";

import { EyeOff, MessageCircle } from "lucide-react";
import { ChatInterface } from "./ChatInterface";

export function Mascot() {
  const { isVisible, message, hideMascot, hideMessage } = useMascot(); // Added hideMessage
  const [isHovered, setIsHovered] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [imageSrc, setImageSrc] = useState("/mascot.png");
  const [isFading, setIsFading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const DEFAULT_MASCOT = "/mascot.png";

  useEffect(() => {
    if (isVisible) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 500); // Reset animation

      // Update image based on message, or reset to default
      if (message?.image) {
        setImageSrc(message.image);
      } else {
        setImageSrc(DEFAULT_MASCOT);
      }

      return () => clearTimeout(timer);
    }
  }, [isVisible, message]);

  useEffect(() => {
    if (message) {
      setIsFading(false);
      const timer = setTimeout(() => {
        setIsFading(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (isFading) {
      const timer = setTimeout(() => {
        hideMessage();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFading, hideMessage]);

  if (!isVisible) {
    // Changed condition
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none group"
      style={{ userSelect: "none" }} // Allow clicks on the mascot itself
    >
      {/* Embedded Chat Widget */}
      {showChat && (
        <div
          className="absolute bottom-32 right-0 w-80 md:w-96 drop-shadow-2xl z-50 origin-bottom-right transition-all duration-300 animate-in fade-in zoom-in-95"
          style={{ pointerEvents: "auto", userSelect: "auto" }}
        >
          <ChatInterface
            className="h-[450px] border border-border/50 rounded-2xl overflow-hidden bg-background"
            isWidget={true}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* Message Bubble - Only show if message exists */}
      {message && ( // Conditional rendering for message bubble
        <div
          className={`bg-white text-gray-800 p-4 rounded-2xl rounded-tr-none shadow-lg mb-2 max-w-xs transform transition-all duration-500 origin-bottom-right
          ${animate ? "scale-105" : "scale-100"}
          ${isFading ? "opacity-0 translate-y-2" : "opacity-100"}
          border border-gray-100 relative
          `}
          style={{ pointerEvents: "auto", userSelect: "auto" }}
        >
          <button
            onClick={hideMessage} // Changed to hideMessage
            className="absolute -top-2 -left-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm"
            aria-label="Close Message" // Updated aria-label
          >
            ✕
          </button>
          <p className="text-sm font-medium leading-relaxed">{message.text}</p>
        </div>
      )}

      {/* Mascot Image */}
      <div style={{ pointerEvents: "auto", userSelect: "auto" }}>
        <div
          className="relative cursor-pointer mb-1"
          style={{ pointerEvents: "auto", userSelect: "auto" }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            // Optional interaction
          }}
        >
          <img
            src={imageSrc}
            alt="Mascot"
            onError={() => {
              // Fallback to default if load fails
              if (imageSrc !== DEFAULT_MASCOT) {
                setImageSrc(DEFAULT_MASCOT);
              }
            }}
            className={`w-24 h-24 object-contain transform transition-transform duration-300
          ${isHovered ? "scale-110 -translate-y-1" : "scale-100"}
          `}
          />
          <div className="absolute inset-0 rounded-full ring-2 ring-black/5 pointer-events-none"></div>
        </div>

        {/* Control Buttons */}
        <div
          className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onMouseEnter={() => setIsHovered(true)} // Keep buttons visible when hovering them
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            onClick={hideMascot}
            className="bg-gray-800 text-white text-xs p-2 rounded-full shadow-md hover:bg-gray-700 transition-colors"
          >
            <EyeOff size={16} />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="bg-primary text-primary-foreground text-xs p-2 rounded-full shadow-md hover:bg-primary/90 transition-colors"
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
