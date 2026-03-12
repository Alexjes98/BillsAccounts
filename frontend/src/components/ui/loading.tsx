import React from "react";

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  isPage?: boolean;
}

export function Loading({ className, isPage, ...props }: LoadingProps) {
  // Center in parent, if isPage add a minimum height so it centers in the page view
  const defaultClasses = `flex items-center justify-center w-full h-full flex-1 ${isPage ? "min-h-screen" : "min-h-[100px]"}`;

  return (
    <div className={`${defaultClasses} p-4 ${className || ""}`} {...props}>
      <div className="orbital-loader">
        <div className="orbital-ring"></div>
        <div className="orbital-ring"></div>
        <div className="orbital-ring"></div>
        <div className="orbital-center"></div>
      </div>
    </div>
  );
}

export default Loading;
